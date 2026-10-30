import { formatValue, formatSettings, customFormat, chartColors } from './presentation';
import { chartDisplay } from './chartDisplay';

// Both standard and configurable comparisons share the original design and a
// single value scale. Source trend values are in millions, not a running sum.
export function presentedTrendSeries(widget, source) {
  const series = customFormat(widget) ? source.map(item => ({ ...item, data: item.data.map(value => value * 1000000) })) : source;
  if (widget.chartType === 'column') return series.map(item => ({ ...item, type: 'column' }));
  if (widget.chartType === 'area') return series.map((item, index) => ({ ...item, type: index === 0 ? 'area' : 'line' }));
  return series;
}
export function trendRenderType(widget) { return widget.chartType === 'column' ? 'bar' : widget.chartType === 'area' ? 'area' : 'line'; }
export function presentedTrendOptions(widget, source, series, valueTitle) {
  const settings = formatSettings(widget);
  const display = chartDisplay(widget);
  const format = settings.mode === 'auto' ? source.tooltip.y.formatter : value => formatValue(value, 'currency', settings);
  const styled = { ...source, chart: { ...source.chart, type: trendRenderType(widget), stacked: false },
    colors: chartColors(widget, series.map(item => item.name), source.colors),
    legend: { ...source.legend, show: display.showLegend },
    dataLabels: { ...source.dataLabels, enabled: display.showValues, formatter: format },
    stroke: { ...source.stroke, curve: display.smoothLines ? source.stroke.curve : 'straight',
      ...(widget.chartType === 'area' ? { width: [3, 3] } : widget.chartType === 'column' ? { width: 0 } : {}) },
    ...(widget.chartType === 'area' ? { fill: { type: 'solid', opacity: [0.25, 1] } } : {}) };
  if (settings.mode === 'auto') return styled;
  return { ...styled, yaxis: { ...source.yaxis, title: { text: valueTitle }, labels: { ...source.yaxis.labels, formatter: format } },
    tooltip: { ...source.tooltip, y: { ...source.tooltip.y, formatter: format } } };
}
