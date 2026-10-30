import { formatValue, formatSettings, chartColors } from './presentation';
import { chartDisplay } from './chartDisplay';
import { escapedLabel } from './aggregation';

export function presentedComparisonSeries(widget, data) {
  const millions = data.automaticMillions && formatSettings(widget).mode === 'auto';
  return (data.series || []).map(series => ({ ...series, name: escapedLabel(series.name), data: series.data.map(value => millions ? value / 1000000 : value) }));
}
export function presentedComparisonOptions(widget, data) {
  const settings = formatSettings(widget), display = chartDisplay(widget);
  const millions = data.automaticMillions && settings.mode === 'auto';
  const format = data.unit === 'count' ? value => formatValue(value, 'count', { mode: 'number', decimals: 0 }) :
    millions ? value => `${Number(value).toFixed(1)}M` : value => formatValue(value, data.unit, settings);
  return {
    chart: { type: 'line', stacked: false, fontFamily: 'Arial, sans-serif', toolbar: { show: false }, animations: { enabled: false } },
    colors: chartColors(widget, data.series.map(item => item.name), ['#05204a', '#037d50']),
    xaxis: { categories: data.labels.map(escapedLabel), title: { text: data.axisLabel }, labels: { style: { fontSize: '13px', fontWeight: 600 } } },
    yaxis: { title: { text: data.valueTitle + (millions ? ' (Millions)' : '') }, labels: { formatter: format, style: { fontSize: '13px', fontWeight: 600 } } },
    stroke: { width: [0, 4], curve: display.smoothLines ? 'smooth' : 'straight' },
    plotOptions: { bar: { columnWidth: '45%', borderRadius: 4 } },
    legend: { show: display.showLegend, position: 'top' }, dataLabels: { enabled: display.showValues, formatter: format },
    tooltip: { shared: true, intersect: false, y: { formatter: format } }, noData: { text: 'No values for this selection' }
  };
}
