'use strict';

const path = require('path');
const fs = require('fs');
// Prefer backend/.env even when started with "node backend/server.js".
const backendEnv = path.join(__dirname, '.env');
require('dotenv').config(fs.existsSync(backendEnv) ? { path: backendEnv } : {});

const express = require('express');
const cors = require('cors');
const ldap = require('ldapjs');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const { createProjectFields } = require('./project-fields');
const { getTraceId, traceStart, traceEnd, traceError } = require('./trace');

const SERVER_VERSION = 'bem-project-fields-v5-column-visibility';
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = Number(process.env.PORT || 5001);
const LDAP_URL = process.env.LDAP_URL;
const BASE_DN = process.env.LDAP_BASE_DN;
const DIST_DIR = path.join(__dirname, 'dist');
const PROJECT_FIELDS_PAGE = path.join(__dirname, 'project-fields-admin.html');

if (!JWT_SECRET) throw new Error('JWT_SECRET must be set in your backend .env.');
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be an integer from 1 to 65535.');

// =====================================
// DATABASE TABLES
// =====================================
const MANAGER_PROJECTS_TABLE = 't_manager_project_master';
const MANAGER_YEARLY_TABLE = 't_manager_yearly_savings';
const MANAGER_METRICS_TABLE = 't_manager_metrics';
const MANAGER_COMMENTS_TABLE = 't_manager_comments';
const MANAGER_HISTORY_TABLE = 't_manager_history';
const MANAGER_SITE_TARGETS_TABLE = 't_manager_site_targets';
const MANAGER_PHASES_TABLE = 't_manager_project_phases';
const COLUMN_VISIBILITY_TABLE = 't_manager_column_visibility';
const COLUMN_VISIBILITY_FIELDS = [
  ['projectId', 'Project ID', 'Project details', true],
  ['projectName', 'Project Name', 'Project details', true],
  ['projectStatus', 'Project Status', 'Project details'],
  ['pillars', 'Pillars', 'Project details'], ['sites', 'Sites', 'Project details'],
  ['currentPmoGate', 'Current PMO Gate', 'Project details'],
  ['dtitInvolved', 'DTIT Involved', 'Project details'],
  ['aiAaAType', 'AI/AA/A Type', 'Project details'], ['foakNoak', 'FOAK/NOAK', 'Project details'],
  ['comment', 'Comment', 'Yearly values'],
  ['capacityGainValue', 'Capacity Gain Value', 'KPIs'],
  ['capacityGainPercent', 'Capacity Gain %', 'KPIs'], ['dlValue', 'DL Value', 'KPIs'],
  ['dlEquivalent', 'DL Equivalent', 'KPIs'], ['idlValue', 'IDL Value', 'KPIs'],
  ['idlFte', 'IDL FTE', 'KPIs'], ['yieldValue', 'Yield Value', 'KPIs'],
  ['yieldPercentGain', 'Yield (%) Gain', 'KPIs'], ['qualityValue', 'Quality Value', 'KPIs'],
  ['qualityCases', 'Quality Cases', 'KPIs'],
  ['targetG1Date', 'Target G1 Date', 'Milestones'], ['actualG1Date', 'Actual G1 Date', 'Milestones'],
  ['targetG2Date', 'Target G2 Date', 'Milestones'], ['actualG2Date', 'Actual G2 Date', 'Milestones'],
  ['targetG3Date', 'Target G3 Date', 'Milestones'], ['actualG3Date', 'Actual G3 Date', 'Milestones'],
  ['targetClosedDate', 'Target Closed Date', 'Milestones'], ['actualClosedDate', 'Actual Closed Date', 'Milestones']
].map(([field, label, group, required = false]) => ({ field, label, group, required }));
const ACTUAL_DATES = Object.freeze([
  { key: 'actualG1Date', column: 'actual_g1_date', phase: 'G1', bit: 1, label: 'Actual G1 Date' },
  { key: 'actualG2Date', column: 'actual_g2_date', phase: 'G2', bit: 2, label: 'Actual G2 Date' },
  { key: 'actualG3Date', column: 'actual_g3_date', phase: 'G3', bit: 4, label: 'Actual G3 Date' },
  { key: 'actualClosedDate', column: 'actual_closed_date', phase: 'Closure', bit: 8, label: 'Actual Closed Date' }
]);
const MANAGER_SNAPSHOTS_TABLE = 't_manager_monthly_snapshots';
const PROJECT_FIELDS_TABLE = 't_manager_project_fields';
const PROJECT_FIELD_HISTORY_TABLE = 't_manager_project_field_history';
const ACCESS_TABLE = 't_bem_access';
const CONFIG_TABLE = 't_app_config';

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.BEM_DB_USER,
  password: process.env.BEM_DB_PASSWORD,
  database: process.env.BEM_DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

const projectFields = createProjectFields({
  db,
  queryPromise,
  escapeId: mysql.escapeId,
  table: MANAGER_PROJECTS_TABLE,
  accessTable: ACCESS_TABLE,
  configTable: CONFIG_TABLE,
  getCurrentUser,
  transactionTables: [
    MANAGER_PROJECTS_TABLE, MANAGER_YEARLY_TABLE, MANAGER_METRICS_TABLE,
    MANAGER_COMMENTS_TABLE, MANAGER_HISTORY_TABLE, MANAGER_PHASES_TABLE,
    PROJECT_FIELD_HISTORY_TABLE
  ]
});

const requiredFieldMethods = [
  'listReady', 'readValues', 'prepareValues', 'beginTransaction',
  'auditCreate', 'applyValues', 'addField', 'renameHistory', 'listAdmin', 'updateField', 'linkedCategories'
];
for (const name of requiredFieldMethods) {
  if (typeof projectFields[name] !== 'function') {
    throw new Error(`project-fields.js is incompatible: missing ${name}(). Use the module supplied with this update.`);
  }
}

const app = express();
app.disable('x-powered-by');
const allowedOrigins = [...new Set([
  'http://localhost:8080',
  'http://muasxv4005.mua.st.com:9090',
  'http://172.18.153.227:8080',
  'http://172.18.165.43:8080',
  ...(process.env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)
])];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  exposedHeaders: ['X-Trace-Id', 'X-BEM-Server-Version']
}));
app.use(express.json());

// =====================================
// TRACE AND REQUEST MIDDLEWARE
// =====================================
app.use((req, res, next) => {
  if (req.path !== '/api' && !req.path.startsWith('/api/')) return next();
  getTraceId(req);
  const trace = traceStart('HTTP_REQUEST', req, { method: req.method, path: req.path, query: req.query });
  res.setHeader('X-Trace-Id', req._traceId);
  res.setHeader('X-BEM-Server-Version', SERVER_VERSION);
  res.setHeader('Cache-Control', 'no-store');
  res.on('finish', () => traceEnd(trace, { statusCode: res.statusCode }));
  next();
});

app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (req.body === undefined) req.body = {};
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ message: 'The request body must be a JSON object.' });
    }
  }
  next();
});

// =====================================
// DATABASE AND VALUE UTILITIES
// =====================================
function queryPromise(sql, params = [], req = null) {
  const sqlPreview = typeof sql === 'string' ? sql.replace(/\s+/g, ' ').trim().slice(0, 200) : null;
  const trace = traceStart('queryPromise', req || { headers: {} }, { sqlPreview, paramCount: params.length });
  return new Promise((resolve, reject) => {
    const executor = req?._dbConnection || db;
    executor.query(sql, params, (err, results) => {
      if (err) {
        traceError(trace, err, { sqlPreview });
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
  const text = String(value).trim();
  return text || null;
}
function normalizeNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function parseStandardDate(value) {
  if (!value) return null;
  const text = String(value).trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function getCurrentUser(req) { return req?.user?.username || 'system'; }
function monthString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function sendError(res, err, fallback = 'The operation failed.') {
  if (err.code === 'ER_BAD_FIELD_ERROR' && /actual_(?:g[123]_date|closed_date|date_override_mask)/.test(err.sql || err.message || '')) {
    return res.status(503).json({ message: 'Editable actual dates need database setup. Run 003_actual_project_dates.sql in BEM_DB_NAME, restart the backend, and refresh.', serverVersion: SERVER_VERSION });
  }
  if (err.status) return res.status(err.status).json({ message: err.message });
  return res.status(500).json({ message: err.message || fallback });
}
function sendProjectFieldError(res, err) {
  if (err.code === 'ER_BAD_FIELD_ERROR') {
    return res.status(503).json({ message: 'Project-column dropdown metadata is missing. Run 002_project_field_dropdowns.sql in the database configured by BEM_DB_NAME, restart the backend, and refresh.', serverVersion: SERVER_VERSION });
  }
  if (err.code === 'ER_NO_SUCH_TABLE') {
    return res.status(503).json({
      message: 'Project-field setup tables are missing. Run 001_project_fields.sql in the database configured by BEM_DB_NAME, then refresh.',
      serverVersion: SERVER_VERSION
    });
  }
  if (['ER_TABLEACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR', 'ER_ACCESS_DENIED_ERROR', 'ER_SPECIFIC_ACCESS_DENIED_ERROR'].includes(err.code)) {
    return res.status(503).json({
      message: 'The backend database account cannot access project fields. Check its registry/history permissions and ALTER permission on t_manager_project_master.',
      serverVersion: SERVER_VERSION
    });
  }
  if (!err.status) console.error('Project-field API failed:', err.code || err.message);
  return res.status(err.status || 500).json({
    message: err.status ? err.message : 'Project-field operation failed. Check the backend trace.',
    serverVersion: SERVER_VERSION
  });
}

// =====================================
// AUTH AND CURRENT DATABASE ROLES
// =====================================
async function authenticateToken(req, res, next) {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ message: 'No token provided.' });
  let user;
  try { user = jwt.verify(match[1], JWT_SECRET); }
  catch { return res.status(403).json({ message: 'Session expired. Please log in again.' }); }
  if (!user || typeof user !== 'object' || typeof user.username !== 'string' || !user.username) {
    return res.status(403).json({ message: 'Invalid session. Please log in again.' });
  }
  try {
    const rows = await queryPromise(`SELECT access_right FROM ${ACCESS_TABLE} WHERE username = ? LIMIT 1`, [user.username], req);
    req.user = { ...user, access_right: rows[0]?.access_right || 'pending' };
    next();
  } catch (err) {
    return res.status(503).json({ message: 'Unable to verify your current access rights. Check the backend database connection.' });
  }
}
function requireAccess(req, res, next) {
  if (!['viewer', 'user', 'admin'].includes(req.user?.access_right)) {
    return res.status(403).json({ message: 'Forbidden: Your account is pending approval.' });
  }
  next();
}
function requireEditAccess(req, res, next) {
  if (!['user', 'admin'].includes(req.user?.access_right)) {
    return res.status(403).json({ message: 'Forbidden: You do not have edit privileges.' });
  }
  next();
}
function requireAdmin(req, res, next) {
  if (req.user?.access_right !== 'admin') return res.status(403).json({ message: 'Forbidden: Admins only.' });
  next();
}

// =====================================
// SHARED COLUMN VISIBILITY
// =====================================
const columnVisibilityStorage = { checked: false, ready: false, message: 'Column visibility has not been checked yet.' };
function visibilitySetupError() {
  return Object.assign(new Error('Column visibility needs database setup. Run 004_column_visibility.sql in BEM_DB_NAME, restart the backend, and refresh.'), { status: 503 });
}
async function readColumnVisibility(req = null) {
  let rows;
  try {
    rows = await queryPromise(`SELECT hidden_fields, revision, updated_by, DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at FROM ${COLUMN_VISIBILITY_TABLE} WHERE setting_id = 1`, [], req);
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') throw visibilitySetupError();
    throw err;
  }
  if (!rows.length) throw visibilitySetupError();
  const row = rows[0];
  let hiddenFields;
  try { hiddenFields = typeof row.hidden_fields === 'string' ? JSON.parse(row.hidden_fields) : row.hidden_fields; }
  catch { throw Object.assign(new Error('Stored column visibility is invalid. Check t_manager_column_visibility.'), { status: 503 }); }
  if (!Array.isArray(hiddenFields) || hiddenFields.some(field => typeof field !== 'string') || !Number.isSafeInteger(Number(row.revision)) || Number(row.revision) < 0) {
    throw Object.assign(new Error('Stored column visibility is invalid. Check t_manager_column_visibility.'), { status: 503 });
  }
  return { hiddenFields: [...new Set(hiddenFields)].filter(field => !['projectId', 'projectName'].includes(field)), revision: Number(row.revision), updatedBy: row.updated_by, updatedAt: row.updated_at };
}
async function columnVisibilityCatalog(settings, req) {
  const currentYear = new Date().getFullYear();
  const years = new Set(Array.from({ length: 31 }, (_, i) => currentYear - 10 + i));
  for (const field of settings.hiddenFields) if (/^year[1-9]\d{3}$/.test(field)) years.add(Number(field.slice(4)));
  const custom = await projectFields.listReady(req);
  const columns = [
    ...COLUMN_VISIBILITY_FIELDS,
    ...[...years].sort((a, b) => a - b).map(year => ({ field: `year${year}`, label: String(year), group: 'Yearly values', required: false })),
    ...custom.map(field => ({ field: `customFields.${field.columnName}`, label: field.label, group: 'Added project fields', required: false }))
  ];
  const hidden = new Set(settings.hiddenFields);
  return columns.map(column => ({ ...column, visible: column.required || !hidden.has(column.field) }));
}
async function checkColumnVisibilityStorage() {
  try {
    await readColumnVisibility();
    Object.assign(columnVisibilityStorage, { checked: true, ready: true, message: 'Shared column visibility settings are readable.' });
  } catch (err) {
    Object.assign(columnVisibilityStorage, { checked: true, ready: false, message: err.status ? err.message : 'Column visibility cannot be read. Check database permissions.' });
  }
  return columnVisibilityStorage;
}
app.get('/api/manager-column-visibility', authenticateToken, requireAccess, async (req, res) => {
  try { return res.json(await readColumnVisibility(req)); }
  catch (err) { return sendError(res, err); }
});
app.get('/api/admin/column-visibility', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await readColumnVisibility(req);
    return res.json({ ...settings, columns: await columnVisibilityCatalog(settings, req) });
  } catch (err) { return sendError(res, err); }
});
app.put('/api/admin/column-visibility', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { hiddenFields, revision } = req.body;
    if (!Array.isArray(hiddenFields) || hiddenFields.length > 10000 || hiddenFields.some(field => typeof field !== 'string') || !Number.isSafeInteger(revision) || revision < 0) {
      return res.status(400).json({ message: 'Send a hiddenFields array and the current revision number.' });
    }
    const settings = await readColumnVisibility(req);
    const columns = await columnVisibilityCatalog(settings, req);
    const allowed = new Set(columns.filter(column => !column.required).map(column => column.field));
    if (hiddenFields.some(field => !allowed.has(field) && !/^year[1-9]\d{3}$/.test(field))) {
      return res.status(400).json({ message: 'Only optional project columns can be hidden. Project ID and Project Name must stay visible.' });
    }
    const hidden = [...new Set(hiddenFields)].sort();
    const result = await queryPromise(`UPDATE ${COLUMN_VISIBILITY_TABLE} SET hidden_fields = ?, revision = revision + 1, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_id = 1 AND revision = ?`, [JSON.stringify(hidden), getCurrentUser(req), revision], req);
    if (!result.affectedRows) return res.status(409).json({ message: 'Another admin changed column visibility. Refresh this tab before saving again.' });
    return res.json({ message: 'Column visibility saved for all users.', hiddenFields: hidden, revision: revision + 1, updatedBy: getCurrentUser(req) });
  } catch (err) { return sendError(res, err); }
});

// =====================================
// HEALTH: IDENTIFY THE RUNNING SERVER
// =====================================
const fieldStorage = { checked: false, ready: false, message: 'Database setup has not been checked yet.' };
const actualDateStorage = { checked: false, ready: false, message: 'Actual-date storage has not been checked yet.' };
app.get('/api/health', (req, res) => res.json({
  service: 'BEM Projects API',
  serverVersion: SERVER_VERSION,
  projectFieldsEnabled: true,
  projectFieldDropdownsEnabled: true,
  actualDatesEditable: true,
  actualDateStorage: { ...actualDateStorage },
  columnVisibilityEnabled: true,
  columnVisibilityStorage: { ...columnVisibilityStorage },
  projectFieldStorage: { ...fieldStorage },
  routes: {
    definitions: '/api/manager-project-fields',
    adminColumns: '/api/admin/project-fields',
    standaloneAdmin: '/admin/project-fields',
    columnVisibility: '/api/manager-column-visibility',
    adminVisibility: '/api/admin/column-visibility'
  }
}));

async function checkProjectFieldStorage() {
  try {
    await Promise.all([
      queryPromise(`SELECT input_mode, config_category FROM ${PROJECT_FIELDS_TABLE} LIMIT 0`),
      queryPromise(`SELECT 1 FROM ${PROJECT_FIELD_HISTORY_TABLE} LIMIT 0`)
    ]);
    Object.assign(fieldStorage, { checked: true, ready: true, message: 'Project-field registry and history tables are readable.' });
  } catch (err) {
    Object.assign(fieldStorage, {
      checked: true,
      ready: false,
      message: err.code === 'ER_NO_SUCH_TABLE'
        ? 'Run 001_project_fields.sql in the database configured by BEM_DB_NAME.'
        : err.code === 'ER_BAD_FIELD_ERROR' ? 'Run 002_project_field_dropdowns.sql in the database configured by BEM_DB_NAME.'
        : 'Check the backend database connection and project-field table permissions.'
    });
    console.error('Project-field setup check:', fieldStorage.message, err.code || '');
  }
  await checkActualDateStorage();
}

async function checkActualDateStorage() {
  try {
    await queryPromise(`SELECT actual_g1_date, actual_g2_date, actual_g3_date, actual_closed_date, actual_date_override_mask FROM ${MANAGER_PROJECTS_TABLE} LIMIT 0`);
    Object.assign(actualDateStorage, { checked: true, ready: true, message: 'Editable actual-date columns are readable.' });
  } catch (err) {
    Object.assign(actualDateStorage, { checked: true, ready: false, message: err.code === 'ER_BAD_FIELD_ERROR'
      ? 'Run 003_actual_project_dates.sql in the database configured by BEM_DB_NAME.'
      : 'Check the backend database connection and actual-date column permissions.' });
    console.error('Actual-date setup check:', actualDateStorage.message, err.code || '');
  }
}

function dateText(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  return String(value).slice(0, 10);
}

function actualDateValues(project, phase = {}) {
  const mask = Number(project.actual_date_override_mask || 0);
  return Object.fromEntries(ACTUAL_DATES.map(field => [field.key,
    (mask & field.bit) ? dateText(project[field.column]) : dateText(phase[field.phase])
  ]));
}

function prepareActualDates(body) {
  return ACTUAL_DATES.filter(field => Object.hasOwn(body, field.key)).map(field => {
    const input = body[field.key];
    if (input === null || (typeof input === 'string' && input.trim() === '')) return { ...field, value: null };
    const value = typeof input === 'string' ? input.trim() : '';
    const invalid = () => { const err = new Error(`${field.label} must be a real calendar date in YYYY-MM-DD format, or blank.`); err.status = 400; throw err; };
    if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) invalid();
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) invalid();
    return { ...field, value };
  });
}

async function queryActualDateColumns(sql, params, req) {
  try { return await queryPromise(sql, params, req); }
  catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      err.status = 503;
      err.message = 'Editable actual dates need database setup. Run 003_actual_project_dates.sql in BEM_DB_NAME, restart the backend, and refresh.';
    }
    throw err;
  }
}

async function saveActualDates(projectId, dates, req, isCreate = false) {
  if (!dates.length) return;
  if (!req._dbConnection) throw new Error('Actual-date updates require a project transaction.');
  const projects = await queryActualDateColumns(`SELECT actual_g1_date, actual_g2_date, actual_g3_date, actual_closed_date, actual_date_override_mask
    FROM ${MANAGER_PROJECTS_TABLE} WHERE project_id = ? FOR UPDATE`, [projectId], req);
  if (!projects.length) { const err = new Error('Project not found.'); err.status = 404; throw err; }
  const phaseRows = isCreate ? [] : await queryPromise(`SELECT project_id,
    CASE WHEN phase_name = 'G2.5' THEN 'G2' ELSE phase_name END AS phase_name,
    DATE_FORMAT(MIN(start_date), '%Y-%m-%d') AS actual_start
    FROM ${MANAGER_PHASES_TABLE} WHERE project_id = ? AND phase_name IN ('G1', 'G2', 'G2.5', 'G3', 'Closure')
    GROUP BY project_id, CASE WHEN phase_name = 'G2.5' THEN 'G2' ELSE phase_name END`, [projectId], req);
  const phase = Object.fromEntries(phaseRows.map(row => [row.phase_name, row.actual_start]));
  const beforeValues = isCreate ? {} : actualDateValues(projects[0], phase);
  const before = Object.fromEntries(dates.map(field => [field.key, beforeValues[field.key] ?? null]));
  const after = Object.fromEntries(dates.map(field => [field.key, field.value]));
  const mask = dates.reduce((value, field) => value | field.bit, Number(projects[0].actual_date_override_mask || 0));
  await queryActualDateColumns(`UPDATE ${MANAGER_PROJECTS_TABLE} SET ${dates.map(field => `${field.column} = ?`).join(', ')}, actual_date_override_mask = ? WHERE project_id = ?`,
    [...dates.map(field => field.value), mask, projectId], req);
  await queryPromise(`INSERT INTO ${PROJECT_FIELD_HISTORY_TABLE} (project_id, before_values, after_values, changed_by)
    VALUES (?, ?, ?, ?)`, [projectId, JSON.stringify(before), JSON.stringify(after), getCurrentUser(req)], req);
}

// =====================================
// LOGIN
// =====================================
app.post('/api/login', (req, res) => {
  const trace = traceStart('POST /api/login', req, { username: req.body.username || null });
  const { username, password } = req.body;
  if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
    traceEnd(trace, { outcome: 'missing_credentials' });
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }
  if (!LDAP_URL || !BASE_DN) return res.status(503).json({ success: false, message: 'LDAP_URL and LDAP_BASE_DN must be configured.' });

  let responded = false;
  let userClient;
  const client = ldap.createClient({ url: LDAP_URL });
  const close = connection => { if (connection) { try { connection.unbind(); } catch {} } };
  const fail = (message, err) => {
    if (responded) return;
    responded = true;
    traceError(trace, err || new Error(message), { step: 'ldap_authentication' });
    close(client); close(userClient);
    res.status(500).json({ success: false, message });
  };
  client.on('error', err => fail('LDAP connection failed.', err));
  // Escape LDAP filter metacharacters while preserving the original uid search.
  const escapedUsername = username.replace(/[\\*()\u0000]/g, value => '\\' + value.charCodeAt(0).toString(16).padStart(2, '0'));
  client.search(BASE_DN, { filter: `(uid=${escapedUsername})`, scope: 'one', attributes: ['dn'] }, (err, search) => {
    if (responded) return;
    if (err) return fail('LDAP search failed.', err);
    let userDN = null;
    search.on('searchEntry', entry => { userDN = entry.dn.toString(); });
    search.on('error', searchErr => fail('LDAP search failed.', searchErr));
    search.on('end', () => {
      close(client);
      if (responded) return;
      if (!userDN) {
        responded = true;
        traceEnd(trace, { outcome: 'user_not_found', username });
        return res.status(401).json({ success: false, message: 'User not found.' });
      }
      userClient = ldap.createClient({ url: LDAP_URL });
      userClient.on('error', bindErr => fail('LDAP connection failed.', bindErr));
      userClient.bind(userDN, password, async bindErr => {
        close(userClient);
        if (responded) return;
        if (bindErr) {
          responded = true;
          traceEnd(trace, { outcome: 'invalid_credentials', username });
          return res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }
        try {
          const rows = await queryPromise(`SELECT access_right FROM ${ACCESS_TABLE} WHERE username = ?`, [username], req);
          let access_right = rows[0]?.access_right || 'pending';
          if (!rows.length) {
            await queryPromise(`INSERT INTO ${ACCESS_TABLE} (username, access_right, granted_by) VALUES (?, 'pending', 'system')`, [username], req);
          }
          if (responded) return;
          const token = jwt.sign({ username, access_right }, JWT_SECRET, { expiresIn: '4h' });
          responded = true;
          traceEnd(trace, { outcome: 'login_success', username, access_right });
          return res.json({ success: true, message: 'LDAP authentication successful.', token, access_right });
        } catch (dbErr) {
          if (responded) return;
          responded = true;
          traceError(trace, dbErr, { step: 'load_access_right', username });
          return res.status(503).json({ success: false, message: 'Authentication succeeded, but database access rights could not be loaded.' });
        }
      });
    });
  });
});

app.get('/api/check-auth', authenticateToken, (req, res) => res.json({ loggedIn: true, user: req.user }));

// =====================================
// PROJECT-FIELD ROUTES (EXPLICIT)
// All definitions are registered here before static files and SPA fallback.
// =====================================
app.get('/api/manager-project-fields', authenticateToken, requireAccess, async (req, res) => {
  try { return res.json(await projectFields.listReady(req)); }
  catch (err) { return sendProjectFieldError(res, err); }
});

app.get('/api/admin/project-fields', authenticateToken, requireAdmin, async (req, res) => {
  try {
    return res.json(await projectFields.listAdmin(req));
  } catch (err) { return sendProjectFieldError(res, err); }
});

app.post('/api/admin/project-fields', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await projectFields.addField(req.body, req);
    return res.status(result.created ? 201 : 200).json({
      message: result.created ? 'Column created successfully.' : 'Column already exists with this definition.',
      ...result
    });
  } catch (err) { return sendProjectFieldError(res, err); }
});

app.put('/api/admin/project-fields/:columnName', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const field = await projectFields.updateField(req.params.columnName, req.body, req);
    return res.json({ message: 'Column settings updated successfully.', field });
  } catch (err) { return sendProjectFieldError(res, err); }
});

app.patch('/api/manager-yearly/:projectId/custom-fields', authenticateToken, requireEditAccess, async (req, res) => {
  let transaction;
  try {
    if (!Object.hasOwn(req.body, 'customFields') || Object.keys(req.body).some(key => key !== 'customFields')) {
      return res.status(400).json({ message: 'Send only a customFields object.' });
    }
    const prepared = await projectFields.prepareValues(req.body.customFields, req);
    transaction = await projectFields.beginTransaction(req);
    const rows = await queryPromise(`SELECT project_id FROM ${MANAGER_PROJECTS_TABLE} WHERE project_id = ? FOR UPDATE`, [req.params.projectId], req);
    if (!rows.length) return res.status(404).json({ message: 'Project not found.' });
    await projectFields.applyValues(req.params.projectId, prepared, req);
    await transaction.commit();
    return res.json({ message: 'Custom project fields updated successfully.' });
  } catch (err) { return sendProjectFieldError(res, err); }
  finally { if (transaction) await transaction.close(); }
});

app.get('/api/manager-yearly/:projectId/custom-fields/history', authenticateToken, requireAccess, async (req, res) => {
  try {
    const rows = await queryPromise(`
      SELECT audit_id, project_id, before_values, after_values, changed_by,
             DATE_FORMAT(changed_at, '%Y-%m-%d %H:%i:%s') AS changed_at
      FROM ${PROJECT_FIELD_HISTORY_TABLE}
      WHERE project_id = ? ORDER BY audit_id DESC LIMIT 100
    `, [req.params.projectId], req);
    const parseValues = value => typeof value === 'string' ? JSON.parse(value) : value || {};
    return res.json(rows.map(row => ({ ...row, before_values: parseValues(row.before_values), after_values: parseValues(row.after_values) })));
  } catch (err) { return sendProjectFieldError(res, err); }
});

app.get('/admin/project-fields', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(PROJECT_FIELDS_PAGE, err => {
    if (!err) return;
    if (res.headersSent) return next(err);
    if (err.code === 'ENOENT' || err.status === 404) {
      return res.status(503).json({ message: 'Copy project-fields-admin.html beside server.js to use this standalone page. Column management is also available in the updated AdminDashboard.vue.' });
    }
    next(err);
  });
});

// =====================================
// USER ACCESS MANAGEMENT
// =====================================
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    return res.json(await queryPromise(`
      SELECT username, access_right, updated_at, granted_by FROM ${ACCESS_TABLE}
      ORDER BY FIELD(access_right, 'pending', 'admin', 'user', 'viewer'), username ASC
    `, [], req));
  } catch (err) { return sendError(res, err); }
});
app.put('/api/admin/users/:username', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const role = req.body.access_right;
    if (!['pending', 'viewer', 'user', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role.' });
    await queryPromise(`
      INSERT INTO ${ACCESS_TABLE} (username, access_right, granted_by) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE access_right = VALUES(access_right), granted_by = VALUES(granted_by)
    `, [req.params.username, role, getCurrentUser(req)], req);
    return res.json({ message: `Successfully updated ${req.params.username} to ${role}.` });
  } catch (err) { return sendError(res, err); }
});

// =====================================
// MASTER DATA / DROPDOWNS
// =====================================
app.get('/api/config/options', authenticateToken, requireAccess, async (req, res) => {
  try {
    const rows = await queryPromise(`SELECT category, value FROM ${CONFIG_TABLE} WHERE is_active = 1 ORDER BY category, value ASC`, [], req);
    const options = Object.create(null);
    for (const row of rows) {
      if (!options[row.category]) options[row.category] = [];
      options[row.category].push(row.value);
    }
    // A new dropdown category appears in Master Data even before its first option.
    for (const row of await projectFields.linkedCategories(req)) {
      if (!options[row.category]) options[row.category] = [];
    }
    return res.json(options);
  } catch (err) { return sendProjectFieldError(res, err); }
});
app.post('/api/config/options', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const category = normalizeText(req.body.category), value = normalizeText(req.body.value);
    if (!category || !value) return res.status(400).json({ message: 'Category and Value are required.' });
    if ([...category].length > 64 || ['constructor', 'prototype', '__proto__'].includes(category) || [...value].length > 255) return res.status(400).json({ message: 'Category must contain at most 64 characters and Value at most 255 characters.' });
    await queryPromise(`INSERT INTO ${CONFIG_TABLE} (category, value, is_active) VALUES (?, ?, 1)`, [category, value], req);
    return res.status(201).json({ message: `${value} added to ${category} successfully.` });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This option already exists.' });
    return sendError(res, err);
  }
});

// =====================================
// PROJECT DATA AND KPIs
// =====================================
app.get('/api/manager-yearly', authenticateToken, requireAccess, async (req, res) => {
  const trace = traceStart('GET /api/manager-yearly', req);
  try {
    const definitions = await projectFields.listReady(req);
    const projects = await queryPromise(`SELECT * FROM ${MANAGER_PROJECTS_TABLE} ORDER BY project_name ASC`, [], req);
    const yearlyValues = await queryPromise(`SELECT * FROM ${MANAGER_YEARLY_TABLE}`, [], req);
    const metrics = await queryPromise(`
      SELECT m.* FROM ${MANAGER_METRICS_TABLE} m
      INNER JOIN (SELECT project_id, MAX(reporting_year) AS max_year FROM ${MANAGER_METRICS_TABLE} GROUP BY project_id) latest
        ON m.project_id = latest.project_id AND m.reporting_year = latest.max_year
    `, [], req);
    const comments = await queryPromise(`
      SELECT c.* FROM ${MANAGER_COMMENTS_TABLE} c
      INNER JOIN (SELECT project_id, MAX(created_at) AS max_date FROM ${MANAGER_COMMENTS_TABLE} GROUP BY project_id) latest
        ON c.project_id = latest.project_id AND c.created_at = latest.max_date
      ORDER BY c.comment_id DESC
    `, [], req);
    const phases = await queryPromise(`
      SELECT project_id,
             CASE WHEN phase_name = 'G2.5' THEN 'G2' ELSE phase_name END AS phase_name,
             DATE_FORMAT(MIN(start_date), '%Y-%m-%d') AS actual_start
      FROM ${MANAGER_PHASES_TABLE}
      WHERE phase_name IN ('G1', 'G2', 'G2.5', 'G3', 'Closure')
      GROUP BY project_id, CASE WHEN phase_name = 'G2.5' THEN 'G2' ELSE phase_name END
    `, [], req);

    const metricsByProject = new Map(metrics.map(row => [row.project_id, row]));
    const commentsByProject = new Map();
    for (const comment of comments) if (!commentsByProject.has(comment.project_id)) commentsByProject.set(comment.project_id, comment);
    const yearsByProject = new Map();
    for (const row of yearlyValues) {
      if (!yearsByProject.has(row.project_id)) yearsByProject.set(row.project_id, {});
      yearsByProject.get(row.project_id)[`year${row.savings_year}`] = row.savings_value;
    }
    const phasesByProject = new Map();
    for (const row of phases) {
      if (!phasesByProject.has(row.project_id)) phasesByProject.set(row.project_id, {});
      phasesByProject.get(row.project_id)[row.phase_name] = row.actual_start;
    }
    const result = projects.map(project => {
      const metric = metricsByProject.get(project.project_id) || {};
      const comment = commentsByProject.get(project.project_id) || {};
      const phase = phasesByProject.get(project.project_id) || {};
      return {
        projectId: project.project_id,
        projectName: project.project_name,
        projectStatus: project.project_status ?? null,
        pillars: project.pillar,
        sites: project.site,
        currentPmoGate: project.current_pmo_gate,
        dtitInvolved: project.dtit_involved,
        aiAaAType: project.ai_type,
        foakNoak: project.foak_noak,
        targetG1Date: project.target_g1_date ?? null,
        targetG2Date: project.target_g2_date ?? null,
        targetG3Date: project.target_g3_date ?? null,
        targetClosedDate: project.target_closed_date ?? null,
        ...actualDateValues(project, phase),
        comment: comment.comment_text ?? null,
        capacityGainValue: metric.capacity_gain_value ?? null,
        capacityGainPercent: metric.capacity_gain_pct ?? null,
        dlValue: metric.dl_value ?? null,
        dlEquivalent: metric.dl_equivalent ?? null,
        idlValue: metric.idl_value ?? null,
        idlFte: metric.idl_fte ?? null,
        yieldValue: metric.yield_value ?? null,
        yieldPercentGain: metric.yield_gain_pct ?? null,
        qualityValue: metric.quality_value ?? null,
        qualityCases: metric.quality_cases ?? null,
        ...(yearsByProject.get(project.project_id) || {}),
        customFields: projectFields.readValues(project, definitions)
      };
    });
    traceEnd(trace, { outcome: 'success', rowCount: result.length });
    return res.json(result);
  } catch (err) {
    traceError(trace, err);
    if (err.code === 'ER_NO_SUCH_TABLE') return sendProjectFieldError(res, err);
    return sendError(res, err);
  }
});

app.get('/api/manager-yearly/pipeline-velocity', authenticateToken, requireAccess, async (req, res) => {
  try {
    const rows = await queryPromise(`
      SELECT DATE_FORMAT(start_date, '%Y-%m') AS month_key, DATE_FORMAT(start_date, '%b %Y') AS month_label,
             SUM(CASE WHEN phase_name = 'G1' THEN 1 ELSE 0 END) AS g1_count,
             SUM(CASE WHEN phase_name IN ('G2', 'G2.5') THEN 1 ELSE 0 END) AS g2_count,
             SUM(CASE WHEN phase_name = 'G3' THEN 1 ELSE 0 END) AS g3_count, COUNT(*) AS total_transitions
      FROM ${MANAGER_PHASES_TABLE} WHERE phase_name IN ('G1', 'G2', 'G2.5', 'G3')
      GROUP BY month_key, month_label ORDER BY month_key DESC LIMIT 12
    `, [], req);
    return res.json(rows.map(row => ({ month: row.month_label, g1: Number(row.g1_count), g2: Number(row.g2_count), g3: Number(row.g3_count), total: Number(row.total_transitions) })));
  } catch (err) { return sendError(res, err); }
});

// =====================================
// SITE TARGETS
// =====================================
app.get('/api/manager-site-targets', authenticateToken, requireAccess, async (req, res) => {
  try { return res.json(await queryPromise(`SELECT * FROM ${MANAGER_SITE_TARGETS_TABLE}`, [], req)); }
  catch (err) { return sendError(res, err); }
});
app.post('/api/manager-site-targets', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { site, target_year, expected_value } = req.body;
    if (!site || !target_year || expected_value === undefined) return res.status(400).json({ message: 'Site, Target Year, and Expected Value are required.' });
    const existing = await queryPromise(`SELECT site FROM ${MANAGER_SITE_TARGETS_TABLE} WHERE site = ? AND target_year = ?`, [site, target_year], req);
    if (existing.length) return res.status(409).json({ message: `A target already exists for ${site} in ${target_year}. Please update it instead.` });
    await queryPromise(`INSERT INTO ${MANAGER_SITE_TARGETS_TABLE} (site, target_year, expected_value) VALUES (?, ?, ?)`, [site, target_year, expected_value], req);
    return res.status(201).json({ message: 'Site target added successfully.' });
  } catch (err) { return sendError(res, err); }
});
app.put('/api/manager-site-targets', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { site, target_year, expected_value } = req.body;
    if (!site || !target_year || expected_value === undefined) return res.status(400).json({ message: 'Site, Target Year, and Expected Value are required.' });
    await queryPromise(`UPDATE ${MANAGER_SITE_TARGETS_TABLE} SET expected_value = ? WHERE site = ? AND target_year = ?`, [expected_value, site, target_year], req);
    return res.json({ message: 'Site target updated successfully.' });
  } catch (err) { return sendError(res, err); }
});

// =====================================
// PROJECT HISTORY
// =====================================
const HISTORY_SELECT = `
  SELECT history_id, project_id, project_name, project_status, current_pmo_gate,
         capacity_gain_value, capacity_gain_pct, dl_value, dl_equivalent, idl_value, idl_fte,
         yield_value, yield_gain_pct, quality_value, quality_cases, comment_text, changed_by,
         DATE_FORMAT(changed_at, '%Y-%m-%d %H:%i:%s') AS changed_at, action_type
  FROM ${MANAGER_HISTORY_TABLE}`;
app.get('/api/manager-yearly/history/all', authenticateToken, requireAdmin, async (req, res) => {
  try { return res.json(await queryPromise(`${HISTORY_SELECT} ORDER BY changed_at DESC`, [], req)); }
  catch (err) { return sendError(res, err); }
});
app.get('/api/manager-yearly/:projectId/history', authenticateToken, requireAccess, async (req, res) => {
  try { return res.json(await queryPromise(`${HISTORY_SELECT} WHERE project_id = ? ORDER BY changed_at DESC`, [req.params.projectId], req)); }
  catch (err) { return sendError(res, err); }
});

// =====================================
// CORE PROJECT WRITE HELPERS
// =====================================
function masterValues(body) {
  return [
    normalizeText(body.projectName), normalizeText(body.projectStatus), normalizeText(body.pillars),
    normalizeText(body.sites), normalizeText(body.currentPmoGate), normalizeText(body.dtitInvolved),
    normalizeText(body.aiAaAType), normalizeText(body.foakNoak), parseStandardDate(body.targetG1Date),
    parseStandardDate(body.targetG2Date), parseStandardDate(body.targetG3Date), parseStandardDate(body.targetClosedDate)
  ];
}
const masterBodyKeys = [
  'projectName', 'projectStatus', 'pillars', 'sites', 'currentPmoGate', 'dtitInvolved',
  'aiAaAType', 'foakNoak', 'targetG1Date', 'targetG2Date', 'targetG3Date', 'targetClosedDate'
];
const masterColumns = [
  'project_name', 'project_status', 'pillar', 'site', 'current_pmo_gate', 'dtit_involved',
  'ai_type', 'foak_noak', 'target_g1_date', 'target_g2_date', 'target_g3_date', 'target_closed_date'
];
async function saveMasterValues(projectId, body, current, req) {
  const indexes = masterBodyKeys.map((key, index) => Object.hasOwn(body, key) ? index : -1).filter(index => index >= 0);
  if (!indexes.length) return;
  if (Object.hasOwn(body, 'projectName') && !normalizeText(body.projectName)) throw Object.assign(new Error('Project Name is required.'), { status: 400 });
  const values = masterValues(body);
  await queryPromise(`UPDATE ${MANAGER_PROJECTS_TABLE} SET ${indexes.map(index => `${masterColumns[index]} = ?`).join(', ')} WHERE project_id = ?`, [...indexes.map(index => values[index]), projectId], req);
  const newGate = normalizeText(body.currentPmoGate);
  if (Object.hasOwn(body, 'currentPmoGate') && (current?.current_pmo_gate ?? null) !== newGate && newGate) {
    await queryPromise(`UPDATE ${MANAGER_PHASES_TABLE} SET end_date = CURDATE() WHERE project_id = ? AND end_date IS NULL`, [projectId], req);
    await queryPromise(`INSERT INTO ${MANAGER_PHASES_TABLE} (project_id, phase_name, start_date) VALUES (?, ?, CURDATE())`, [projectId, newGate], req);
  }
}
const metricColumns = [
  'capacity_gain_value', 'capacity_gain_pct', 'dl_value', 'dl_equivalent', 'idl_value',
  'idl_fte', 'yield_value', 'yield_gain_pct', 'quality_value', 'quality_cases'
];
const metricBodyKeys = [
  'capacityGainValue', 'capacityGainPercent', 'dlValue', 'dlEquivalent', 'idlValue',
  'idlFte', 'yieldValue', 'yieldPercentGain', 'qualityValue', 'qualityCases'
];
async function captureProjectHistory(projectId, currentYear, req) {
  const rows = await queryPromise(`
    SELECT p.project_name, p.project_status, p.current_pmo_gate,
           m.capacity_gain_value, m.capacity_gain_pct, m.dl_value, m.dl_equivalent,
           m.idl_value, m.idl_fte, m.yield_value, m.yield_gain_pct, m.quality_value, m.quality_cases, c.comment_text
    FROM ${MANAGER_PROJECTS_TABLE} p
    LEFT JOIN ${MANAGER_METRICS_TABLE} m ON p.project_id = m.project_id AND m.reporting_year = ?
    LEFT JOIN ${MANAGER_COMMENTS_TABLE} c ON p.project_id = c.project_id
    WHERE p.project_id = ? ORDER BY c.created_at DESC, c.comment_id DESC LIMIT 1
  `, [currentYear, projectId], req);
  if (!rows.length) return null;
  const current = rows[0];
  await queryPromise(`
    INSERT INTO ${MANAGER_HISTORY_TABLE}
      (project_id, project_name, project_status, current_pmo_gate, ${metricColumns.join(', ')}, comment_text, changed_by, action_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UPDATE')
  `, [projectId, current.project_name, current.project_status, current.current_pmo_gate,
    ...metricColumns.map(column => current[column] ?? null), current.comment_text ?? null, getCurrentUser(req)], req);
  return current;
}
async function saveYearlyValues(projectId, body, req) {
  for (const key of Object.keys(body).filter(name => /^year\d{4}$/.test(name))) {
    const year = Number(key.slice(4));
    const value = normalizeNumber(body[key]);
    // Retain the existing server's blank-value behavior for savings.
    if (value === null) continue;
    const rows = await queryPromise(`SELECT project_id FROM ${MANAGER_YEARLY_TABLE} WHERE project_id = ? AND savings_year = ? LIMIT 1`, [projectId, year], req);
    if (rows.length) await queryPromise(`UPDATE ${MANAGER_YEARLY_TABLE} SET savings_value = ? WHERE project_id = ? AND savings_year = ?`, [value, projectId, year], req);
    else await queryPromise(`INSERT INTO ${MANAGER_YEARLY_TABLE} (project_id, savings_year, savings_value) VALUES (?, ?, ?)`, [projectId, year, value], req);
  }
}
async function saveMetrics(projectId, year, body, req) {
  const indexes = metricBodyKeys.map((key, index) => Object.hasOwn(body, key) ? index : -1).filter(index => index >= 0);
  if (!indexes.length) return;
  const rows = await queryPromise(`SELECT metrics_id FROM ${MANAGER_METRICS_TABLE} WHERE project_id = ? AND reporting_year = ? LIMIT 1`, [projectId, year], req);
  if (rows.length) {
    await queryPromise(`UPDATE ${MANAGER_METRICS_TABLE} SET ${indexes.map(index => `${metricColumns[index]} = ?`).join(', ')} WHERE metrics_id = ?`, [...indexes.map(index => normalizeNumber(body[metricBodyKeys[index]])), rows[0].metrics_id], req);
  } else {
    // Hidden/omitted metrics keep their most recently recorded value when a
    // first edit in a new reporting year creates a fresh metrics row.
    const previous = indexes.length === metricBodyKeys.length ? [] : await queryPromise(`SELECT ${metricColumns.join(', ')} FROM ${MANAGER_METRICS_TABLE} WHERE project_id = ? ORDER BY reporting_year DESC, metrics_id DESC LIMIT 1`, [projectId], req);
    const values = metricBodyKeys.map((key, index) => Object.hasOwn(body, key) ? normalizeNumber(body[key]) : previous[0]?.[metricColumns[index]] ?? null);
    await queryPromise(`INSERT INTO ${MANAGER_METRICS_TABLE} (project_id, reporting_year, ${metricColumns.join(', ')}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [projectId, year, ...values], req);
  }
}
async function saveComment(projectId, text, req) {
  const comment = normalizeText(text);
  if (comment === null) return;
  const rows = await queryPromise(`SELECT comment_id FROM ${MANAGER_COMMENTS_TABLE} WHERE project_id = ? ORDER BY created_at DESC, comment_id DESC LIMIT 1`, [projectId], req);
  if (rows.length) await queryPromise(`UPDATE ${MANAGER_COMMENTS_TABLE} SET comment_text = ? WHERE comment_id = ?`, [comment, rows[0].comment_id], req);
  else await queryPromise(`INSERT INTO ${MANAGER_COMMENTS_TABLE} (project_id, comment_text) VALUES (?, ?)`, [projectId, comment], req);
}

// =====================================
// PROJECT CREATE / UPDATE / DELETE
// =====================================
app.post('/api/manager-yearly', authenticateToken, requireEditAccess, async (req, res) => {
  const trace = traceStart('POST /api/manager-yearly', req);
  let transaction;
  try {
    const projectId = normalizeText(req.body.projectId);
    const values = masterValues(req.body);
    if (!projectId || !values[0]) return res.status(400).json({ message: 'Project ID and Project Name are required.' });
    const actualDates = prepareActualDates(req.body);
    const extra = await projectFields.prepareValues(req.body.customFields, req);
    transaction = await projectFields.beginTransaction(req);
    await queryPromise(`
      INSERT INTO ${MANAGER_PROJECTS_TABLE}
        (project_id, project_name, project_status, pillar, site, current_pmo_gate, dtit_involved, ai_type,
         foak_noak, target_g1_date, target_g2_date, target_g3_date, target_closed_date${extra.insertColumns})
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${extra.insertPlaceholders})
    `, [projectId, ...values, ...extra.values], req);
    if (values[4]) await queryPromise(`INSERT INTO ${MANAGER_PHASES_TABLE} (project_id, phase_name, start_date) VALUES (?, ?, CURDATE())`, [projectId, values[4]], req);
    await saveActualDates(projectId, actualDates, req, true);
    await projectFields.auditCreate(projectId, extra, req);
    await transaction.commit();
    traceEnd(trace, { outcome: 'success', project_id: projectId });
    return res.status(201).json({ message: 'Project created successfully.', project_id: projectId });
  } catch (err) {
    traceError(trace, err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Project ID already exists.' });
    if (err.code === 'ER_NO_SUCH_TABLE') return sendProjectFieldError(res, err);
    return sendError(res, err);
  } finally { if (transaction) await transaction.close(); }
});

app.put('/api/manager-yearly/:projectId', authenticateToken, requireEditAccess, async (req, res) => {
  const trace = traceStart('PUT /api/manager-yearly/:projectId', req, { projectId: req.params.projectId });
  let transaction;
  try {
    let projectId = req.params.projectId;
    const currentYear = new Date().getFullYear();
    const actualDates = prepareActualDates(req.body);
    const extra = await projectFields.prepareValues(req.body.customFields, req);
    transaction = await projectFields.beginTransaction(req);
    const rows = await queryPromise(`SELECT project_id FROM ${MANAGER_PROJECTS_TABLE} WHERE project_id = ? FOR UPDATE`, [projectId], req);
    if (!rows.length) return res.status(404).json({ message: 'Project not found.' });
    const newId = normalizeText(req.body.newProjectId);
    if (newId && newId !== projectId) {
      if (req.user.access_right !== 'admin') return res.status(403).json({ message: 'Forbidden: Only Admins can modify the Project ID.' });
      const duplicates = await queryPromise(`SELECT project_id FROM ${MANAGER_PROJECTS_TABLE} WHERE project_id = ?`, [newId], req);
      if (duplicates.length) return res.status(409).json({ message: `The Project ID '${newId}' is already in use by another project.` });
      // All of these session-scoped queries use the transaction's pinned connection.
      await queryPromise('SET FOREIGN_KEY_CHECKS=0', [], req);
      for (const table of [MANAGER_PROJECTS_TABLE, MANAGER_YEARLY_TABLE, MANAGER_METRICS_TABLE, MANAGER_COMMENTS_TABLE, MANAGER_HISTORY_TABLE, MANAGER_PHASES_TABLE]) {
        await queryPromise(`UPDATE ${table} SET project_id = ? WHERE project_id = ?`, [newId, projectId], req);
      }
      await projectFields.renameHistory(projectId, newId, req);
      await queryPromise('SET FOREIGN_KEY_CHECKS=1', [], req);
      projectId = newId;
    }
    const current = await captureProjectHistory(projectId, currentYear, req);
    await saveMasterValues(projectId, req.body, current, req);
    await saveActualDates(projectId, actualDates, req);
    await projectFields.applyValues(projectId, extra, req);
    const dateOnly = actualDates.length > 0 && Object.keys(req.body).every(key =>
      ['projectId', 'newProjectId', ...ACTUAL_DATES.map(field => field.key)].includes(key));
    if (!dateOnly) {
      await saveYearlyValues(projectId, req.body, req);
      await saveMetrics(projectId, currentYear, req.body, req);
      await saveComment(projectId, req.body.comment, req);
    }
    await transaction.commit();
    traceEnd(trace, { outcome: 'success', projectId });
    return res.json({ message: 'Project updated successfully.' });
  } catch (err) {
    traceError(trace, err);
    if (err.code === 'ER_NO_SUCH_TABLE') return sendProjectFieldError(res, err);
    return sendError(res, err);
  } finally { if (transaction) await transaction.close(); }
});

app.delete('/api/manager-yearly/:projectId', authenticateToken, requireAdmin, async (req, res) => {
  const trace = traceStart('DELETE /api/manager-yearly/:projectId', req, { projectId: req.params.projectId });
  let transaction;
  try {
    transaction = await projectFields.beginTransaction(req);
    const rows = await queryPromise(`SELECT project_id FROM ${MANAGER_PROJECTS_TABLE} WHERE project_id = ? FOR UPDATE`, [req.params.projectId], req);
    if (!rows.length) return res.status(404).json({ message: 'Project not found.' });
    for (const table of [MANAGER_YEARLY_TABLE, MANAGER_METRICS_TABLE, MANAGER_COMMENTS_TABLE, MANAGER_HISTORY_TABLE, MANAGER_PHASES_TABLE]) {
      await queryPromise(`DELETE FROM ${table} WHERE project_id = ?`, [req.params.projectId], req);
    }
    await queryPromise(`DELETE FROM ${MANAGER_PROJECTS_TABLE} WHERE project_id = ?`, [req.params.projectId], req);
    // The separate custom-field audit table intentionally retains edit history.
    await transaction.commit();
    traceEnd(trace, { outcome: 'success', projectId: req.params.projectId });
    return res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    traceError(trace, err);
    return sendError(res, err);
  } finally { if (transaction) await transaction.close(); }
});

// =====================================
// MONTHLY SNAPSHOTS
// =====================================
async function captureMonthlySnapshot(snapshotMonth, req = null) {
  await queryPromise(`
    INSERT INTO ${MANAGER_SNAPSHOTS_TABLE}
      (snapshot_month, project_id, project_name, project_status, current_pmo_gate, ${metricColumns.join(', ')})
    SELECT ?, p.project_id, p.project_name, p.project_status, p.current_pmo_gate,
           ${metricColumns.map(column => `m.${column}`).join(', ')}
    FROM ${MANAGER_PROJECTS_TABLE} p
    LEFT JOIN (
      SELECT m1.* FROM ${MANAGER_METRICS_TABLE} m1
      INNER JOIN (SELECT project_id, MAX(reporting_year) AS max_year FROM ${MANAGER_METRICS_TABLE} GROUP BY project_id) latest
        ON m1.project_id = latest.project_id AND m1.reporting_year = latest.max_year
    ) m ON p.project_id = m.project_id
    ON DUPLICATE KEY UPDATE
      project_name = VALUES(project_name), project_status = VALUES(project_status), current_pmo_gate = VALUES(current_pmo_gate),
      ${metricColumns.map(column => `${column} = VALUES(${column})`).join(', ')}
  `, [snapshotMonth], req);
}
app.post('/api/admin/force-snapshot', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const targetMonth = normalizeText(req.body.snapshotMonth) || monthString();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(targetMonth)) return res.status(400).json({ message: 'Snapshot Month must be a valid YYYY-MM value.' });
    await captureMonthlySnapshot(targetMonth, req);
    return res.json({ message: `Snapshot for ${targetMonth} synchronized successfully.` });
  } catch (err) { return sendError(res, err); }
});

// =====================================
// API 404, STATIC BUILD AND SPA FALLBACK
// Keep this section after every API route.
// =====================================
app.use('/api', (req, res) => res.status(404).json({
  message: 'API route not found on this BEM server. Check the frontend API base URL and proxy route.',
  method: req.method,
  path: req.originalUrl.split('?')[0],
  serverVersion: SERVER_VERSION
}));
app.use(express.static(DIST_DIR));
app.get(/^\/(?!api(?:\/|$)).*/, (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(DIST_DIR, 'index.html'), err => {
    if (!err) return;
    if (res.headersSent) return next(err);
    if (err.code === 'ENOENT' || err.status === 404) {
      return res.status(503).json({ message: 'Frontend build is missing. Run npm run build in the frontend project and copy dist into the backend folder.' });
    }
    next(err);
  });
});
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON request body.' });
  console.error('Unhandled request error:', err.code || err.message);
  return res.status(err.status || 500).json({ message: err.status && err.status < 500 ? err.message : 'Unexpected server error. Check the backend trace.' });
});

// =====================================
// STARTUP
// =====================================
function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`BEM server version: ${SERVER_VERSION}`);
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`Verify this version: http://localhost:${PORT}/api/health`);
    console.log(`Add columns as an admin: http://localhost:${PORT}/admin/project-fields`);
    console.log('Vue admin page: AdminDashboard > Project Columns');
    console.log('Shared column visibility: AdminDashboard > Column Visibility');
    void checkProjectFieldStorage();
    void checkColumnVisibilityStorage();
  });
  server.on('error', err => {
    console.error(err.code === 'EADDRINUSE'
      ? `Port ${PORT} is already in use. Stop the existing backend process before starting this server.`
      : `Server failed to start: ${err.code || err.message}`);
    process.exitCode = 1;
    snapshotJob.stop();
    db.end();
  });
  const snapshotJob = cron.schedule('55 23 * * *', async () => {
    const today = new Date(), tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (today.getMonth() === tomorrow.getMonth()) return;
    try {
      await captureMonthlySnapshot(monthString(today));
      console.log(`Project-level snapshot captured for ${monthString(today)}.`);
    } catch (err) { console.error('Failed to capture monthly snapshot:', err.code || err.message); }
  });
  return { server, snapshotJob };
}

// Importing for checks does not open a port or schedule a job.
if (require.main === module) startServer();
module.exports = { app, startServer, checkProjectFieldStorage, checkActualDateStorage, checkColumnVisibilityStorage };
