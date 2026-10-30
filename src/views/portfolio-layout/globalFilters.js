import { filterOptions, widgetSelection, matchesFilter } from './aggregation';
import { resolveSiteOptions } from './siteOptions';

export const DEFAULT_GLOBAL_FILTERS = [{ field: 'sites', label: 'Site', display: 'buttons' }];

export function globalFilterError(filters, catalog) {
  if (!Array.isArray(filters) || filters.length > 10) return 'Use at most 10 global category filters.';
  const fields = new Set();
  for (const filter of filters) {
    if (!filter || !catalog?.groups?.some(group => group.value === filter.field)) return 'A global filter category is unavailable. Choose another category or remove the filter.';
    if (fields.has(filter.field)) return 'Choose each global filter category only once.';
    fields.add(filter.field);
    if (typeof filter.label !== 'string' || !filter.label.trim() || [...filter.label.trim()].length > 60) return 'Each global filter needs a label with 1 to 60 characters.';
    if (!['buttons', 'dropdown'].includes(filter.display)) return 'Choose buttons or a dropdown for each global filter.';
  }
  return '';
}

export function globalFilterOptions(filter, rows, catalog, targets = [], masterSites = []) {
  const options = filterOptions(filter.field, rows, catalog);
  if (filter.field !== 'sites') return options;
  const values = new Map(options.filter(option => option.value === '').map(option => [option.value, option]));
  resolveSiteOptions({ masterSites, rows, targets }).forEach(site => values.set(site.value, { value: site.value, label: site.label }));
  return [...values.values()].sort((a, b) => a.label.localeCompare(b.label));
}

// Active values belong to this viewer only. Saved controls never store a value.
export function cleanGlobalValues(filters, values, rows, catalog, targets = [], masterSites = []) {
  return Object.fromEntries((filters || []).filter(filter => catalog?.groups?.some(group => group.value === filter.field)
    && Object.hasOwn(values || {}, filter.field) && typeof values[filter.field] === 'string'
    && globalFilterOptions(filter, rows, catalog, targets, masterSites).some(option => option.value === values[filter.field]))
    .map(filter => [filter.field, values[filter.field]]));
}

export function globalFilterRules(filters, values, rows, catalog, targets = [], masterSites = []) {
  return Object.entries(cleanGlobalValues(filters, values, rows, catalog, targets, masterSites))
    .map(([field, value]) => ({ field, operator: 'in', values: [value] }));
}

export function globalSelection(filters, values, rows, catalog, targets = [], masterSites = []) {
  return widgetSelection({ filters: globalFilterRules(filters, values, rows, catalog, targets, masterSites) }, rows, catalog);
}

export function globalTargetRows(targets, rules) {
  const siteRules = rules.filter(rule => rule.field === 'sites');
  return targets.filter(target => siteRules.every(rule => matchesFilter({ sites: target.site }, rule, { type: 'text' })));
}
