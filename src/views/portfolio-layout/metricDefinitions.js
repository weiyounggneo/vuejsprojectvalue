export const METRIC_OPERATIONS = [
  { value: 'sum', label: 'Sum' }, { value: 'average', label: 'Average' },
  { value: 'minimum', label: 'Minimum' }, { value: 'maximum', label: 'Maximum' },
  { value: 'count', label: 'Project Count' }, { value: 'distinct', label: 'Distinct Count' }
];
export function metricDefinition(value) {
  if (value === 'count') return { operation: 'count', source: '' };
  const match = /^aggregate:(average|minimum|maximum|distinct):(field:[a-zA-Z][a-zA-Z0-9_.]*)$/.exec(value || '');
  return match ? { operation: match[1], source: match[2] } : { operation: 'sum', source: value };
}
export function metricValue(operation, source) {
  return operation === 'count' ? 'count' : operation === 'sum' ? source : `aggregate:${operation}:${source}`;
}
export function isSnapshotMeasure(value) { return metricDefinition(value).source?.startsWith('field:'); }
