// Defaults preserve existing charts. Treemap category labels remain visible.
export function chartDisplay(widget) {
  return { showValues: false, showLegend: true, smoothLines: true, ...widget.display };
}
export function displaySupported(widget) {
  return widget?.kind === 'grouped' || (widget?.kind === 'builtin' && ['cumulative_trend', 'annual_trend', 'kpi_breakdown'].includes(widget.builtin));
}
export function hasChartLegend(widget) {
  if (widget?.kind === 'builtin' && ['cumulative_trend', 'annual_trend'].includes(widget.builtin)) return widget.chartType !== 'table';
  return displaySupported(widget) && !['bar', 'column', 'treemap', 'table'].includes(widget.chartType);
}
