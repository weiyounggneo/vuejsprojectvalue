require('dotenv').config();

const express = require('express');
const cors = require('cors');
const ldap = require('ldapjs');
const mysql = require('mysql2');
const path = require('path');
const jwt = require('jsonwebtoken');
const cron = require('node-cron'); // Required for automated tasks

const {
  getTraceId,
  traceStart,
  traceEnd,
  traceError
} = require('./trace');

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 5001;
const LDAP_URL = process.env.LDAP_URL;
const BASE_DN = process.env.LDAP_BASE_DN;

// =====================================
// DATABASE TABLES (bem_projs)
// =====================================
const MANAGER_PROJECTS_TABLE = 't_manager_project_master';
const MANAGER_YEARLY_TABLE = 't_manager_yearly_savings';
const MANAGER_METRICS_TABLE = 't_manager_metrics';
const MANAGER_COMMENTS_TABLE = 't_manager_comments';
const MANAGER_HISTORY_TABLE = 't_manager_history';
const MANAGER_SITE_TARGETS_TABLE = 't_manager_site_targets'; 
const MANAGER_PHASES_TABLE = 't_manager_project_phases'; 

// RBAC & Master Data Tables
const ACCESS_TABLE = 't_bem_access'; 
const CONFIG_TABLE = 't_app_config'; 

const app = express();

app.use(cors({
  origin: ['http://localhost:8080','http://muasxv4005.mua.st.com:9090', 'http://172.18.153.227:8080','http://172.18.165.43:8080' ],
  credentials: true
}));

app.use(express.json());

// =====================================
// TRACE MIDDLEWARE
// =====================================
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    return next();
  }

  getTraceId(req);

  const trace = traceStart('HTTP_REQUEST', req, {
    params: req.params,
    query: req.query
  });

  res.setHeader('X-Trace-Id', req._traceId);

  res.on('finish', () => {
    traceEnd(trace, {
      statusCode: res.statusCode
    });
  });

  next();
});

// Serve frontend build
app.use(express.static(path.join(__dirname, 'dist')));

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// =====================================
// DB CONNECTION (Pure MariaDB)
// =====================================
const db = mysql.createPool({
  host: process.env.DB_HOST, 
  user: process.env.BEM_DB_USER,
  password: process.env.BEM_DB_PASSWORD,
  database: process.env.BEM_DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// =====================================
// UTILITIES
// =====================================
function queryPromise(sql, params = [], req = null) {
  const trace = traceStart('queryPromise', req, {
    sqlPreview: typeof sql === 'string'
      ? sql.replace(/\s+/g, ' ').trim().slice(0, 200)
      : null,
    paramCount: Array.isArray(params) ? params.length : 0
  });

  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        traceError(trace, err, {
          sqlPreview: typeof sql === 'string'
            ? sql.replace(/\s+/g, ' ').trim().slice(0, 200)
            : null
        });
        return reject(err);
      }

      traceEnd(trace, {
        rowCount: Array.isArray(results) ? results.length : undefined,
        affectedRows: results?.affectedRows
      });

      resolve(results);
    });
  });
}

function normalizeText(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseStandardDate(value) {
  if (!value) return null;
  let str = String(value).trim();
  str = str.substring(0, 10); 

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  
  const fallbackDate = new Date(str);
  if (!isNaN(fallbackDate.getTime())) {
    const year = fallbackDate.getFullYear();
    const month = String(fallbackDate.getMonth() + 1).padStart(2, '0');
    const day = String(fallbackDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return str; 
}

function getCurrentUser(req) {
  return req?.user?.username || 'system';
}

// =====================================
// AUTH & SECURITY MIDDLEWARE
// =====================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Session expired. Please log in again.' });
    req.user = user;
    next();
  });
}

function requireAccess(req, res, next) {
  const role = req.user?.access_right;
  if (!['viewer', 'user', 'admin'].includes(role)) {
    return res.status(403).json({ message: 'Forbidden: Your account is pending approval.' });
  }
  next();
}

function requireEditAccess(req, res, next) {
  const role = req.user?.access_right;
  if (!['user', 'admin'].includes(role)) {
    return res.status(403).json({ message: 'Forbidden: You do not have edit privileges.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.access_right !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only.' });
  }
  next();
}

// =====================================
// LOGIN ROUTE
// =====================================
app.post('/api/login', (req, res) => {
  const trace = traceStart('POST /api/login', req, { username: req.body?.username || null });
  const { username, password } = req.body;

  if (!username || !password) {
    traceEnd(trace, { outcome: 'missing_credentials' });
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const client = ldap.createClient({ url: LDAP_URL });
  const opts = { filter: `(uid=${username})`, scope: 'one', attributes: ['dn'] };

  client.search(BASE_DN, opts, (err, search) => {
    if (err) {
      traceError(trace, err, { step: 'ldap_search' });
      client.unbind();
      return res.status(500).json({ success: false, message: 'LDAP search failed.' });
    }

    let userDN = null;
    let responded = false;

    search.on('searchEntry', entry => { userDN = entry.dn.toString(); });
    
    search.on('error', streamErr => {
      if (!responded) {
        responded = true;
        traceError(trace, streamErr, { step: 'ldap_search_stream' });
        client.unbind();
        return res.status(500).json({ success: false, message: 'LDAP search error.' });
      }
    });

    search.on('end', () => {
      client.unbind();
      if (responded) return;

      if (!userDN) {
        responded = true;
        traceEnd(trace, { outcome: 'user_not_found', username });
        return res.status(401).json({ success: false, message: 'User not found.' });
      }

      const userClient = ldap.createClient({ url: LDAP_URL });
      userClient.bind(userDN, password, async bindErr => {
        userClient.unbind();
        if (responded) return;

        if (bindErr) {
          responded = true;
          traceEnd(trace, { outcome: 'invalid_credentials', username });
          return res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }

        let access_right = 'pending';
        try {
          const results = await queryPromise(`SELECT access_right FROM ${ACCESS_TABLE} WHERE username = ?`, [username], req);
          
          if (results.length > 0) {
            access_right = results[0].access_right || 'pending';
          } else {
            await queryPromise(`INSERT INTO ${ACCESS_TABLE} (username, access_right, granted_by) VALUES (?, 'pending', 'system')`, [username], req);
          }
        } catch (dbErr) {
          traceError(trace, dbErr, { step: 'load_access_right', username });
        }

        const token = jwt.sign({ username, access_right }, JWT_SECRET, { expiresIn: '4h' });
        responded = true;
        traceEnd(trace, { outcome: 'login_success', username, access_right });

        return res.json({ success: true, message: 'LDAP authentication successful.', token, access_right });
      });
    });
  });
});

app.get('/api/check-auth', authenticateToken, (req, res) => {
  res.json({ loggedIn: true, user: req.user });
});

// =====================================
// USER ACCESS MANAGEMENT (Admin Only)
// =====================================
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await queryPromise(`
      SELECT username, access_right, updated_at, granted_by 
      FROM ${ACCESS_TABLE} 
      ORDER BY FIELD(access_right, 'pending', 'admin', 'user', 'viewer'), username ASC
    `, [], req);
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.put('/api/admin/users/:username', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const targetUser = req.params.username;
    const newRole = req.body.access_right;
    const adminUser = getCurrentUser(req);

    if (!['pending', 'viewer', 'user', 'admin'].includes(newRole)) return res.status(400).json({ message: 'Invalid role.' });

    const result = await queryPromise(`UPDATE ${ACCESS_TABLE} SET access_right = ?, granted_by = ? WHERE username = ?`, [newRole, adminUser, targetUser], req);
    if (result.affectedRows === 0) {
      await queryPromise(`INSERT INTO ${ACCESS_TABLE} (username, access_right, granted_by) VALUES (?, ?, ?)`, [targetUser, newRole, adminUser], req);
    }
    return res.json({ message: `Successfully updated ${targetUser} to ${newRole}.` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// =====================================
// MASTER DATA (Config/Dropdowns)
// =====================================
app.get('/api/config/options', authenticateToken, requireAccess, async (req, res) => {
  try {
    const rows = await queryPromise(`SELECT category, value FROM ${CONFIG_TABLE} WHERE is_active = 1 ORDER BY category, value ASC`, [], req);
    const options = rows.reduce((acc, row) => {
      if (!acc[row.category]) acc[row.category] = [];
      acc[row.category].push(row.value);
      return acc;
    }, {});
    return res.json(options);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.post('/api/config/options', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, value } = req.body;
    await queryPromise(`INSERT INTO ${CONFIG_TABLE} (category, value, is_active) VALUES (?, ?, 1)`, [category, value], req);
    return res.status(201).json({ message: `${value} added to ${category} successfully.` });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to add option. It may already exist.' });
  }
});

// =====================================
// BEM PROJECT DATA (Manager Yearly)
// =====================================
app.get('/api/manager-yearly', authenticateToken, requireAccess, async (req, res) => {
  const trace = traceStart('GET /api/manager-yearly', req);
  try {
    const projects = await queryPromise(`SELECT * FROM ${MANAGER_PROJECTS_TABLE} ORDER BY project_name ASC`, [], req);
    const yearlyValues = await queryPromise(`SELECT * FROM ${MANAGER_YEARLY_TABLE}`, [], req);
    
    const metrics = await queryPromise(`
      SELECT m.* FROM ${MANAGER_METRICS_TABLE} m
      INNER JOIN (SELECT project_id, MAX(reporting_year) as max_year FROM ${MANAGER_METRICS_TABLE} GROUP BY project_id) latest 
      ON m.project_id = latest.project_id AND m.reporting_year = latest.max_year
    `, [], req);

    const comments = await queryPromise(`
      SELECT c.* FROM ${MANAGER_COMMENTS_TABLE} c
      INNER JOIN (SELECT project_id, MAX(created_at) as max_date FROM ${MANAGER_COMMENTS_TABLE} GROUP BY project_id) latest 
      ON c.project_id = latest.project_id AND c.created_at = latest.max_date
    `, [], req);

    const phases = await queryPromise(`
      SELECT project_id, phase_name, DATE_FORMAT(MIN(start_date), '%Y-%m-%d') as actual_start 
      FROM ${MANAGER_PHASES_TABLE} 
      WHERE phase_name IN ('G1', 'G2', 'G2.5', 'G3', 'Closure') 
      GROUP BY project_id, phase_name
    `, [], req);

    const result = projects.map(proj => {
      const projMetrics = metrics.find(m => m.project_id === proj.project_id) || {};
      const projComment = comments.find(c => c.project_id === proj.project_id) || {};
      
      const g1 = phases.find(p => p.project_id === proj.project_id && p.phase_name === 'G1');
      const g2 = phases.find(p => p.project_id === proj.project_id && (p.phase_name === 'G2' || p.phase_name === 'G2.5'));
      const g3 = phases.find(p => p.project_id === proj.project_id && p.phase_name === 'G3');
      const closure = phases.find(p => p.project_id === proj.project_id && p.phase_name === 'Closure');

      const payload = {
        projectId: proj.project_id,
        projectName: proj.project_name,
        projectStatus: proj.project_status || null,
        pillars: proj.pillar,
        sites: proj.site,
        currentPmoGate: proj.current_pmo_gate,
        dtitInvolved: proj.dtit_involved,
        aiAaAType: proj.ai_type,
        foakNoak: proj.foak_noak,
        targetG1Date: proj.target_g1_date || null,
        targetG2Date: proj.target_g2_date || null,
        targetG3Date: proj.target_g3_date || null,
        targetClosedDate: proj.target_closed_date || null,
        actualG1Date: g1 ? g1.actual_start : null,
        actualG2Date: g2 ? g2.actual_start : null,
        actualG3Date: g3 ? g3.actual_start : null,
        actualClosedDate: closure ? closure.actual_start : null,
        comment: projComment.comment_text || null,
        capacityGainValue: projMetrics.capacity_gain_value || null,
        capacityGainPercent: projMetrics.capacity_gain_pct || null,
        dlValue: projMetrics.dl_value || null,
        dlEquivalent: projMetrics.dl_equivalent || null,
        idlValue: projMetrics.idl_value || null,
        idlFte: projMetrics.idl_fte || null,
        yieldValue: projMetrics.yield_value || null,
        yieldPercentGain: projMetrics.yield_gain_pct || null,
        qualityValue: projMetrics.quality_value || null,
        qualityCases: projMetrics.quality_cases || null
      };

      const projYears = yearlyValues.filter(y => y.project_id === proj.project_id);
      projYears.forEach(y => { payload[`year${y.savings_year}`] = y.savings_value; });

      return payload;
    });

    traceEnd(trace, { outcome: 'success', rowCount: result.length });
    return res.json(result);
  } catch (err) {
    traceError(trace, err);
    return res.status(500).json({ message: err.message });
  }
});

app.get('/api/manager-yearly/pipeline-velocity', authenticateToken, requireAccess, async (req, res) => {
  try {
    const rows = await queryPromise(`
      SELECT 
        DATE_FORMAT(start_date, '%Y-%m') AS month_key, DATE_FORMAT(start_date, '%b %Y') AS month_label,
        SUM(CASE WHEN phase_name = 'G1' THEN 1 ELSE 0 END) AS g1_count,
        SUM(CASE WHEN phase_name IN ('G2', 'G2.5') THEN 1 ELSE 0 END) AS g2_count,
        SUM(CASE WHEN phase_name = 'G3' THEN 1 ELSE 0 END) AS g3_count,
        COUNT(*) AS total_transitions
      FROM ${MANAGER_PHASES_TABLE}
      WHERE phase_name IN ('G1', 'G2', 'G2.5', 'G3') 
      GROUP BY month_key, month_label 
      ORDER BY month_key DESC LIMIT 12
    `, [], req);

    const formattedData = rows.map(r => ({
      month: r.month_label,
      g1: Number(r.g1_count),
      g2: Number(r.g2_count),
      g3: Number(r.g3_count),
      total: Number(r.total_transitions)
    }));
    return res.json(formattedData);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// =====================================
// SITE TARGETS ROUTES
// =====================================
app.get('/api/manager-site-targets', authenticateToken, requireAccess, async (req, res) => {
  try {
    const rows = await queryPromise(`SELECT * FROM ${MANAGER_SITE_TARGETS_TABLE}`, [], req);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.post('/api/manager-site-targets', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { site, target_year, expected_value } = req.body;
    if (!site || !target_year || expected_value === undefined) {
      return res.status(400).json({ message: 'Site, Target Year, and Expected Value are required.' });
    }

    const existing = await queryPromise(`SELECT * FROM ${MANAGER_SITE_TARGETS_TABLE} WHERE site = ? AND target_year = ?`, [site, target_year], req);
    if (existing.length > 0) {
      return res.status(409).json({ message: `A target already exists for ${site} in ${target_year}. Please update it instead.` });
    }

    await queryPromise(`INSERT INTO ${MANAGER_SITE_TARGETS_TABLE} (site, target_year, expected_value) VALUES (?, ?, ?)`, [site, target_year, expected_value], req);
    return res.status(201).json({ message: 'Site target added successfully.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.put('/api/manager-site-targets', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { site, target_year, expected_value } = req.body;
    if (!site || !target_year || expected_value === undefined) {
      return res.status(400).json({ message: 'Site, Target Year, and Expected Value are required.' });
    }

    await queryPromise(`UPDATE ${MANAGER_SITE_TARGETS_TABLE} SET expected_value = ? WHERE site = ? AND target_year = ?`, [expected_value, site, target_year], req);
    return res.json({ message: 'Site target updated successfully.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.get('/api/manager-yearly/history/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rows = await queryPromise(`
      SELECT history_id, project_id, project_name, project_status,current_pmo_gate, capacity_gain_value, capacity_gain_pct, dl_value, dl_equivalent,
             idl_value, idl_fte, yield_value, yield_gain_pct, quality_value, quality_cases, comment_text, changed_by, DATE_FORMAT(changed_at, '%Y-%m-%d %H:%i:%s') AS changed_at, action_type
      FROM ${MANAGER_HISTORY_TABLE} ORDER BY changed_at DESC
    `, [], req);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.get('/api/manager-yearly/:projectId/history', authenticateToken, requireAccess, async (req, res) => {
  try {
    const rows = await queryPromise(`
      SELECT history_id, project_id, project_name, project_status, current_pmo_gate, capacity_gain_value, capacity_gain_pct, dl_value, dl_equivalent,
             idl_value, idl_fte, yield_value, yield_gain_pct, quality_value, quality_cases, comment_text, changed_by, DATE_FORMAT(changed_at, '%Y-%m-%d %H:%i:%s') AS changed_at, action_type
      FROM ${MANAGER_HISTORY_TABLE} WHERE project_id = ? ORDER BY changed_at DESC
    `, [req.params.projectId], req);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// =====================================
// DATA MODIFICATION (Users & Admins Only)
// =====================================
app.post('/api/manager-yearly', authenticateToken, requireEditAccess, async (req, res) => {
  const trace = traceStart('POST /api/manager-yearly', req);
  try {
    const payload = {
      project_id: normalizeText(req.body.projectId),
      project_name: normalizeText(req.body.projectName),
      project_status: normalizeText(req.body.projectStatus),
      pillars: normalizeText(req.body.pillars),
      sites: normalizeText(req.body.sites),
      current_pmo_gate: normalizeText(req.body.currentPmoGate),
      dtit_involved: normalizeText(req.body.dtitInvolved),
      ai_aa_a_type: normalizeText(req.body.aiAaAType),
      foak_noak: normalizeText(req.body.foakNoak),
      target_g1_date: parseStandardDate(req.body.targetG1Date),
      target_g2_date: parseStandardDate(req.body.targetG2Date),
      target_g3_date: parseStandardDate(req.body.targetG3Date),
      target_closed_date: parseStandardDate(req.body.targetClosedDate)
    };

    if (!payload.project_id || !payload.project_name) return res.status(400).json({ message: 'Project ID and Project Name are required.' });

    await queryPromise(`
      INSERT INTO ${MANAGER_PROJECTS_TABLE} (project_id, project_name, project_status, pillar, site, current_pmo_gate, dtit_involved, ai_type, foak_noak, target_g1_date, target_g2_date, target_g3_date, target_closed_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [payload.project_id, payload.project_name, payload.project_status, payload.pillars, payload.sites, payload.current_pmo_gate, payload.dtit_involved, payload.ai_aa_a_type, payload.foak_noak, payload.target_g1_date, payload.target_g2_date, payload.target_g3_date, payload.target_closed_date], req);

    if (payload.current_pmo_gate) {
      await queryPromise(`INSERT INTO ${MANAGER_PHASES_TABLE} (project_id, phase_name, start_date) VALUES (?, ?, CURDATE())`, [payload.project_id, payload.current_pmo_gate], req);
    }

    traceEnd(trace, { outcome: 'success', project_id: payload.project_id });
    return res.status(201).json({ message: 'Project created successfully.', project_id: payload.project_id });
  } catch (err) {
    traceError(trace, err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Project ID already exists.' });
    return res.status(500).json({ message: err.message });
  }
});

app.put('/api/manager-yearly/:projectId', authenticateToken, requireEditAccess, async (req, res) => {
  const trace = traceStart('PUT /api/manager-yearly/:projectId', req, { projectId: req.params.projectId });

  try {
    let projectId = req.params.projectId;
    const currentUser = getCurrentUser(req);
    const currentYear = new Date().getFullYear();

    const newProjectId = normalizeText(req.body.newProjectId);
    if (newProjectId && newProjectId !== projectId) {
      if (req.user?.access_right !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Only Admins can modify the Project ID.' });
      }

      const existingProject = await queryPromise(`SELECT project_id FROM ${MANAGER_PROJECTS_TABLE} WHERE project_id = ?`, [newProjectId], req);
      if (existingProject.length > 0) {
        return res.status(409).json({ message: `The Project ID '${newProjectId}' is already in use by another project.` });
      }

      await queryPromise('SET FOREIGN_KEY_CHECKS=0;', [], req);
      await queryPromise(`UPDATE ${MANAGER_PROJECTS_TABLE} SET project_id = ? WHERE project_id = ?`, [newProjectId, projectId], req);
      await queryPromise(`UPDATE ${MANAGER_YEARLY_TABLE} SET project_id = ? WHERE project_id = ?`, [newProjectId, projectId], req);
      await queryPromise(`UPDATE ${MANAGER_METRICS_TABLE} SET project_id = ? WHERE project_id = ?`, [newProjectId, projectId], req);
      await queryPromise(`UPDATE ${MANAGER_COMMENTS_TABLE} SET project_id = ? WHERE project_id = ?`, [newProjectId, projectId], req);
      await queryPromise(`UPDATE ${MANAGER_HISTORY_TABLE} SET project_id = ? WHERE project_id = ?`, [newProjectId, projectId], req);
      await queryPromise(`UPDATE ${MANAGER_PHASES_TABLE} SET project_id = ? WHERE project_id = ?`, [newProjectId, projectId], req);
      await queryPromise('SET FOREIGN_KEY_CHECKS=1;', [], req);

      projectId = newProjectId;
    }

    const targetG1Date = parseStandardDate(req.body.targetG1Date);
    const targetG2Date = parseStandardDate(req.body.targetG2Date);
    const targetG3Date = parseStandardDate(req.body.targetG3Date);
    const targetClosedDate = parseStandardDate(req.body.targetClosedDate);

    const currentState = await queryPromise(`
      SELECT p.project_name, p.project_status,p.current_pmo_gate, m.capacity_gain_value, m.capacity_gain_pct, m.dl_value, m.dl_equivalent, 
             m.idl_value, m.idl_fte, m.yield_value, m.yield_gain_pct, m.quality_value, m.quality_cases, c.comment_text
      FROM ${MANAGER_PROJECTS_TABLE} p
      LEFT JOIN ${MANAGER_METRICS_TABLE} m ON p.project_id = m.project_id AND m.reporting_year = ?
      LEFT JOIN ${MANAGER_COMMENTS_TABLE} c ON p.project_id = c.project_id
      WHERE p.project_id = ? ORDER BY c.created_at DESC LIMIT 1
    `, [currentYear, projectId], req);

    if (currentState.length > 0) {
      const curr = currentState[0];
      await queryPromise(`
        INSERT INTO ${MANAGER_HISTORY_TABLE} (project_id, project_name, project_status, current_pmo_gate, capacity_gain_value, capacity_gain_pct, dl_value, dl_equivalent, idl_value, idl_fte, yield_value, yield_gain_pct, quality_value, quality_cases, comment_text, changed_by, action_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UPDATE')
      `, [projectId, curr.project_name, curr.project_status, curr.current_pmo_gate, curr.capacity_gain_value, curr.capacity_gain_pct, curr.dl_value, curr.dl_equivalent, curr.idl_value, curr.idl_fte, curr.yield_value, curr.yield_gain_pct, curr.quality_value, curr.quality_cases, curr.comment_text, currentUser], req);
    }

    if (req.body.projectName) {
      const newStatus = normalizeText(req.body.projectStatus);
      
      await queryPromise(`
        UPDATE ${MANAGER_PROJECTS_TABLE} SET project_name = ?, project_status = ?, pillar = ?, site = ?, current_pmo_gate = ?, dtit_involved = ?, ai_type = ?, foak_noak = ?, target_g1_date = ?, target_g2_date = ?, target_g3_date = ?, target_closed_date = ?
        WHERE project_id = ?
      `, [normalizeText(req.body.projectName), newStatus, normalizeText(req.body.pillars), normalizeText(req.body.sites), normalizeText(req.body.currentPmoGate), normalizeText(req.body.dtitInvolved), normalizeText(req.body.aiAaAType), normalizeText(req.body.foakNoak), targetG1Date, targetG2Date, targetG3Date, targetClosedDate, projectId], req);

      const newGate = normalizeText(req.body.currentPmoGate);
      const curr = currentState.length > 0 ? currentState[0] : null;
      const oldGate = curr ? curr.current_pmo_gate : null;

      if (oldGate !== newGate && newGate) {
        await queryPromise(`UPDATE ${MANAGER_PHASES_TABLE} SET end_date = CURDATE() WHERE project_id = ? AND end_date IS NULL`, [projectId], req);
        await queryPromise(`INSERT INTO ${MANAGER_PHASES_TABLE} (project_id, phase_name, start_date) VALUES (?, ?, CURDATE())`, [projectId, newGate], req);
      }
    }

    const yearKeys = Object.keys(req.body).filter(k => k.startsWith('year') && k.length === 8);
    for (const key of yearKeys) {
      const year = parseInt(key.replace('year', ''), 10);
      const val = normalizeNumber(req.body[key]);
      if (val !== null) {
        const existingYear = await queryPromise(`SELECT project_id FROM ${MANAGER_YEARLY_TABLE} WHERE project_id = ? AND savings_year = ? LIMIT 1`, [projectId, year], req);
        if (existingYear.length > 0) {
          await queryPromise(`UPDATE ${MANAGER_YEARLY_TABLE} SET savings_value = ? WHERE project_id = ? AND savings_year = ?`, [val, projectId, year], req);
        } else {
          await queryPromise(`INSERT INTO ${MANAGER_YEARLY_TABLE} (project_id, savings_year, savings_value) VALUES (?, ?, ?)`, [projectId, year, val], req);
        }
      }
    }

    const existingMetric = await queryPromise(`SELECT metrics_id FROM ${MANAGER_METRICS_TABLE} WHERE project_id = ? AND reporting_year = ? LIMIT 1`, [projectId, currentYear], req);
    if (existingMetric.length > 0) {
      await queryPromise(`UPDATE ${MANAGER_METRICS_TABLE} SET capacity_gain_value=?, capacity_gain_pct=?, dl_value=?, dl_equivalent=?, idl_value=?, idl_fte=?, yield_value=?, yield_gain_pct=?, quality_value=?, quality_cases=? WHERE metrics_id=?`, [normalizeNumber(req.body.capacityGainValue), normalizeNumber(req.body.capacityGainPercent), normalizeNumber(req.body.dlValue), normalizeNumber(req.body.dlEquivalent), normalizeNumber(req.body.idlValue), normalizeNumber(req.body.idlFte), normalizeNumber(req.body.yieldValue), normalizeNumber(req.body.yieldPercentGain), normalizeNumber(req.body.qualityValue), normalizeNumber(req.body.qualityCases), existingMetric[0].metrics_id], req);
    } else {
      await queryPromise(`INSERT INTO ${MANAGER_METRICS_TABLE} (project_id, reporting_year, capacity_gain_value, capacity_gain_pct, dl_value, dl_equivalent, idl_value, idl_fte, yield_value, yield_gain_pct, quality_value, quality_cases) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [projectId, currentYear, normalizeNumber(req.body.capacityGainValue), normalizeNumber(req.body.capacityGainPercent), normalizeNumber(req.body.dlValue), normalizeNumber(req.body.dlEquivalent), normalizeNumber(req.body.idlValue), normalizeNumber(req.body.idlFte), normalizeNumber(req.body.yieldValue), normalizeNumber(req.body.yieldPercentGain), normalizeNumber(req.body.qualityValue), normalizeNumber(req.body.qualityCases)], req);
    }

    const commentText = normalizeText(req.body.comment);
    if (commentText !== null) {
      const existingComment = await queryPromise(`SELECT comment_id FROM ${MANAGER_COMMENTS_TABLE} WHERE project_id = ? ORDER BY created_at DESC LIMIT 1`, [projectId], req);
      if (existingComment.length > 0) {
         await queryPromise(`UPDATE ${MANAGER_COMMENTS_TABLE} SET comment_text = ? WHERE comment_id = ?`, [commentText, existingComment[0].comment_id], req);
      } else {
         await queryPromise(`INSERT INTO ${MANAGER_COMMENTS_TABLE} (project_id, comment_text) VALUES (?, ?)`, [projectId, commentText], req);
      }
    }

    traceEnd(trace, { outcome: 'success', projectId });
    return res.json({ message: 'Project updated successfully.' });
  } catch (err) {
    traceError(trace, err);
    return res.status(500).json({ message: err.message });
  }
});

app.delete('/api/manager-yearly/:projectId', authenticateToken, requireAdmin, async (req, res) => {
  const trace = traceStart('DELETE /api/manager-yearly/:projectId', req, { projectId: req.params.projectId });
  
  try {
    const projectId = req.params.projectId;

    await queryPromise(`DELETE FROM ${MANAGER_YEARLY_TABLE} WHERE project_id = ?`, [projectId], req);
    await queryPromise(`DELETE FROM ${MANAGER_METRICS_TABLE} WHERE project_id = ?`, [projectId], req);
    await queryPromise(`DELETE FROM ${MANAGER_COMMENTS_TABLE} WHERE project_id = ?`, [projectId], req);
    await queryPromise(`DELETE FROM ${MANAGER_HISTORY_TABLE} WHERE project_id = ?`, [projectId], req);
    await queryPromise(`DELETE FROM ${MANAGER_PHASES_TABLE} WHERE project_id = ?`, [projectId], req);
    
    const result = await queryPromise(`DELETE FROM ${MANAGER_PROJECTS_TABLE} WHERE project_id = ?`, [projectId], req);

    if (result.affectedRows === 0) {
      traceEnd(trace, { outcome: 'not_found' });
      return res.status(404).json({ message: 'Project not found.' });
    }

    traceEnd(trace, { outcome: 'success', projectId });
    return res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    traceError(trace, err);
    return res.status(500).json({ message: err.message });
  }
});

// =====================================
// AUTOMATED MONTHLY SNAPSHOTS (UPSERT)
// =====================================
cron.schedule('55 23 * * *', async () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (today.getMonth() !== tomorrow.getMonth()) {
    console.log('Last day of the month detected. Running project-level snapshot...');
    
    try {
      const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      
      const snapshotSql = `
        INSERT INTO t_manager_monthly_snapshots 
          (snapshot_month, project_id, project_name, project_status, current_pmo_gate, 
           capacity_gain_value, capacity_gain_pct, dl_value, dl_equivalent, 
           idl_value, idl_fte, yield_value, yield_gain_pct, quality_value, quality_cases)
        SELECT 
          ?, 
          p.project_id, 
          p.project_name,
          p.project_status,
          p.current_pmo_gate,
          m.capacity_gain_value, m.capacity_gain_pct,
          m.dl_value, m.dl_equivalent,
          m.idl_value, m.idl_fte,
          m.yield_value, m.yield_gain_pct,
          m.quality_value, m.quality_cases
        FROM ${MANAGER_PROJECTS_TABLE} p
        LEFT JOIN (
          SELECT m1.* FROM ${MANAGER_METRICS_TABLE} m1
          INNER JOIN (
              SELECT project_id, MAX(reporting_year) as max_year 
              FROM ${MANAGER_METRICS_TABLE} 
              GROUP BY project_id
          ) latest ON m1.project_id = latest.project_id AND m1.reporting_year = latest.max_year
        ) m ON p.project_id = m.project_id
        ON DUPLICATE KEY UPDATE
          project_name = VALUES(project_name),
          project_status = VALUES(project_status),
          current_pmo_gate = VALUES(current_pmo_gate),
          capacity_gain_value = VALUES(capacity_gain_value),
          capacity_gain_pct = VALUES(capacity_gain_pct),
          dl_value = VALUES(dl_value),
          dl_equivalent = VALUES(dl_equivalent),
          idl_value = VALUES(idl_value),
          idl_fte = VALUES(idl_fte),
          yield_value = VALUES(yield_value),
          yield_gain_pct = VALUES(yield_gain_pct),
          quality_value = VALUES(quality_value),
          quality_cases = VALUES(quality_cases);
      `;

      const dummyReq = { headers: {} };
      await queryPromise(snapshotSql, [monthStr], dummyReq);
      console.log(`Project-level snapshot captured successfully for ${monthStr}.`);
    } catch (err) {
      console.error('Failed to capture monthly snapshot:', err);
    }
  }
});

// =====================================
// MANUAL SNAPSHOT TRIGGER (ADMIN ONLY)
// Changed to POST to accept specific months
// =====================================
app.post('/api/admin/force-snapshot', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    const fallbackMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    // Accepts snapshotMonth from request body, defaults to current month if missing
    const targetMonth = normalizeText(req.body.snapshotMonth) || fallbackMonth;

    const snapshotSql = `
      INSERT INTO t_manager_monthly_snapshots 
        (snapshot_month, project_id, project_name, project_status, current_pmo_gate, 
         capacity_gain_value, capacity_gain_pct, dl_value, dl_equivalent, 
         idl_value, idl_fte, yield_value, yield_gain_pct, quality_value, quality_cases)
      SELECT 
        ?, 
        p.project_id, 
        p.project_name,
        p.project_status,
        p.current_pmo_gate,
        m.capacity_gain_value, m.capacity_gain_pct,
        m.dl_value, m.dl_equivalent,
        m.idl_value, m.idl_fte,
        m.yield_value, m.yield_gain_pct,
        m.quality_value, m.quality_cases
      FROM ${MANAGER_PROJECTS_TABLE} p
      LEFT JOIN (
        SELECT m1.* FROM ${MANAGER_METRICS_TABLE} m1
        INNER JOIN (
            SELECT project_id, MAX(reporting_year) as max_year 
            FROM ${MANAGER_METRICS_TABLE} 
            GROUP BY project_id
        ) latest ON m1.project_id = latest.project_id AND m1.reporting_year = latest.max_year
      ) m ON p.project_id = m.project_id
      ON DUPLICATE KEY UPDATE
        project_name = VALUES(project_name),
        project_status = VALUES(project_status),
        current_pmo_gate = VALUES(current_pmo_gate),
        capacity_gain_value = VALUES(capacity_gain_value),
        capacity_gain_pct = VALUES(capacity_gain_pct),
        dl_value = VALUES(dl_value),
        dl_equivalent = VALUES(dl_equivalent),
        idl_value = VALUES(idl_value),
        idl_fte = VALUES(idl_fte),
        yield_value = VALUES(yield_value),
        yield_gain_pct = VALUES(yield_gain_pct),
        quality_value = VALUES(quality_value),
        quality_cases = VALUES(quality_cases);
    `;
    console.log("EXECUTING SNAPSHOT FOR:", targetMonth);
    console.log(snapshotSql);
    await queryPromise(snapshotSql, [targetMonth], req);
    res.json({ message: `Snapshot for ${targetMonth} synchronized successfully.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});