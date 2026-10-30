// Keep draft sizing inside the dimensions accepted by the existing layout API.
export const WIDTH_CHOICES = [
  { value: 3, label: '4 per row' },
  { value: 4, label: '3 per row' },
  { value: 6, label: '2 per row' },
  { value: 12, label: 'Full row' }
];
export const HEIGHT_CHOICES = [240, 280, 360, 440];

export function hasChartHeight(widget) {
  if (widget.chartType === 'table') return false;
  return widget.kind === 'grouped' || (widget.kind === 'builtin' && ['cumulative_trend', 'annual_trend', 'kpi_breakdown'].includes(widget.builtin));
}

export function nearestSize(value, choices) {
  return choices.reduce((a, b) => Math.abs(b - value) < Math.abs(a - value) ? b : a);
}

export function resizedDimensions(widget, dx, dy, gridWidth, gap = 20) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(gridWidth) || gridWidth <= 0) return { width: widget.width, height: widget.height };
  const columnUnit = (gridWidth + Math.max(0, gap)) / 12;
  return {
    width: nearestSize(widget.width + dx / columnUnit, WIDTH_CHOICES.map(c => c.value)),
    height: hasChartHeight(widget) ? nearestSize(widget.height + dy, HEIGHT_CHOICES) : widget.height
  };
}
