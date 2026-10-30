import { tableMeasures } from './tableSettings';

export function comparisonSettings(widget, year) {
  const value = widget.comparison;
  if (value && !Object.prototype.hasOwnProperty.call(value, 'valueMode')) return value;
  if (value && !['cumulative', 'annual'].includes(value.valueMode)) return value;
  const annual = value?.valueMode === 'annual';
  return { xAxis: 'year', barMeasure: annual ? 'annualSavings' : 'cumulativeSavings',
    lineMeasure: annual ? 'annualTarget' : 'cumulativeTarget', yearMode: value ? value.yearMode : 'tracking',
    startYear: value ? value.startYear : year - 1, endYear: value ? value.endYear : year + 3, sort: 'label', maxCategories: 10 };
}
export function isTarget(measure) { return ['cumulativeTarget', 'annualTarget'].includes(measure); }
export function comparisonMeasures(catalog) { return tableMeasures(catalog); }
export function compatibleComparisonMeasures(bar, line) {
  if (!bar || !line) return false;
  if (bar.unit === line.unit) return true;
  // Custom numeric fields have no unit metadata. They can share a financial
  // scale with a known measure; the editor explains that units must match.
  const custom = measure => measure.unit === 'number' && measure.value.includes('field:customFields.');
  return custom(bar) || custom(line);
}
export function comparisonUnit(bar, line) { return [bar.unit, line.unit].includes('currency') ? 'currency' : [bar.unit, line.unit].includes('count') ? 'count' : bar.unit; }
export function comparisonError(settings, catalog = null) {
  const keys = ['xAxis', 'barMeasure', 'lineMeasure', 'yearMode', 'startYear', 'endYear', 'sort', 'maxCategories'];
  if (!settings || typeof settings !== 'object' || Array.isArray(settings) || Object.keys(settings).some(key => !keys.includes(key))) return 'Choose valid bar + line settings.';
  if (typeof settings.xAxis !== 'string' || (settings.xAxis !== 'year' && (!/^[a-zA-Z][a-zA-Z0-9_.]*$/.test(settings.xAxis)
    || (catalog && !catalog.groups.some(group => group.value === settings.xAxis))))) return 'Choose Year or an available project category for the X-axis.';
  const syntax = measure => typeof measure === 'string' && /^(count|annualSavings|cumulativeSavings|field:[a-zA-Z][a-zA-Z0-9_.]*|aggregate:(average|minimum|maximum|distinct):field:[a-zA-Z][a-zA-Z0-9_.]*|annualTarget|cumulativeTarget)$/.test(measure);
  if (!syntax(settings.barMeasure) || !syntax(settings.lineMeasure) || isTarget(settings.barMeasure)) return 'Choose an available numeric bar value and line value.';
  if (settings.barMeasure === settings.lineMeasure) return 'Choose different bar and line values.';
  if (isTarget(settings.lineMeasure) && settings.xAxis !== 'year') return 'Site targets require Year on the X-axis; choose a project column for a category comparison.';
  if (catalog) {
    const measures = comparisonMeasures(catalog), bar = measures.find(measure => measure.value === settings.barMeasure), line = measures.find(measure => measure.value === settings.lineMeasure);
    if (!bar || !line) return 'A selected value is unavailable. Choose another numeric column.';
    if (!compatibleComparisonMeasures(bar, line)) return 'Both series share one scale. Choose values with matching units.';
  }
  if (!['tracking', 'range'].includes(settings.yearMode) || ![settings.startYear, settings.endYear].every(year => Number.isInteger(year) && year >= 2000 && year <= 2100)
    || settings.startYear > settings.endYear || settings.endYear - settings.startYear > 29) return 'Choose years from 2000 to 2100 with a maximum of 30 years.';
  if (!['label', 'valueDesc'].includes(settings.sort) || !Number.isInteger(settings.maxCategories) || settings.maxCategories < 3 || settings.maxCategories > 20) return 'Choose a category limit from 3 to 20 and a supported sort order.';
  return '';
}
export function comparisonNeedsTargets(widget, year) { return isTarget(comparisonSettings(widget, year).lineMeasure); }
