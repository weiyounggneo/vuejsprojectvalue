'use strict';

// Saved dashboard layout only. This module never changes project data.
const TABLE = 't_manager_visualisation_layout';
const BUILTINS = [
  { value: 'executive_cards', label: 'Overall / gate / Operationalised cards' },
  { value: 'pillar_summary', label: 'Pillar annual-value table' },
  { value: 'yearly_summary', label: 'Yearly cumulative actual / target table' },
  { value: 'cumulative_trend', label: 'Cumulative actual / target trend' },
  { value: 'annual_trend', label: 'Annual actual / target trend' },
  { value: 'kpi_breakdown', label: 'KPI value breakdown' }
];
const GROUPS = [
  ['projectStatus', 'Project Status'], ['pillars', 'Pillars'], ['sites', 'Sites'],
  ['currentPmoGate', 'Current PMO Gate'], ['dtitInvolved', 'DTIT Involved'],
  ['aiAaAType', 'AI / AA / A Type'], ['foakNoak', 'FOAK / NOAK']
].map(([value, label]) => ({ value, label, type: 'text' }));
const METRICS = [
  ['capacityGainValue', 'Capacity Gain Value', 'currency'], ['dlValue', 'DL Value', 'currency'],
  ['idlValue', 'IDL Value', 'currency'], ['yieldValue', 'Yield Value', 'currency'],
  ['qualityValue', 'Quality Value', 'currency'], ['dlEquivalent', 'DL Equivalent', 'number'],
  ['idlFte', 'IDL FTE', 'number'], ['qualityCases', 'Quality Cases', 'number']
].map(([field, label, unit]) => ({ value: `field:${field}`, label: `Total ${label}`, unit }));
const MEASURES = [
  { value: 'count', label: 'Project count', unit: 'count' },
  { value: 'annualSavings', label: 'Current-year annual savings increase', unit: 'currency' },
  { value: 'cumulativeSavings', label: 'Current-year cumulative savings', unit: 'currency' },
  ...METRICS
];
function defaultWidgets() {
  const builtin = (id, title, width) => ({ id, kind: 'builtin', builtin: id, title, width, visible: true, height: 280 });
  const grouped = (id, title, groupBy, measure, width = 3) => ({ id, kind: 'grouped', title, width, visible: true,
    height: 280, chartType: 'pie', groupBy, measure, filterGate: 'ALL', maxCategories: 10, sort: 'valueDesc' });
  return [
    builtin('executive_cards', 'Executive Performance Overview', 12),
    builtin('pillar_summary', 'Pillars ({year} Annual Value)', 6),
    builtin('yearly_summary', 'Cumulative Actual and Target', 6),
    builtin('cumulative_trend', 'Cumulative AI Values', 6),
    builtin('annual_trend', 'Annual AI Value Increase', 6),
    grouped('dtit', 'DTIT Involved', 'dtitInvolved', 'count'),
    grouped('foak', 'FOAK / NOAK', 'foakNoak', 'count'),
    grouped('pillar', 'Pillars ({year} Annual Value)', 'pillars', 'annualSavings'),
    builtin('kpi_breakdown', 'KPI Breakdown', 3)
  ];
}
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function validProjectMeasure(value) {
  return typeof value === 'string' && /^(count|annualSavings|cumulativeSavings|field:[a-zA-Z][a-zA-Z0-9_.]*|aggregate:(average|minimum|maximum|distinct):field:[a-zA-Z][a-zA-Z0-9_.]*)$/.test(value);
}
function settingsObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail(400, `Invalid ${label} settings.`);
}
function normalizeFormat(value) {
  settingsObject(value, ['mode', 'decimals', 'currency', 'percentScale'], 'value format');
  if (!['auto', 'number', 'currency', 'millions', 'currencyMillions', 'percent'].includes(value.mode)
    || !(value.decimals === null || (Number.isInteger(value.decimals) && value.decimals >= 0 && value.decimals <= 4))
    || !['USD', 'SGD', 'EUR', 'GBP', 'JPY', 'MYR'].includes(value.currency)
    || !['whole', 'fraction'].includes(value.percentScale)) fail(400, 'Choose a supported value format, currency and 0 to 4 decimal places.');
  return { mode: value.mode, decimals: value.decimals, currency: value.currency, percentScale: value.percentScale };
}
function normalizeAppearance(value) {
  settingsObject(value, ['palette', 'categoryColors', 'primaryColor'], 'chart colour');
  const hex = color => typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color);
  if (!['original', 'ocean', 'forest', 'warm', 'purple'].includes(value.palette)) fail(400, 'Choose a supported colour palette.');
  const colors = value.categoryColors;
  if (!colors || typeof colors !== 'object' || Array.isArray(colors) || Object.keys(colors).length > 100
    || Object.entries(colors).some(([label, color]) => !label || [...label].length > 255 || !hex(color))) fail(400, 'Use at most 100 category colours with valid hex colours.');
  if (Object.hasOwn(value, 'primaryColor') && !hex(value.primaryColor)) fail(400, 'Choose a valid summary-card colour.');
  return { palette: value.palette, categoryColors: Object.fromEntries(Object.entries(colors)),
    ...(Object.hasOwn(value, 'primaryColor') ? { primaryColor: value.primaryColor } : {}) };
}
function normalizeTable(value, available, title) {
  const keys = ['rowAxis', 'columnAxis', 'measures', 'yearMode', 'startYear', 'endYear', 'sort', 'showTotals', 'hideZeroRows', 'density', 'striped'];
  settingsObject(value, keys, 'table');
  const category = axis => !['year', 'overall', 'measures'].includes(axis);
  const axisValid = axis => typeof axis === 'string' && (!category(axis) ||
    (/^[a-zA-Z][a-zA-Z0-9_.]*$/.test(axis) && (!available || available.groups.some(group => group.value === axis))));
  if (![value.rowAxis, value.columnAxis].every(axisValid) || value.rowAxis === value.columnAxis) fail(400, `Choose different, available row and column axes for '${title}'.`);
  const targets = ['cumulativeTarget', 'annualTarget'];
  if (!Array.isArray(value.measures) || !value.measures.length || value.measures.length > 6 || new Set(value.measures).size !== value.measures.length
    || value.measures.some(measure => typeof measure !== 'string' || (!targets.includes(measure) &&
      (!validProjectMeasure(measure) || (available && !available.measures.some(item => item.value === measure)))))) fail(400, `Choose 1 to 6 available table values for '${title}', each only once.`);
  if (value.measures.some(measure => targets.includes(measure)) && [value.rowAxis, value.columnAxis].some(category)) fail(400, 'Site targets cannot be split into project categories. Choose year or overall axes.');
  if (!['current', 'range'].includes(value.yearMode) || ![value.startYear, value.endYear].every(year => Number.isInteger(year) && year >= 2000 && year <= 2100)
    || value.startYear > value.endYear || value.endYear - value.startYear > 29) fail(400, 'Choose a year range from 2000 to 2100 with at most 30 years.');
  if (!['label', 'valueDesc'].includes(value.sort) || !['comfortable', 'compact'].includes(value.density)
    || [value.showTotals, value.hideZeroRows, value.striped].some(item => typeof item !== 'boolean')) fail(400, 'Choose valid table sorting and display settings.');
  return Object.fromEntries(keys.map(key => [key, key === 'measures' ? [...value[key]] : value[key]]));
}
function normalizeFilters(filters, available, title) {
  if (!Array.isArray(filters) || filters.length > 10) fail(400, 'Use at most 10 filters per visualisation.');
  const fields = new Set();
  return filters.map(rule => {
    settingsObject(rule, ['field', 'operator', 'values'], 'chart filter');
    if (typeof rule.field !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_.]*$/.test(rule.field) || fields.has(rule.field)) fail(400, 'Choose each chart filter field only once.');
    fields.add(rule.field);
    if (available && !available.groups.some(g => g.value === rule.field)) fail(400, `Filter field for '${title}' is no longer available. Edit or remove this filter.`);
    if (!['in', 'notIn'].includes(rule.operator) || !Array.isArray(rule.values) || !rule.values.length || rule.values.length > 100
      || rule.values.some(value => typeof value !== 'string' || [...value].length > 512)) fail(400, 'Choose Include or Exclude and 1 to 100 values for each chart filter.');
    const values = rule.values.map(value => value.trim());
    if (new Set(values).size !== values.length) fail(400, 'Choose each filter value only once.');
    return { field: rule.field, operator: rule.operator, values };
  });
}
function normalizeComparison(value, available = null) {
  const keys = ['xAxis', 'barMeasure', 'lineMeasure', 'yearMode', 'startYear', 'endYear', 'sort', 'maxCategories'];
  if (value && Object.hasOwn(value, 'valueMode')) {
    settingsObject(value, ['valueMode', 'yearMode', 'startYear', 'endYear'], 'savings comparison');
    if (!['cumulative', 'annual'].includes(value.valueMode)) fail(400, 'Choose cumulative or annual savings.');
    value = { xAxis: 'year', barMeasure: value.valueMode === 'annual' ? 'annualSavings' : 'cumulativeSavings', lineMeasure: value.valueMode === 'annual' ? 'annualTarget' : 'cumulativeTarget',
      yearMode: value.yearMode, startYear: value.startYear, endYear: value.endYear, sort: 'label', maxCategories: 10 };
  }
  settingsObject(value, keys, 'bar + line');
  const target = measure => ['annualTarget', 'cumulativeTarget'].includes(measure);
  const validMeasure = measure => validProjectMeasure(measure) || target(measure);
  if (!validMeasure(value.barMeasure) || !validMeasure(value.lineMeasure) || target(value.barMeasure) || value.barMeasure === value.lineMeasure) fail(400, 'Choose different numeric bar and line values.');
  if (typeof value.xAxis !== 'string' || (value.xAxis !== 'year' && (!/^[a-zA-Z][a-zA-Z0-9_.]*$/.test(value.xAxis) || (available && !available.groups.some(group => group.value === value.xAxis))))) fail(400, 'Choose Year or an available project category for the X-axis.');
  if (target(value.lineMeasure) && value.xAxis !== 'year') fail(400, 'Site targets require Year on the X-axis. Choose a project column for category comparisons.');
  if (available) {
    const measures = [...available.measures, { value: 'cumulativeTarget', unit: 'currency' }, { value: 'annualTarget', unit: 'currency' }];
    const bar = measures.find(measure => measure.value === value.barMeasure), line = measures.find(measure => measure.value === value.lineMeasure);
    if (!bar || !line) fail(400, 'A selected bar or line value is unavailable. Choose another numeric column.');
    const custom = measure => measure.unit === 'number' && measure.value.includes('field:customFields.');
    if (!(bar.unit === line.unit || custom(bar) || custom(line))) fail(400, 'Both series share one scale. Choose values with matching units.');
  }
  if (!['tracking', 'range'].includes(value.yearMode) || ![value.startYear, value.endYear].every(year => Number.isInteger(year) && year >= 2000 && year <= 2100)
    || value.startYear > value.endYear || value.endYear - value.startYear > 29) fail(400, 'Choose years from 2000 to 2100, with at most 30 years.');
  if (!['label', 'valueDesc'].includes(value.sort) || !Number.isInteger(value.maxCategories) || value.maxCategories < 3 || value.maxCategories > 20) fail(400, 'Choose a category limit from 3 to 20 and a supported sort order.');
  return Object.fromEntries(keys.map(key => [key, value[key]]));
}
function catalog(customFields = []) {
  const numeric = [...MEASURES, ...customFields.filter(f => f.type === 'number').map(f => ({
    value: `field:customFields.${f.columnName}`, label: `Total ${f.label}`, unit: 'number'
  }))];
  const aggregated = numeric.filter(measure => measure.value.startsWith('field:')).flatMap(measure =>
    [['average', 'Average'], ['minimum', 'Minimum'], ['maximum', 'Maximum'], ['distinct', 'Distinct Count']].map(([operation, label]) => ({
      value: `aggregate:${operation}:${measure.value}`, label: `${label} ${measure.label.replace(/^Total /, '')}`,
      unit: operation === 'distinct' ? 'count' : measure.unit
    })));
  return {
    builtins: BUILTINS,
    groups: [...GROUPS, ...customFields.filter(f => ['text', 'boolean', 'date'].includes(f.type)).map(f => ({
      value: `customFields.${f.columnName}`, label: f.label, type: f.type, category: f.configCategory || null
    }))],
    measures: [...numeric, ...aggregated]
  };
}
function normalizeWidgets(widgets, available = null) {
  if (!Array.isArray(widgets) || widgets.length > 30) fail(400, 'Use a widgets array with at most 30 items.');
  const ids = new Set();
  return widgets.map(w => {
    if (!w || typeof w !== 'object' || Array.isArray(w)) fail(400, 'Invalid visualisation item.');
    if (typeof w.id !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/.test(w.id) || ids.has(w.id)) fail(400, 'Each visualisation needs a unique ID.');
    ids.add(w.id);
    if (typeof w.title !== 'string' || !w.title.trim() || [...w.title.trim()].length > 100) fail(400, 'Titles must contain 1 to 100 characters.');
    if (![3, 4, 6, 12].includes(w.width) || ![240, 280, 360, 440].includes(w.height) || typeof w.visible !== 'boolean') fail(400, 'Invalid visualisation size or visibility.');
    const base = { id: w.id, kind: w.kind, title: w.title.trim(), width: w.width, visible: w.visible, height: w.height };
    let keys;
    if (w.kind === 'builtin') {
      keys = ['builtin'];
      if (!BUILTINS.some(b => b.value === w.builtin)) fail(400, 'Unknown standard visualisation.');
      base.builtin = w.builtin;
      if (Object.hasOwn(w, 'chartType')) {
        const original = ['cumulative_trend', 'annual_trend'].includes(w.builtin) ? 'line' : w.builtin === 'kpi_breakdown' ? 'pie' : null;
        const types = original === 'line' ? ['line', 'area', 'column', 'table'] : ['pie', 'table'];
        if (!original || !types.includes(w.chartType)) fail(400, 'Choose a supported chart or table for this standard item.');
        keys.push('chartType');
        base.chartType = w.chartType;
      }
    } else if (['grouped', 'metric'].includes(w.kind)) {
      keys = ['measure', 'filterGate'];
      if (!validProjectMeasure(w.measure)) fail(400, 'Invalid measure.');
      if (!(w.chartType === 'combo' || (w.chartType === 'table' && w.table)) && available && !available.measures.some(m => m.value === w.measure)) fail(400, `Measure for '${base.title}' is no longer available. Edit or remove this visualisation.`);
      if (!['ALL', 'G1', 'G2', 'G3', 'Closure'].includes(w.filterGate)) fail(400, 'Invalid PMO gate filter.');
      Object.assign(base, { measure: w.measure, filterGate: w.filterGate });
      if (w.kind === 'grouped') {
        keys.push('chartType', 'groupBy', 'maxCategories', 'sort');
        if (!['pie', 'donut', 'bar', 'column', 'treemap', 'combo', 'table'].includes(w.chartType)) fail(400, 'Choose pie, doughnut, bar, column, treemap, bar + target line or table.');
        const groupBy = w.groupBy == null ? '' : w.groupBy;
        if (typeof groupBy !== 'string' || (groupBy !== '' && !/^[a-zA-Z][a-zA-Z0-9_.]*$/.test(groupBy))) fail(400, 'Invalid grouping field.');
        if (!(w.chartType === 'combo' || (w.chartType === 'table' && w.table)) && groupBy && available && !available.groups.some(g => g.value === groupBy)) fail(400, `Grouping field for '${base.title}' is no longer available. Edit or remove this visualisation.`);
        if (!Number.isInteger(w.maxCategories) || w.maxCategories < 3 || w.maxCategories > 20 || !['valueDesc', 'label'].includes(w.sort)) fail(400, 'Invalid category limit or sorting.');
        Object.assign(base, { chartType: w.chartType, groupBy, maxCategories: w.maxCategories, sort: w.sort });
      }
    } else fail(400, 'Unknown visualisation type.');
    if (Object.hasOwn(w, 'format')) base.format = normalizeFormat(w.format);
    if (Object.hasOwn(w, 'appearance')) base.appearance = normalizeAppearance(w.appearance);
    if (Object.hasOwn(w, 'filters')) base.filters = normalizeFilters(w.filters, available, base.title);
    if (Object.hasOwn(w, 'comparison')) {
      if (w.kind !== 'grouped') fail(400, 'Savings comparison settings belong to a configurable chart.');
      base.comparison = normalizeComparison(w.comparison, available);
    }
    if (Object.hasOwn(w, 'display')) {
      if (!(w.kind === 'grouped' || (w.kind === 'builtin' && ['cumulative_trend', 'annual_trend', 'kpi_breakdown'].includes(w.builtin)))) fail(400, 'This item does not support chart display settings.');
      settingsObject(w.display, ['showValues', 'showLegend', 'smoothLines'], 'chart display');
      if (['showValues', 'showLegend', 'smoothLines'].some(key => typeof w.display[key] !== 'boolean')) fail(400, 'Choose valid chart label, legend and line settings.');
      base.display = { showValues: w.display.showValues, showLegend: w.display.showLegend, smoothLines: w.display.smoothLines };
    }
    if (Object.hasOwn(w, 'table')) {
      if (!(w.kind === 'grouped' || (w.kind === 'builtin' && ['pillar_summary', 'yearly_summary', 'cumulative_trend', 'annual_trend', 'kpi_breakdown'].includes(w.builtin)))) fail(400, 'This visualisation does not support table settings.');
      base.table = normalizeTable(w.table, available, base.title);
    }
    const allowed = new Set(['id', 'kind', 'title', 'width', 'visible', 'height', 'format', 'appearance', 'filters', 'table', 'display', 'comparison', ...keys]);
    if (Object.keys(w).some(key => !allowed.has(key))) fail(400, 'Unexpected visualisation settings.');
    return base;
  });
}
function defaultGlobalFilters() { return [{ field: 'sites', label: 'Site', display: 'buttons' }]; }
function normalizeGlobalFilters(filters, available = null) {
  if (!Array.isArray(filters) || filters.length > 10) fail(400, 'Use at most 10 global category filters.');
  const fields = new Set();
  return filters.map(filter => {
    settingsObject(filter, ['field', 'label', 'display'], 'global filter');
    if (typeof filter.field !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_.]*$/.test(filter.field) || fields.has(filter.field)) fail(400, 'Choose each global filter category only once.');
    fields.add(filter.field);
    if (available && !available.groups.some(group => group.value === filter.field)) fail(400, 'A global filter category is unavailable. Choose another category or remove the filter.');
    if (typeof filter.label !== 'string' || !filter.label.trim() || [...filter.label.trim()].length > 60) fail(400, 'Each global filter needs a label with 1 to 60 characters.');
    if (!['buttons', 'dropdown'].includes(filter.display)) fail(400, 'Choose buttons or a dropdown for each global filter.');
    return { field: filter.field, label: filter.label.trim(), display: filter.display };
  });
}
function createPortfolioLayout({ queryPromise, projectFields, getCurrentUser }) {
  const storage = { checked: false, ready: false, message: 'Visualisation layout has not been checked yet.' };
  const setupMessage = 'Visualisation layout needs database setup. Run 005_visualisation_layout.sql in BEM_DB_NAME, then refresh.';
  async function read(req) {
    let rows;
    try {
      rows = await queryPromise(`SELECT layout_json, revision, updated_by, DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at FROM ${TABLE} WHERE setting_id = 1`, [], req);
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE') fail(503, setupMessage);
      throw err;
    }
    if (!rows.length) fail(503, setupMessage);
    const row = rows[0];
    let widgets, globalFilters;
    try {
      const stored = row.layout_json == null ? null : typeof row.layout_json === 'string' ? JSON.parse(row.layout_json) : row.layout_json;
      if (stored === null) { widgets = defaultWidgets(); globalFilters = defaultGlobalFilters(); }
      else if (Array.isArray(stored)) { widgets = normalizeWidgets(stored); globalFilters = defaultGlobalFilters(); }
      else {
        settingsObject(stored, ['widgets', 'globalFilters'], 'saved layout');
        widgets = normalizeWidgets(stored.widgets);
        globalFilters = normalizeGlobalFilters(stored.globalFilters);
      }
      if (!Number.isSafeInteger(Number(row.revision)) || Number(row.revision) < 0) throw new Error('Invalid revision');
    } catch { fail(503, 'The saved visualisation layout is invalid. Check t_manager_visualisation_layout.'); }
    return { widgets, globalFilters, revision: Number(row.revision), updatedBy: row.updated_by, updatedAt: row.updated_at };
  }
  async function readWithCatalog(req) {
    const settings = await read(req);
    return { ...settings, guidedMetricsEnabled: true, globalFiltersEnabled: true, presentationEnabled: true, chartFiltersEnabled: true, optionalGroupingEnabled: true, tableChartsEnabled: true, tableConfigurationEnabled: true, enhancedChartsEnabled: true, comparisonChartsEnabled: true, flexibleComparisonEnabled: true,
      catalog: catalog(await projectFields.listReady(req)), defaults: defaultWidgets() };
  }
  async function save(body, req) {
    if (!body || Object.keys(body).some(k => !['widgets', 'globalFilters', 'revision'].includes(k)) || !Number.isSafeInteger(body.revision) || body.revision < 0) fail(400, 'Send widgets and the current revision number.');
    const current = await read(req);
    const available = catalog(await projectFields.listReady(req));
    const widgets = normalizeWidgets(body.widgets, available);
    // Older clients may save widgets only; keep the published filter controls.
    const globalFilters = Object.hasOwn(body, 'globalFilters') ? normalizeGlobalFilters(body.globalFilters, available) : current.globalFilters;
    const result = await queryPromise(`UPDATE ${TABLE} SET layout_json = ?, revision = revision + 1, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_id = 1 AND revision = ?`, [JSON.stringify({ widgets, globalFilters }), getCurrentUser(req), body.revision], req);
    if (!result.affectedRows) fail(409, 'Another admin changed this layout. Refresh the tab before saving again.');
    return { message: 'Visualisation layout saved for all users.', widgets, globalFilters, revision: body.revision + 1, updatedBy: getCurrentUser(req) };
  }
  async function checkStorage() {
    try { await read(); Object.assign(storage, { checked: true, ready: true, message: 'Visualisation layout is readable.' }); }
    catch (err) { Object.assign(storage, { checked: true, ready: false, message: err.status ? err.message : 'Visualisation layout cannot be read. Check database permissions.' }); }
    return storage;
  }
  function registerRoutes(app, { authenticateToken, requireAccess, requireAdmin, sendError }) {
    app.get('/api/manager-visualisation-layout', authenticateToken, requireAccess, async (req, res) => {
      try { return res.json(await readWithCatalog(req)); } catch (err) { return sendError(res, err); }
    });
    app.get('/api/admin/visualisation-layout', authenticateToken, requireAdmin, async (req, res) => {
      try { return res.json(await readWithCatalog(req)); } catch (err) { return sendError(res, err); }
    });
    app.put('/api/admin/visualisation-layout', authenticateToken, requireAdmin, async (req, res) => {
      try { return res.json(await save(req.body, req)); } catch (err) { return sendError(res, err); }
    });
  }
  return { storage, read, readWithCatalog, save, checkStorage, registerRoutes };
}
module.exports = { createPortfolioLayout, defaultWidgets, normalizeWidgets, defaultGlobalFilters, normalizeGlobalFilters, catalog };
