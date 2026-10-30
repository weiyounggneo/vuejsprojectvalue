import { filterError } from '../../portfolio-layout/aggregation';
import { metricDefinition, isSnapshotMeasure } from '../../portfolio-layout/metricDefinitions';
import { isTableWidget, tableSettings, tableSettingsError, categoryAxis } from '../../portfolio-layout/tableSettings';
import { comparisonSettings, comparisonError, isTarget } from '../../portfolio-layout/comparisonSettings';
import { chartTypeChoices } from '../../portfolio-layout/chartTypes';

// Read-only descriptions of the existing configuration. Never add these fields
// to a widget or recalculate project data for the editor's explanation.
const KPI_MEASURES = ['field:capacityGainValue', 'field:dlValue', 'field:idlValue', 'field:yieldValue', 'field:qualityValue'];
const OPERATIONS = { sum: 'Sum of', average: 'Average of', minimum: 'Minimum of', maximum: 'Maximum of', distinct: 'Distinct count of values in' };
const unique = values => [...new Set(values.filter(Boolean))];
const compact = value => [...value].length > 110 ? [...value].slice(0, 107).join('') + '…' : value;
const list = (values, limit = values.length) => {
  const visible = values.slice(0, limit);
  return visible.join(', ') + (values.length > limit ? ` + ${values.length - limit} more` : '');
};

export function metricSummary(value, catalog) {
  if (value === 'count') return 'Project count';
  if (value === 'cumulativeSavings') return 'Cumulative actual savings';
  if (value === 'annualSavings') return 'Annual savings increase';
  if (value === 'cumulativeTarget') return 'Cumulative site target';
  if (value === 'annualTarget') return 'Annual site target';
  const definition = metricDefinition(value);
  const source = catalog.measures?.find(measure => measure.value === definition.source);
  if (!source) return 'Unavailable numeric column';
  const label = source.label.replace(/^Total /, '');
  return `${OPERATIONS[definition.operation]} ${label}`;
}

function axisLabel(axis, catalog) {
  if (axis === 'year') return 'Year';
  if (axis === 'overall') return 'Overall total';
  if (axis === 'measures') return 'Values';
  return catalog.groups?.find(group => group.value === axis)?.label || 'Unavailable category';
}

function filterSummaries(rules, catalog) {
  return (Array.isArray(rules) ? rules : []).map(rule => {
    const label = catalog.groups?.find(group => group.value === rule?.field)?.label || 'Unavailable category';
    const values = Array.isArray(rule?.values) ? rule.values.map(value => value === '' ? 'Unassigned' : String(value)) : [];
    const suffix = rule?.field === 'currentPmoGate' && values.includes('G2') ? ' (G2 includes G2.5)' : '';
    return `${label}: ${rule?.operator === 'notIn' ? 'exclude' : 'include'} ${values.join(' or ') || 'choose values'}${suffix}`;
  });
}

function measureNotes(measures, hasYearAxis) {
  const notes = [];
  if (measures.includes('cumulativeSavings')) notes.push('Cumulative actual savings reads each project’s entered balance for that year directly. Balances from different years are never added together.');
  if (measures.includes('annualSavings')) notes.push('Annual increase = that year’s cumulative entry minus the previous calendar year’s entry. An unentered current year contributes 0; an explicit 0 can represent a decrease.');
  if (measures.some(isSnapshotMeasure)) notes.push(hasYearAxis
    ? 'Numeric project columns use the current saved value in every displayed year. Historical snapshots are not stored.'
    : 'Numeric project columns use their current saved values, not historical yearly snapshots.');
  if (measures.includes('count')) notes.push(hasYearAxis
    ? 'Project count uses the current filtered project list in every displayed year. Historical project counts are not stored.'
    : 'Project count counts each in-scope project once; no numeric column is required.');
  if (measures.some(value => metricDefinition(value).operation === 'distinct')) notes.push('Distinct Count counts unique numeric values, not projects. For example, 10, 10 and 20 count as 2 distinct values.');
  if (measures.some(value => value?.startsWith('aggregate:'))) notes.push('Average, Minimum, Maximum and Distinct Count ignore blank or invalid numeric values and include real zeroes. Empty results display 0. Overall and Other results are recalculated from projects, not added from category results.');
  if (measures.includes('cumulativeTarget')) notes.push('Cumulative targets add the separately recorded annual site targets from 2025 through each displayed year.');
  if (measures.includes('annualTarget')) notes.push('Annual targets use the separately recorded site target for that year.');
  return notes;
}

function periodLabel(measures, hasYearAxis, start, end) {
  if (![start, end].every(value => Number.isInteger(value) && value >= 2000 && value <= 2100) || start > end) return 'Check year settings';
  const years = start === end ? String(end) : `${start}–${end}`;
  const snapshots = measures.some(isSnapshotMeasure);
  const yearly = measures.some(value => ['annualSavings', 'cumulativeSavings', 'annualTarget', 'cumulativeTarget'].includes(value));
  if (hasYearAxis) return years;
  return yearly ? `${end}${snapshots ? ' + current values' : ''}` : 'Current project values';
}

function builtinDescription(widget, year) {
  if (widget.builtin === 'executive_cards') return { sentence: 'Cumulative actual savings and project counts, overall and by PMO gate.',
    measures: ['cumulativeSavings', 'count'], axis: 'Overall, G1, G2 (including G2.5), G3 and Operationalised', start: year, end: year };
  if (widget.builtin === 'pillar_summary') return { sentence: 'Project counts and annual savings increase, grouped by Pillars.',
    measures: ['count', 'annualSavings'], axis: 'Rows: Pillars · Columns: Values', start: year, end: year };
  if (widget.builtin === 'yearly_summary') return { sentence: 'Cumulative actual savings compared with the cumulative site target, by Year.',
    measures: ['cumulativeSavings', 'cumulativeTarget'], axis: 'Rows: Year · Columns: Values', start: year, end: year + 2, hasYearAxis: true };
  if (['cumulative_trend', 'annual_trend'].includes(widget.builtin)) {
    const annual = widget.builtin === 'annual_trend';
    return { sentence: `${annual ? 'Annual savings increase' : 'Cumulative actual savings'} compared with the ${annual ? 'annual' : 'cumulative'} site target, by Year.`,
      measures: annual ? ['annualSavings', 'annualTarget'] : ['cumulativeSavings', 'cumulativeTarget'],
      axis: widget.chartType === 'table' ? 'Rows: Year · Columns: Values' : 'X-axis: Year', start: year - 1, end: year + 3, hasYearAxis: true };
  }
  if (widget.builtin === 'kpi_breakdown') return { sentence: 'Total current project values, split into Capacity Gain, DL, IDL, Yield and Quality.',
    measures: KPI_MEASURES, axis: widget.chartType === 'table' ? 'Rows: KPI · Columns: Value' : 'KPI categories', start: year, end: year };
  return { sentence: 'Choose an available standard visualisation.', measures: [], axis: 'Unavailable standard item', start: year, end: year };
}

export function chartSummary(widget, catalog = {}, currentYear, previewFilters = []) {
  if (!widget) return null;
  const savedRules = Array.isArray(widget.filters) ? widget.filters : [];
  previewFilters = Array.isArray(previewFilters) ? previewFilters : [];
  let sentence, axis, period, measures = [], start = currentYear, end = currentYear, hasYearAxis = false;
  let validation = '', extraNotes = [], valueDetails = [];
  const isTable = isTableWidget(widget);
  const configuredTable = isTable && Boolean(widget.table);
  const combo = widget.kind === 'grouped' && widget.chartType === 'combo';
  const type = widget.kind === 'metric' ? 'Summary card' : isTable ? 'Table'
    : chartTypeChoices(widget).find(choice => choice.value === (widget.chartType || (widget.builtin === 'kpi_breakdown' ? 'pie' : 'line')))?.label
      || (widget.builtin === 'executive_cards' ? 'Executive cards' : 'Chart');

  if (configuredTable) {
    const settings = tableSettings(widget, currentYear);
    measures = Array.isArray(settings.measures) ? settings.measures : [];
    validation = tableSettingsError(settings, catalog);
    const names = measures.map(value => metricSummary(value, catalog));
    sentence = `${list(names, 2) || 'Choose table values'}, arranged by ${axisLabel(settings.rowAxis, catalog)} and ${axisLabel(settings.columnAxis, catalog)}.`;
    axis = `Rows: ${axisLabel(settings.rowAxis, catalog)} · Columns: ${axisLabel(settings.columnAxis, catalog)}`;
    hasYearAxis = [settings.rowAxis, settings.columnAxis].includes('year');
    end = settings.yearMode === 'current' ? currentYear : settings.endYear;
    start = hasYearAxis && settings.yearMode === 'range' ? settings.startYear : end;
    valueDetails = names.map(value => ({ label: 'Table value', value }));
    if ([settings.rowAxis, settings.columnAxis].includes('sites')) extraNotes.push('Projects assigned to multiple sites are grouped under their saved site combination, not split into separate Site groups.');
    extraNotes.push(settings.showTotals && categoryAxis(settings.rowAxis)
      ? 'The overall row is calculated from the in-scope projects, not by adding results from different years.'
      : 'No overall totals row is shown.');
    if (settings.hideZeroRows) extraNotes.push('Rows containing only zeroes are hidden for display. Their projects remain in the overall calculation.');
  } else if (combo) {
    const settings = comparisonSettings(widget, currentYear);
    measures = [settings.barMeasure, settings.lineMeasure];
    validation = comparisonError(settings, catalog);
    sentence = `${metricSummary(settings.barMeasure, catalog)} as bars and ${metricSummary(settings.lineMeasure, catalog)} as a line, by ${axisLabel(settings.xAxis, catalog)}.`;
    axis = `X-axis: ${axisLabel(settings.xAxis, catalog)}`;
    hasYearAxis = settings.xAxis === 'year';
    end = settings.yearMode === 'range' ? settings.endYear : hasYearAxis ? currentYear + 3 : currentYear;
    start = hasYearAxis ? settings.yearMode === 'range' ? settings.startYear : currentYear - 1 : end;
    valueDetails = [{ label: 'Bars', value: metricSummary(settings.barMeasure, catalog) }, { label: 'Line', value: metricSummary(settings.lineMeasure, catalog) }];
    extraNotes.push('Bars and line share one value scale; their units must match.');
    if (settings.xAxis === 'sites') extraNotes.push('Projects assigned to multiple sites are grouped under their saved site combination, not split into separate Site groups.');
  } else if (widget.kind === 'builtin') {
    const description = builtinDescription(widget, currentYear);
    ({ sentence, measures, axis, start, end, hasYearAxis = false } = description);
    valueDetails = measures.map(value => ({ label: 'Value', value: metricSummary(value, catalog) }));
    if (!measures.length) validation = 'The standard visualisation is unavailable.';
  } else {
    measures = [widget.measure];
    const grouped = widget.kind === 'grouped' && widget.groupBy;
    sentence = `${metricSummary(widget.measure, catalog)}, ${grouped ? 'grouped by ' + axisLabel(widget.groupBy, catalog) : 'shown as one overall result'}.`;
    axis = grouped ? `Group by: ${axisLabel(widget.groupBy, catalog)}` : 'No grouping · one overall result';
    validation = !catalog.measures?.some(measure => measure.value === widget.measure) ? 'The selected numeric column or measure is unavailable.'
      : grouped && !catalog.groups?.some(group => group.value === widget.groupBy) ? 'The grouping category is unavailable.' : '';
    if (grouped && widget.chartType !== 'table') extraNotes.push(`Category limit: ${widget.maxCategories}. Extra categories are pooled into Other, not excluded from the calculation.`);
    if (grouped && widget.groupBy === 'sites') extraNotes.push('Projects assigned to multiple sites are grouped under their saved site combination, not split into separate Site groups.');
  }

  period = periodLabel(measures, hasYearAxis, start, end);
  const chartFilters = filterSummaries(savedRules, catalog);
  if (widget.kind !== 'builtin' && widget.filterGate && widget.filterGate !== 'ALL') chartFilters.unshift(`PMO gate: ${widget.filterGate === 'Closure' ? 'Operationalised (Closure)' : widget.filterGate}${widget.filterGate === 'G2' ? ' (including G2.5)' : ''} only`);
  const localFilters = filterSummaries(previewFilters, catalog);
  const usesTargets = measures.some(isTarget);
  const nonSiteFilter = savedRules.some(rule => rule?.field !== 'sites')
    || previewFilters.some(rule => rule?.field !== 'sites') || (widget.kind !== 'builtin' && widget.filterGate && widget.filterGate !== 'ALL');
  const warnings = unique([validation, filterError(widget, catalog),
    usesTargets && nonSiteFilter ? 'Project category and PMO-gate filters affect actual project values only. Targets remain site-level; only Site filters narrow them.' : '',
    hasYearAxis && (measures.includes('count') || measures.some(isSnapshotMeasure))
      ? 'Numeric columns and project counts use the current project data in every displayed year, not historical snapshots.' : '',
    widget.kind === 'grouped' && ['pie', 'donut', 'treemap'].includes(widget.chartType)
      && !['sum', 'count'].includes(metricDefinition(widget.measure).operation)
      ? 'This calculation is not an additive part of a total. Choose Bar, Column or Table to compare these results.' : '']);
  const notes = measureNotes(measures, hasYearAxis);
  notes.push('On-Hold and Cancelled projects are excluded from project values and counts.');
  if (chartFilters.length || localFilters.length) notes.push('All chart and preview filter rules must match. Include accepts any listed value; Exclude removes projects matching any listed value. Preview selections are local and are not saved for everyone.');
  if ([...savedRules, ...previewFilters].some(rule => rule?.field === 'sites')) notes.push('Site matching uses exact comma-separated site names. Projects assigned to ALL participate in concrete Site selections.');
  if (usesTargets) notes.push('Targets come from site target records, not individual projects. Only Site filters narrow target values.');
  return { sentence, type, period, axis, valueDetails, chartFilters, previewFilters: localFilters,
    chartScope: chartFilters.length ? list(chartFilters.map(compact), 2) : 'All eligible projects',
    previewScope: localFilters.length ? list(localFilters.map(compact), 2) : '',
    notes: unique([...notes, ...extraNotes]), warnings, hidden: widget.visible === false };
}
