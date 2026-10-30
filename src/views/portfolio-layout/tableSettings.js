// Table settings are presentation-only and remain saved when switching to a chart.
export const TABLE_TARGETS = [
  { value: 'cumulativeTarget', label: 'Cumulative Target', unit: 'currency' },
  { value: 'annualTarget', label: 'Annual Target', unit: 'currency' }
];
export function tableMeasures(catalog) {
  return [...(catalog?.measures || []).map(measure => ({ ...measure,
    label: measure.value === 'cumulativeSavings' ? 'Cumulative Actual'
      : measure.value === 'annualSavings' ? 'Annual Increase' : measure.label })), ...TABLE_TARGETS];
}
export function isTableWidget(widget) {
  return widget?.chartType === 'table' || (widget?.kind === 'builtin' && ['pillar_summary', 'yearly_summary'].includes(widget.builtin));
}
export function isTableCapable(widget) {
  return widget?.kind === 'grouped' || (widget?.kind === 'builtin' &&
    ['pillar_summary', 'yearly_summary', 'cumulative_trend', 'annual_trend', 'kpi_breakdown'].includes(widget.builtin));
}
export function defaultTableSettings(widget, currentYear) {
  const base = { rowAxis: widget.groupBy || 'overall', columnAxis: 'measures', measures: [widget.measure || 'count'],
    yearMode: 'current', startYear: currentYear, endYear: currentYear, sort: widget.sort || 'valueDesc',
    showTotals: true, hideZeroRows: false, density: 'comfortable', striped: true };
  if (['yearly_summary', 'cumulative_trend', 'annual_trend'].includes(widget.builtin)) Object.assign(base, {
    rowAxis: 'year', measures: widget.builtin === 'annual_trend' ? ['annualSavings', 'annualTarget'] : ['cumulativeSavings', 'cumulativeTarget'],
    yearMode: 'range', startYear: widget.builtin === 'yearly_summary' ? currentYear : currentYear - 1,
    endYear: currentYear + (widget.builtin === 'yearly_summary' ? 2 : 3), sort: 'label', showTotals: false
  });
  if (widget.builtin === 'pillar_summary') Object.assign(base, { rowAxis: 'pillars', measures: ['count', 'annualSavings'] });
  if (widget.builtin === 'kpi_breakdown') Object.assign(base, { rowAxis: 'measures', columnAxis: 'overall', showTotals: false,
    measures: ['field:capacityGainValue', 'field:dlValue', 'field:idlValue', 'field:yieldValue', 'field:qualityValue'] });
  return base;
}
export function tableSettings(widget, year) { return widget.table || defaultTableSettings(widget, year); }
export function categoryAxis(axis) { return !['year', 'overall', 'measures'].includes(axis); }
export function tableSettingsError(settings, catalog) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return 'Choose valid table settings.';
  const keys = ['rowAxis', 'columnAxis', 'measures', 'yearMode', 'startYear', 'endYear', 'sort', 'showTotals', 'hideZeroRows', 'density', 'striped'];
  if (Object.keys(settings).some(key => !keys.includes(key))) return 'Unexpected table settings.';
  const axes = ['year', 'overall', 'measures', ...(catalog?.groups || []).map(group => group.value)];
  if (![settings.rowAxis, settings.columnAxis].every(axis => axes.includes(axis)) || settings.rowAxis === settings.columnAxis) return 'Choose two different, available row and column axes.';
  const measures = tableMeasures(catalog);
  if (!Array.isArray(settings.measures) || !settings.measures.length || settings.measures.length > 6
    || new Set(settings.measures).size !== settings.measures.length || settings.measures.some(value => !measures.some(measure => measure.value === value))) return 'Choose 1 to 6 available values, each only once.';
  if (settings.measures.some(value => TABLE_TARGETS.some(target => target.value === value)) && [settings.rowAxis, settings.columnAxis].some(categoryAxis)) return 'Site targets can be compared by year or overall; they cannot be split into project categories.';
  if (!['current', 'range'].includes(settings.yearMode) || ![settings.startYear, settings.endYear].every(year => Number.isInteger(year) && year >= 2000 && year <= 2100)
    || settings.startYear > settings.endYear || settings.endYear - settings.startYear > 29) return 'Choose a year range from 2000 to 2100 with at most 30 years.';
  if (!['label', 'valueDesc'].includes(settings.sort) || !['comfortable', 'compact'].includes(settings.density)
    || [settings.showTotals, settings.hideZeroRows, settings.striped].some(value => typeof value !== 'boolean')) return 'Choose valid table sorting and display settings.';
  return '';
}
