import { widgetSelection, fieldValue, categoryLabel, metricSample, aggregateMeasure, gateRows, numericValue } from './aggregation';
import { metricDefinition } from './metricDefinitions';
export const KPI_FIELDS = ['capacityGainValue', 'dlValue', 'idlValue', 'yieldValue', 'qualityValue'];
export function categoryProjects(widget, rows, catalog, field, categories) {
  const selection = widgetSelection(widget, rows || [], catalog);
  if (selection.error) return [];
  if (!field || !categories) return selection.rows;
  const group = catalog.groups.find(item => item.value === field);
  return group ? selection.rows.filter(row => categories.includes(categoryLabel(fieldValue(row, field), group.type))) : [];
}
export function standardDrilldown(widget, context, catalog, seriesIndex, pointIndex) {
  const rows = categoryProjects(widget, context.filteredDashboardRows || context.rows, catalog);
  const year = context.currentYear;
  if (widget.builtin === 'executive_cards') {
    const gate = ['ALL', 'G1', 'G2', 'G3', 'Closure'][pointIndex];
    return gate ? { rows: gateRows(rows, gate), measure: 'cumulativeSavings', year, label: gate === 'Closure' ? 'Operationalised' : gate } : null;
  }
  if (widget.builtin === 'pillar_summary') {
    const item = context.pillarSummaryData[pointIndex];
    return item ? { rows: rows.filter(row => categoryLabel(row.pillars, 'text') === item.pillar), measure: seriesIndex === 0 ? 'count' : 'annualSavings', year, label: item.pillar } : null;
  }
  if (widget.builtin === 'yearly_summary') {
    const item = context.yearlySummaryData[pointIndex];
    return item ? { rows, measure: seriesIndex === 0 ? 'cumulativeSavings' : 'cumulativeTarget', year: Number(item.year), value: item.target, label: String(item.year) } : null;
  }
  if (widget.builtin === 'kpi_breakdown') return KPI_FIELDS[pointIndex] ? { rows, measure: `field:${KPI_FIELDS[pointIndex]}`, year, label: KPI_FIELDS[pointIndex] } : null;
  const cumulative = widget.builtin === 'cumulative_trend';
  const options = cumulative ? context.cumulativeTrendOptions : context.annualizedTrendOptions;
  const selectedYear = Number(options?.xaxis?.categories?.[pointIndex]);
  if (!Number.isInteger(selectedYear)) return null;
  const source = cumulative ? context.cumulativeTrendSeries : context.annualizedTrendSeries;
  return { rows, year: selectedYear, label: String(selectedYear), value: source?.[seriesIndex]?.data?.[pointIndex] * 1000000,
    measure: seriesIndex === 0 ? cumulative ? 'cumulativeSavings' : 'annualSavings' : cumulative ? 'cumulativeTarget' : 'annualTarget' };
}
export function breakdownData(scope, catalog) {
  const target = ['cumulativeTarget', 'annualTarget'].includes(scope.measure);
  const definition = metricDefinition(scope.measure);
  const measure = catalog?.measures?.find(item => item.value === scope.measure);
  const kpiTotal = scope.measure === 'kpiTotal';
  const projects = target ? [] : (scope.rows || []).map(row => ({ row, value: kpiTotal ? KPI_FIELDS.reduce((sum, field) => sum + numericValue(row[field]), 0) : metricSample(row, scope.measure, scope.year) }));
  return { target, operation: definition.operation, label: kpiTotal ? 'Total KPI Value' : measure?.label || (scope.measure === 'cumulativeTarget' ? 'Cumulative Target' : scope.measure === 'annualTarget' ? 'Annual Target' : scope.measure),
    unit: target || kpiTotal ? 'currency' : measure?.unit || 'number',
    total: target ? scope.value : kpiTotal ? projects.reduce((sum, project) => sum + project.value, 0) : aggregateMeasure(scope.rows || [], scope.measure, scope.year),
    projects, missing: projects.filter(project => project.value === null).length };
}
