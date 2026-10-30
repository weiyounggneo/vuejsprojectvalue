'use strict';

const crypto = require('node:crypto');

const TYPES = Object.freeze({
  text: 'VARCHAR(255)',
  url: 'VARCHAR(2048)',
  number: 'DECIMAL(18,4)',
  date: 'DATE',
  boolean: 'TINYINT(1)'
});
const RESERVED = new Set([
  'project_id', 'project_name', 'project_status', 'pillar', 'site',
  'current_pmo_gate', 'dtit_involved', 'ai_type', 'foak_noak',
  'target_g1_date', 'target_g2_date', 'target_g3_date', 'target_closed_date',
  'constructor', 'prototype', '__proto__'
]);
const FORM_SECTIONS = ['details', 'values', 'kpis', 'milestones'];
const legacyFormSection = field => field.formSection ?? (field.type === 'number' ? 'values' : 'details');

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

function definition(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    fail(400, 'A field definition is required.');
  }
  if (Object.keys(body).some(key => !['columnName', 'label', 'type', 'inputMode', 'configCategory', 'formSection'].includes(key))) {
    fail(400, 'Only columnName, label, type, inputMode, configCategory, and formSection are accepted.');
  }
  const { columnName, type } = body;
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (typeof columnName !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(columnName)) {
    fail(400, 'Column name must start with a lowercase letter and contain only lowercase letters, digits, and underscores (maximum 64 characters).');
  }
  if (RESERVED.has(columnName)) fail(409, 'This name is reserved for an existing project field.');
  if (!label || [...label].length > 120) fail(400, 'Label must contain 1 to 120 characters.');
  if (!Object.hasOwn(TYPES, type)) fail(400, 'Type must be text, URL, number, date, or boolean.');
  const inputMode = body.inputMode === undefined ? 'free' : body.inputMode;
  if (!['free', 'dropdown'].includes(inputMode)) fail(400, 'Input mode must be free or dropdown.');
  if (inputMode === 'dropdown' && type !== 'text') fail(400, 'Dropdowns are supported for text columns.');
  const configCategory = inputMode === 'dropdown' && typeof body.configCategory === 'string' ? body.configCategory.trim() : null;
  if (inputMode === 'dropdown' && (!configCategory || [...configCategory].length > 64 || ['constructor', 'prototype', '__proto__'].includes(configCategory))) {
    fail(400, 'Choose a master data category with 1 to 64 characters.');
  }
  const formSection = body.formSection === undefined ? 'details' : body.formSection;
  if (!FORM_SECTIONS.includes(formSection)) fail(400, 'Choose Project Details, Yearly Data, KPIs, or Timeline Milestones.');
  return { columnName, label, type, inputMode, configCategory, formSection };
}

function projectUrl(value) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if ([...text].length > 2048 || !/^https?:\/\//i.test(text) || /[\s\\]/u.test(text)) return '';
  if ([...text].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return '';
  try {
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

function normalizeValue(type, value, name) {
  if (value === null || (typeof value === 'string' && value.trim() === '')) return null;
  if (type === 'url') {
    if (!projectUrl(value)) fail(400, `${name} must be a full http:// or https:// URL with at most 2048 characters.`);
    return value.trim();
  }
  if (type === 'text') {
    if (typeof value !== 'string' || [...value].length > 255) fail(400, `${name} must be text with at most 255 characters.`);
    return value.trim();
  }
  if (type === 'number') {
    if (!['string', 'number'].includes(typeof value) || !/^-?\d{1,14}(?:\.\d{1,4})?$/.test(String(value).trim())) {
      fail(400, `${name} must be a decimal with at most 14 integer digits and 4 decimal places.`);
    }
    // Keep DECIMAL values as strings: Number can lose precision at this size.
    return String(value).trim();
  }
  if (type === 'boolean') {
    if (![true, false, 0, 1].includes(value)) fail(400, `${name} must be true, false, or null.`);
    return value === true || value === 1 ? 1 : 0;
  }
  if (type === 'date') {
    if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) fail(400, `${name} must be a date in YYYY-MM-DD format.`);
    const [year, month, day] = value.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) fail(400, `${name} is not a valid calendar date.`);
    return value;
  }
  fail(503, 'The field registry contains an unsupported type.');
}

function readValue(field, value) {
  if (value == null) return null;
  if (field.type === 'boolean') return Number(value) === 1;
  if (field.type === 'number') return String(value);
  if (field.type === 'date' && value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  if (field.type === 'date') return String(value).slice(0, 10);
  return value;
}

function columnMatches(field, col) {
  if (!col || col.IS_NULLABLE !== 'YES' || col.COLUMN_DEFAULT != null && col.COLUMN_DEFAULT !== 'NULL' || col.EXTRA) return false;
  if (field.type === 'text') return col.DATA_TYPE === 'varchar' && Number(col.CHARACTER_MAXIMUM_LENGTH) === 255;
  if (field.type === 'url') return col.DATA_TYPE === 'varchar' && Number(col.CHARACTER_MAXIMUM_LENGTH) === 2048;
  if (field.type === 'number') return col.DATA_TYPE === 'decimal' && Number(col.NUMERIC_PRECISION) === 18 && Number(col.NUMERIC_SCALE) === 4 && !/unsigned/i.test(col.COLUMN_TYPE || '');
  if (field.type === 'date') return col.DATA_TYPE === 'date';
  return field.type === 'boolean' && col.DATA_TYPE === 'tinyint' && !/unsigned/i.test(col.COLUMN_TYPE || '');
}

function createProjectFields({ db, queryPromise: q, escapeId, table, accessTable, configTable = 't_app_config', getCurrentUser, transactionTables }) {
  const FIELDS = 't_manager_project_fields';
  const AUDIT = 't_manager_project_field_history';
  const sqlTable = escapeId(table);

  async function columns(req, name) {
    return q(`SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA,
      CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE
      FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ${name ? 'AND COLUMN_NAME = ?' : ''}`, name ? [table, name] : [table], req);
  }

  async function listReady(req) {
    const rows = await q(`SELECT column_name AS columnName, label, field_type AS type,
      input_mode AS inputMode, config_category AS configCategory, form_section AS formSection
      FROM ${FIELDS} WHERE state = 'ready' ORDER BY display_order, column_name${req?._dbConnection ? ' FOR UPDATE' : ''}`, [], req);
    if (!rows.length) return rows;
    const schema = new Map((await columns(req)).map(col => [col.COLUMN_NAME, col]));
    for (const field of rows) {
      definition({ ...field, formSection: legacyFormSection(field) });
      if (!columnMatches(field, schema.get(field.columnName))) fail(503, `Project field '${field.columnName}' needs schema repair.`);
    }
    return withOptions(rows.map(field => ({ ...definition({ ...field, formSection: legacyFormSection(field) }), nullable: true })), req);
  }

  async function withOptions(fields, req) {
    const categories = [...new Set(fields.filter(field => field.inputMode === 'dropdown').map(field => field.configCategory))];
    if (!categories.length) return fields.map(field => ({ ...field, options: [] }));
    const rows = await q(`SELECT category, value FROM ${escapeId(configTable)} WHERE is_active = 1
      AND category IN (${categories.map(() => '?').join(', ')}) ORDER BY category, value`, categories, req);
    return fields.map(field => ({ ...field, options: [...new Set(rows.filter(row => row.category === field.configCategory).map(row => row.value))] }));
  }

  async function listAdmin(req) {
    const rows = await q(`SELECT column_name AS columnName, label, field_type AS type, state,
      input_mode AS inputMode, config_category AS configCategory, form_section AS formSection,
      last_error AS lastError, created_by AS createdBy, created_at AS createdAt
      FROM ${FIELDS} ORDER BY created_at, column_name`, [], req);
    return withOptions(rows.map(row => ({ ...row, inputMode: row.inputMode || 'free', configCategory: row.configCategory || null, formSection: legacyFormSection(row) })), req);
  }

  async function linkedCategories(req) {
    return q(`SELECT DISTINCT config_category AS category FROM ${FIELDS}
      WHERE input_mode = 'dropdown' AND config_category IS NOT NULL ORDER BY config_category`, [], req);
  }

  function fieldValue(field, value) {
    const normalized = normalizeValue(field.type, value, field.columnName);
    if (field.inputMode === 'dropdown' && normalized !== null && !field.options.includes(normalized)) {
      fail(400, `${field.label}: choose an active option from Master Data Configuration (${field.configCategory}), or leave it blank.`);
    }
    return normalized;
  }

  async function validatePrepared(prepared, req) {
    if (!prepared.fields.length) return;
    const current = new Map((await listReady(req)).map(field => [field.columnName, field]));
    prepared.fields.forEach((field, i) => {
      const latest = current.get(field.columnName);
      if (!latest) fail(409, 'Column settings changed. Refresh Data & Columns and retry.');
      fieldValue(latest, prepared.values[i]);
    });
  }

  function readValues(row, fields) {
    return Object.fromEntries(fields.map(field => [field.columnName, readValue(field, row[field.columnName])]));
  }

  async function prepareValues(input, req) {
    if (input === undefined) return { fields: [], values: [], insertColumns: '', insertPlaceholders: '' };
    if (input === null || typeof input !== 'object' || Array.isArray(input)) fail(400, 'customFields must be an object.');
    const keys = Object.keys(input);
    if (!keys.length) return { fields: [], values: [], insertColumns: '', insertPlaceholders: '' };
    const byName = new Map((await listReady(req)).map(field => [field.columnName, field]));
    const fields = keys.map(key => {
      if (!byName.has(key)) fail(400, `Unknown custom field: ${key}.`);
      return byName.get(key);
    });
    return {
      fields,
      values: fields.map(field => fieldValue(field, input[field.columnName])),
      insertColumns: ', ' + fields.map(field => escapeId(field.columnName)).join(', '),
      insertPlaceholders: ', ' + fields.map(() => '?').join(', ')
    };
  }

  async function beginTransaction(req) {
    if (req._dbConnection) fail(500, 'A request transaction is already active.');
    const tables = [...new Set([...(transactionTables || [table, AUDIT]), FIELDS])];
    const engines = await q(`SELECT TABLE_NAME AS tableName, ENGINE AS engine FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${tables.map(() => '?').join(', ')})`, tables, req);
    const byName = new Map(engines.map(row => [row.tableName, row.engine]));
    if (tables.some(name => byName.get(name) !== 'InnoDB')) fail(503, 'Project edits require all participating tables to use InnoDB. Ask the database owner to check table engines.');
    const connection = await new Promise((resolve, reject) => db.getConnection((err, conn) => err ? reject(err) : resolve(conn)));
    try { await connection.promise().beginTransaction(); } catch (err) { connection.release(); throw err; }
    req._dbConnection = connection;
    let committed = false;
    return {
      async commit() { await connection.promise().commit(); committed = true; },
      async close() {
        let reusable = true;
        try {
          if (!committed) await connection.promise().rollback();
          // The supplied server's ID-change code temporarily disables this.
          await connection.promise().query('SET FOREIGN_KEY_CHECKS=1');
        } catch (err) {
          reusable = false;
          connection.destroy();
          console.error('Could not clean up project transaction:', err.code || err.message);
        } finally {
          delete req._dbConnection;
          if (reusable) connection.release();
        }
      }
    };
  }

  async function audit(projectId, before, after, req) {
    if (!Object.keys(after).length) return;
    await q(`INSERT INTO ${AUDIT} (project_id, before_values, after_values, changed_by)
      VALUES (?, ?, ?, ?)`, [projectId, JSON.stringify(before), JSON.stringify(after), getCurrentUser(req)], req);
  }

  async function auditCreate(projectId, prepared, req) {
    await validatePrepared(prepared, req);
    const fields = prepared.fields;
    const before = Object.fromEntries(fields.map(field => [field.columnName, null]));
    const after = Object.fromEntries(fields.map((field, i) => [field.columnName, readValue(field, prepared.values[i])]));
    await audit(projectId, before, after, req);
  }

  async function applyValues(projectId, prepared, req) {
    if (!prepared.fields.length) return;
    if (!req._dbConnection) fail(500, 'Custom field updates require a request transaction.');
    await validatePrepared(prepared, req);
    const names = prepared.fields.map(field => escapeId(field.columnName));
    const rows = await q(`SELECT ${names.join(', ')} FROM ${sqlTable} WHERE project_id = ? FOR UPDATE`, [projectId], req);
    if (!rows.length) fail(404, 'Project not found.');
    const before = readValues(rows[0], prepared.fields);
    await q(`UPDATE ${sqlTable} SET ${names.map(name => `${name} = ?`).join(', ')} WHERE project_id = ?`, [...prepared.values, projectId], req);
    // Read back stored values to capture MariaDB's DECIMAL formatting accurately.
    const afterRows = await q(`SELECT ${names.join(', ')} FROM ${sqlTable} WHERE project_id = ?`, [projectId], req);
    await audit(projectId, before, readValues(afterRows[0], prepared.fields), req);
  }

  async function verifyLiveRole(req, roles) {
    const rows = await q(`SELECT access_right FROM ${escapeId(accessTable)} WHERE username = ?`, [req.user?.username], req);
    if (!rows.length || !roles.includes(rows[0].access_right)) fail(403, 'Your current account role does not permit this action.');
  }

  async function addField(body, req) {
    const field = definition(body);
    await verifyLiveRole(req, ['admin']);
    const connection = await new Promise((resolve, reject) => db.getConnection((err, conn) => err ? reject(err) : resolve(conn)));
    const ddlReq = Object.create(req);
    ddlReq._dbConnection = connection;
    let lockName, locked = false, reserved = false;
    try {
      const [{ schemaName }] = await q('SELECT DATABASE() AS schemaName', [], ddlReq);
      lockName = 'bem_fields_' + crypto.createHash('sha256').update(schemaName + '.' + table).digest('hex').slice(0, 40);
      const [{ acquired }] = await q('SELECT GET_LOCK(?, 0) AS acquired', [lockName], ddlReq);
      if (Number(acquired) !== 1) fail(409, 'Another column is being created. Please retry shortly.');
      locked = true;
      const rows = await q(`SELECT column_name AS columnName, label, field_type AS type, state,
        input_mode AS inputMode, config_category AS configCategory, form_section AS formSection FROM ${FIELDS} WHERE column_name = ?`, [field.columnName], ddlReq);
      const existing = rows[0];
      let col = (await columns(ddlReq, field.columnName))[0];
      if (existing) {
        if (body.formSection === undefined) field.formSection = legacyFormSection(existing);
        if (existing.type !== field.type || existing.label !== field.label || (existing.inputMode || 'free') !== field.inputMode || (existing.configCategory || null) !== field.configCategory || legacyFormSection(existing) !== field.formSection) fail(409, 'This column is registered with a different definition.');
        if (existing.state === 'ready') {
          if (!columnMatches(field, col)) fail(503, 'This registered column needs schema repair.');
          return { created: false, field: { ...field, nullable: true } };
        }
        reserved = true;
      } else {
        if (col) fail(409, 'A database column with this name already exists. Choose another name.');
        await q(`INSERT INTO ${FIELDS} (column_name, label, field_type, state, created_by, input_mode, config_category, form_section)
          VALUES (?, ?, ?, 'creating', ?, ?, ?, ?)`, [field.columnName, field.label, field.type, getCurrentUser(req), field.inputMode, field.configCategory, field.formSection], ddlReq);
        reserved = true;
      }
      if (!col) {
        // NOWAIT bounds metadata-lock waiting; INSTANT prevents a table rebuild.
        // ALTER TABLE implicitly commits. Keep this outside project transactions.
        await q(`ALTER TABLE ${sqlTable} NOWAIT ADD COLUMN ${escapeId(field.columnName)} ${TYPES[field.type]} NULL DEFAULT NULL, ALGORITHM=INSTANT`, [], ddlReq);
        col = (await columns(ddlReq, field.columnName))[0];
      }
      if (!columnMatches(field, col)) fail(503, 'Column exists but does not match its registered definition.');
      await q(`UPDATE ${FIELDS} SET state = 'ready', last_error = NULL WHERE column_name = ?`, [field.columnName], ddlReq);
      return { created: true, field: { ...field, nullable: true } };
    } catch (err) {
      if (reserved) {
        try { await q(`UPDATE ${FIELDS} SET last_error = ? WHERE column_name = ? AND state = 'creating'`, [String(err.code || err.message).slice(0, 255), field.columnName], ddlReq); } catch (recordErr) { console.error('Could not record field setup failure:', recordErr.code); }
        if (!err.status) {
          err.status = 503;
          err.message = `Column setup is incomplete for '${field.columnName}'. Retry the same name, label, and type after resolving the database error.`;
        }
      }
      throw err;
    } finally {
      let reusable = true;
      if (locked) {
        try { await q('SELECT RELEASE_LOCK(?) AS released', [lockName], ddlReq); }
        catch (err) { reusable = false; connection.destroy(); }
      }
      if (reusable) connection.release();
    }
  }

  async function updateField(columnName, body, req) {
    await verifyLiveRole(req, ['admin']);
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['label', 'inputMode', 'configCategory', 'formSection'].includes(key))) {
      fail(400, 'Send only label, inputMode, configCategory, and formSection.');
    }
    let tx;
    try {
      tx = await beginTransaction(req);
      const rows = await q(`SELECT column_name AS columnName, label, field_type AS type, state,
        input_mode AS inputMode, config_category AS configCategory, form_section AS formSection FROM ${FIELDS} WHERE column_name = ? FOR UPDATE`, [columnName], req);
      const existing = rows[0];
      if (!existing) fail(404, 'Project column not found.');
      if (existing.state !== 'ready') fail(409, 'Finish column setup before editing its settings.');
      const field = definition({ columnName, type: existing.type, label: body.label ?? existing.label,
        inputMode: body.inputMode ?? existing.inputMode ?? 'free', configCategory: body.configCategory === undefined ? existing.configCategory : body.configCategory,
        formSection: body.formSection === undefined ? legacyFormSection(existing) : body.formSection });
      if (!columnMatches(field, (await columns(req, columnName))[0])) fail(503, 'This column needs schema repair.');
      if (field.inputMode === 'dropdown') {
        const [ready] = await withOptions([field], req);
        const values = await q(`SELECT DISTINCT ${escapeId(columnName)} AS value FROM ${sqlTable}
          WHERE ${escapeId(columnName)} IS NOT NULL`, [], req);
        const missing = values.filter(row => row.value !== '' && !ready.options.includes(row.value));
        if (missing.length) fail(409, `Existing project values are missing from ${field.configCategory}. Add them in Master Data Configuration before switching: ${missing.slice(0, 5).map(row => String(row.value)).join(', ')}${missing.length > 5 ? ' …' : ''}`);
      }
      await q(`UPDATE ${FIELDS} SET label = ?, input_mode = ?, config_category = ?, form_section = ? WHERE column_name = ?`, [field.label, field.inputMode, field.configCategory, field.formSection, columnName], req);
      await tx.commit();
      return { ...field, nullable: true };
    } finally { if (tx) await tx.close(); }
  }

  function responseError(res, err) {
    if (err.code === 'ER_BAD_FIELD_ERROR' && /form_section/.test(err.message || '')) {
      return res.status(503).json({ message: 'Project form sections need the database update. Run 006_project_field_sections.sql in the configured BEM database, then retry.' });
    }
    if (!err.status) console.error('Project field API failed:', err.code || err.message);
    return res.status(err.status || 500).json({ message: err.status ? err.message : 'Project field operation failed. Check the server trace.' });
  }

  function registerRoutes(app, { authenticateToken, requireAccess, requireEditAccess, requireAdmin, adminPage }) {
    app.get('/admin/project-fields', (req, res) => res.sendFile(adminPage));
    app.get('/api/manager-project-fields', authenticateToken, requireAccess, async (req, res) => {
      try { return res.json(await listReady(req)); } catch (err) { return responseError(res, err); }
    });
    app.get('/api/admin/project-fields', authenticateToken, requireAdmin, async (req, res) => {
      try {
        await verifyLiveRole(req, ['admin']);
        return res.json(await listAdmin(req));
      } catch (err) { return responseError(res, err); }
    });
    app.post('/api/admin/project-fields', authenticateToken, requireAdmin, async (req, res) => {
      try {
        const result = await addField(req.body, req);
        return res.status(result.created ? 201 : 200).json({ message: result.created ? 'Column created successfully.' : 'Column already exists with this definition.', ...result });
      } catch (err) { return responseError(res, err); }
    });
    app.put('/api/admin/project-fields/:columnName', authenticateToken, requireAdmin, async (req, res) => {
      try { return res.json({ message: 'Column settings updated successfully.', field: await updateField(req.params.columnName, req.body, req) }); }
      catch (err) { return responseError(res, err); }
    });
    app.patch('/api/manager-yearly/:projectId/custom-fields', authenticateToken, requireEditAccess, async (req, res) => {
      let tx;
      try {
        await verifyLiveRole(req, ['user', 'admin']);
        if (!req.body || !Object.hasOwn(req.body, 'customFields') || Object.keys(req.body).some(key => key !== 'customFields')) fail(400, 'Send only a customFields object.');
        const prepared = await prepareValues(req.body.customFields, req);
        tx = await beginTransaction(req);
        const rows = await q(`SELECT project_id FROM ${sqlTable} WHERE project_id = ? FOR UPDATE`, [req.params.projectId], req);
        if (!rows.length) fail(404, 'Project not found.');
        await applyValues(req.params.projectId, prepared, req);
        await tx.commit();
        return res.json({ message: 'Custom project fields updated successfully.' });
      } catch (err) { return responseError(res, err); }
      finally { if (tx) await tx.close(); }
    });
    app.get('/api/manager-yearly/:projectId/custom-fields/history', authenticateToken, requireAccess, async (req, res) => {
      try {
        const rows = await q(`SELECT audit_id, project_id, before_values, after_values, changed_by, changed_at FROM ${AUDIT} WHERE project_id = ? ORDER BY audit_id DESC LIMIT 100`, [req.params.projectId], req);
        return res.json(rows.map(row => ({ ...row, before_values: JSON.parse(row.before_values), after_values: JSON.parse(row.after_values) })));
      } catch (err) { return responseError(res, err); }
    });
  }

  async function renameHistory(oldId, newId, req) {
    await q(`UPDATE ${AUDIT} SET project_id = ? WHERE project_id = ?`, [newId, oldId], req);
  }

  return { listReady, listAdmin, linkedCategories, readValues, prepareValues, beginTransaction, auditCreate, applyValues, addField, updateField, registerRoutes, renameHistory };
}

module.exports = { createProjectFields, definition, normalizeValue, readValue, columnMatches, projectUrl };
