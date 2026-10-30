import { metricDefinition } from './metricDefinitions';
// Used by both the admin preview and the published portfolio charts.
export function portfolioRows(rows) {
  return rows.filter(row => {
    const status = String(row.projectStatus ?? row.project_status ?? '').trim().toLowerCase().replace(/[\s_\-\u2010-\u2015]+/g, '');
    return !['onhold', 'cancelled', 'canceled'].includes(status);
  });
}

export function fieldValue(row, key) {
  if (key.startsWith('customFields.')) return row.customFields?.[key.slice(13)];
  return row[key];
}
export function numericValue(value) {
  if (value == null || String(value).trim() === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
export function annualValue(row, year) {
  const entry = row[`year${year}`];
  if (entry == null || String(entry).trim() === '' || !Number.isFinite(Number(entry))) return 0;
  return numericValue(entry) - numericValue(row[`year${year - 1}`]);
}
export function measureValue(row, measure, year) {
  if (measure.startsWith('aggregate:')) return numericValue(metricSample(row, measure, year));
  if (measure === 'count') return 1;
  if (measure === 'cumulativeSavings') return numericValue(row[`year${year}`]);
  if (measure === 'annualSavings') return annualValue(row, year);
  if (measure.startsWith('field:')) return numericValue(fieldValue(row, measure.slice(6)));
  return 0;
}
export function metricSample(row, measure, year) {
  const definition = metricDefinition(measure);
  if (definition.operation === 'count') return 1;
  if (definition.source?.startsWith('field:')) {
    const raw = fieldValue(row, definition.source.slice(6));
    if (raw == null || typeof raw === 'boolean' || String(raw).trim() === '' || !Number.isFinite(Number(raw))) return null;
    return Number(raw);
  }
  return measureValue(row, definition.source, year);
}
export function aggregateMeasure(rows, measure, year) {
  const { operation } = metricDefinition(measure);
  if (operation === 'count') return rows.length;
  if (operation === 'sum') return rows.reduce((sum, row) => sum + measureValue(row, measure, year), 0);
  const values = rows.map(row => metricSample(row, measure, year)).filter(value => value !== null);
  if (!values.length) return 0;
  if (operation === 'distinct') return new Set(values).size;
  if (operation === 'average') return values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((result, value) => operation === 'minimum' ? Math.min(result, value) : Math.max(result, value), values[0]);
}
export function gateRows(rows, gate) {
  if (!gate || gate === 'ALL') return rows;
  return rows.filter(row => {
    const value = String(row.currentPmoGate || '').trim().toUpperCase();
    return value === gate.toUpperCase() || (gate === 'G2' && value === 'G2.5');
  });
}
export function categoryLabel(value, type) {
  if (value == null || String(value).trim() === '') return 'Unassigned';
  if (type === 'boolean') {
    if ([true, 1, '1'].includes(value)) return 'Yes';
    if ([false, 0, '0'].includes(value)) return 'No';
  }
  return String(value).trim();
}
export function filterValue(value, type) {
  return value == null || String(value).trim() === '' ? '' : categoryLabel(value, type);
}
export function filterError(widget, catalog) {
  if (widget.filters === undefined) return '';
  if (!Array.isArray(widget.filters) || widget.filters.length > 10) return 'Use at most 10 filters for this visualisation.';
  const fields = new Set();
  for (const rule of widget.filters) {
    if (!rule || !catalog?.groups?.some(group => group.value === rule.field)) return 'A filter column is unavailable. Ask an admin to edit or remove this filter.';
    if (fields.has(rule.field)) return 'Choose each filter field only once.';
    fields.add(rule.field);
    if (!['in', 'notIn'].includes(rule.operator) || !Array.isArray(rule.values) || !rule.values.length || rule.values.length > 100
      || rule.values.some(value => typeof value !== 'string' || [...value].length > 512)) return 'Choose Include or Exclude and at least one value for each chart filter.';
    if (new Set(rule.values.map(value => value.trim())).size !== rule.values.length) return 'Choose each filter value only once.';
  }
  return '';
}
export function matchesFilter(row, rule, group) {
  const normalize = value => {
    const text = String(value).trim();
    return rule.field === 'projectStatus' ? text.toLowerCase()
      : ['sites', 'currentPmoGate'].includes(rule.field) ? text.toUpperCase() : text;
  };
  const values = rule.values.map(normalize);
  let match;
  if (rule.field === 'sites') {
    const sites = String(fieldValue(row, rule.field) || '').split(',').map(normalize).filter(Boolean);
    match = sites.length ? sites.some(site => values.includes(site)) || (sites.includes('ALL') && values.some(value => value && value !== 'ALL')) : values.includes('');
  } else {
    const value = normalize(filterValue(fieldValue(row, rule.field), group.type));
    match = values.includes(value) || (rule.field === 'currentPmoGate' && value === 'G2.5' && values.includes('G2'));
  }
  return rule.operator === 'notIn' ? !match : match;
}
export function widgetSelection(widget, rows, catalog) {
  const error = filterError(widget, catalog);
  if (error) return { rows: [], error };
  let selected = gateRows(portfolioRows(rows), widget.filterGate);
  for (const rule of widget.filters || []) {
    const group = catalog.groups.find(g => g.value === rule.field);
    selected = selected.filter(row => matchesFilter(row, rule, group));
  }
  return { rows: selected, error: '' };
}
export function filterOptions(field, rows, catalog, saved = []) {
  const group = catalog?.groups?.find(g => g.value === field);
  const values = new Set(saved);
  if (group) portfolioRows(rows).forEach(row => {
    if (field === 'sites') {
      const sites = String(fieldValue(row, field) || '').split(',').map(value => value.trim().toUpperCase()).filter(Boolean);
      if (!sites.length) values.add('');
      // ALL projects participate in any selected site. Clear the filter for all sites.
      sites.filter(site => site !== 'ALL').forEach(site => values.add(site));
    } else values.add(filterValue(fieldValue(row, field), group.type));
  });
  return [...values].sort((a, b) => a.localeCompare(b)).map(value => ({ value, label: value || '(Unassigned)' }));
}
export function filterDescription(widget, catalog) {
  const parts = (widget.filters || []).map(rule => {
    const field = catalog?.groups?.find(g => g.value === rule.field)?.label || 'Unavailable column';
    const values = rule.values?.map(value => value || '(Unassigned)').join(', ') || 'Choose values';
    return `${field}: ${rule.operator === 'notIn' ? 'exclude' : 'include'} ${values}`;
  });
  if (widget.filterGate && widget.filterGate !== 'ALL') parts.unshift(`PMO gate: ${widget.filterGate}${widget.filterGate === 'G2' ? ' (includes G2.5)' : ''}`);
  return parts.join(' · ');
}
export function widgetData(widget, rows, year, catalog) {
  const measure = catalog?.measures?.find(m => m.value === widget.measure);
  if (!measure) return { error: 'This measure is unavailable. Ask an admin to edit this visualisation.' };
  const selection = widgetSelection(widget, rows, catalog);
  if (selection.error) return { error: selection.error };
  const filtered = selection.rows;
  const total = aggregateMeasure(filtered, widget.measure, year);
  if (widget.kind === 'metric') return { total, count: filtered.length, unit: measure.unit, measureLabel: measure.label };
  if (!widget.groupBy) return { entries: filtered.length ? [{ label: 'Overall total', value: total }] : [], total,
    count: filtered.length, hasNegative: total < 0, combined: false, unit: measure.unit, measureLabel: measure.label, groupLabel: 'Overall total' };
  const group = catalog?.groups?.find(g => g.value === widget.groupBy);
  if (!group) return { error: 'This grouping column is unavailable. Ask an admin to edit this visualisation.' };
  const map = new Map();
  filtered.forEach(row => {
    const label = categoryLabel(fieldValue(row, widget.groupBy), group.type);
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(row);
  });
  let entries = [...map].map(([label, projects]) => ({ label, value: aggregateMeasure(projects, widget.measure, year), categories: [label] }));
  const hasNegative = entries.some(e => e.value < 0);
  const originalCategoryOrder = ['dtitInvolved', 'foakNoak', 'pillars'].includes(widget.groupBy);
  entries.sort((a, b) => widget.sort === 'label' ? a.label.localeCompare(b.label)
    : b.value - a.value || (originalCategoryOrder ? 0 : a.label.localeCompare(b.label)));
  let combined = false;
  if (widget.chartType !== 'table' && entries.length > widget.maxCategories) {
    const rest = entries.slice(widget.maxCategories - 1);
    let label = 'Other (remaining categories)';
    while (map.has(label)) label += '*';
    const categories = rest.flatMap(entry => entry.categories);
    entries = [...entries.slice(0, widget.maxCategories - 1), { label, categories,
      value: aggregateMeasure(categories.flatMap(category => map.get(category)), widget.measure, year) }];
    combined = true;
  }
  return { entries, total, count: filtered.length, hasNegative, combined, unit: measure.unit,
    measureLabel: measure.label, groupLabel: group.label };
}
export function displayValue(value, unit) {
  const n = numericValue(value);
  if (unit === 'currency') return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  return n.toLocaleString('en-US', { maximumFractionDigits: unit === 'count' ? 0 : 4 });
}
export function escapedLabel(value) {
  return String(value).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}
export function widgetTitle(widget, year) { return widget.title.replace(/\{year\}/g, String(year)); }
