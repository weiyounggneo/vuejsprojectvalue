export function chartTypeChoices(widget) {
  if (widget?.kind === 'grouped') return [
    { value: 'pie', label: 'Pie', hint: 'A few categories as parts of a total' },
    { value: 'donut', label: 'Doughnut', hint: 'Parts of a total with a clear centre' },
    { value: 'bar', label: 'Bar', hint: 'Compare categories with long names' },
    { value: 'column', label: 'Column', hint: 'Compare categories vertically', enhanced: true },
    { value: 'treemap', label: 'Treemap', hint: 'Compare nonnegative category sizes', enhanced: true },
    { value: 'combo', label: 'Bar + Line', hint: 'Choose two values and a year or category axis', comparison: true },
    { value: 'table', label: 'Table', hint: 'Read exact values and choose table axes' }
  ];
  if (widget?.kind === 'builtin' && ['cumulative_trend', 'annual_trend'].includes(widget.builtin)) {
    return [{ value: 'line', label: 'Bar + target line', hint: 'Default actual columns and target line' },
      { value: 'area', label: 'Area', hint: 'Filled actual trend with a target line', enhanced: true },
      { value: 'column', label: 'Column', hint: 'Actual and target columns side by side', enhanced: true },
      { value: 'table', label: 'Table', hint: 'Compare exact values year by year' }];
  }
  if (widget?.kind === 'builtin' && widget.builtin === 'kpi_breakdown') {
    return [{ value: 'pie', label: 'Pie', hint: 'KPI shares of the total' }, { value: 'table', label: 'Table', hint: 'Read exact KPI values' }];
  }
  return [];
}
