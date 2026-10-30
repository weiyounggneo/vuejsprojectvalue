import { widgetSelection, aggregateMeasure, fieldValue, categoryLabel, numericValue } from './aggregation';
import { isSnapshotMeasure } from './metricDefinitions';
import { tableTargetValue } from './tableData';
import { comparisonSettings, comparisonError, comparisonMeasures, comparisonUnit, isTarget } from './comparisonSettings';

// Aggregate raw amounts. Neither presentation nor another year's entry changes
// the balances; annual increases retain the previous-calendar-year rule.
export function savingsComparisonData(widget, rows, year, catalog, source = {}) {
  source = source || {};
  const settings = comparisonSettings(widget, year);
  const error = comparisonError(settings, catalog);
  if (error) return { error };
  const needsTargets = isTarget(settings.lineMeasure);
  if (needsTargets && source.targetError) return { error: source.targetError };
  const selection = widgetSelection(widget, rows || [], catalog);
  if (selection.error) return { error: selection.error };
  const filtered = selection.rows;
  const available = comparisonMeasures(catalog), bar = available.find(measure => measure.value === settings.barMeasure), line = available.find(measure => measure.value === settings.lineMeasure);
  const unit = comparisonUnit(bar, line);
  const valueYear = settings.yearMode === 'range' ? settings.endYear : year;
  let labels, years = [], entries = [], combined = false;
  if (settings.xAxis === 'year') {
    const tracking = Array.isArray(source.trackingYears) ? [...new Set(source.trackingYears.map(Number))].filter(value => Number.isInteger(value) && value >= 2000 && value <= 2100).sort((a, b) => a - b) : [];
    years = settings.yearMode === 'range' ? Array.from({ length: settings.endYear - settings.startYear + 1 }, (_, i) => settings.startYear + i)
      : tracking.length ? tracking : Array.from({ length: 5 }, (_, i) => year - 1 + i);
    if (years.length > 30) return { error: 'Use a timeline or year range with at most 30 years.' };
    entries = years.map(value => ({ label: String(value), bar: aggregateMeasure(filtered, settings.barMeasure, value),
      line: needsTargets ? tableTargetValue(widget, source.siteTargets || [], value, settings.lineMeasure, source.selectedSite, source.cardsStartYear)
        : aggregateMeasure(filtered, settings.lineMeasure, value) }));
  } else {
    const group = catalog.groups.find(item => item.value === settings.xAxis), map = new Map();
    filtered.forEach(row => {
      const label = categoryLabel(fieldValue(row, settings.xAxis), group.type);
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(row);
    });
    entries = [...map].map(([label, projects]) => ({ label, categories: [label],
      bar: aggregateMeasure(projects, settings.barMeasure, valueYear), line: aggregateMeasure(projects, settings.lineMeasure, valueYear) }))
      .sort((a, b) => settings.sort === 'valueDesc' ? b.bar - a.bar || a.label.localeCompare(b.label) : a.label.localeCompare(b.label));
    if (entries.length > settings.maxCategories) {
      const rest = entries.slice(settings.maxCategories - 1); let label = 'Other (remaining categories)'; while (map.has(label)) label += '*';
      const categories = rest.flatMap(entry => entry.categories), projects = categories.flatMap(category => map.get(category));
      entries = [...entries.slice(0, settings.maxCategories - 1), { label, categories,
        bar: aggregateMeasure(projects, settings.barMeasure, valueYear), line: aggregateMeasure(projects, settings.lineMeasure, valueYear) }]; combined = true;
    }
  }
  labels = entries.map(entry => entry.label);
  let names = [bar.label, line.label];
  // Preserve the familiar default pair names and colours when reading old layouts.
  if (settings.barMeasure === 'annualSavings') names[0] = 'Annual Actual Increase';
  if (settings.lineMeasure === 'annualTarget') names[1] = 'Annual Target';
  const automaticMillions = settings.xAxis === 'year' && ((settings.barMeasure === 'cumulativeSavings' && settings.lineMeasure === 'cumulativeTarget')
    || (settings.barMeasure === 'annualSavings' && settings.lineMeasure === 'annualTarget'));
  const notes = [];
  if (settings.xAxis === 'year') {
    if ([settings.barMeasure, settings.lineMeasure].includes('count')) notes.push('Project count uses the current filtered project list in each year; historical project counts are not stored.');
    const snapshots = [bar, line].filter(measure => isSnapshotMeasure(measure.value));
    if (snapshots.length) notes.push(`${snapshots.map(measure => measure.label).join(' and ')} use current saved project values in each year; historical snapshots are not stored.`);
  }
  if (unit === 'count') notes.push('Both selected columns must contain counts. Values are displayed as whole numbers.');
  if (combined) notes.push('Smaller categories are combined into Other for both series.');
  const targetNote = needsTargets && ((widget.filterGate && widget.filterGate !== 'ALL') || widget.filters?.some(rule => rule.field !== 'sites'))
    ? 'Targets are site-level. Project category and PMO-gate filters apply to actual savings only.' : '';
  if (targetNote) notes.push(targetNote);
  return { error: '', years, labels, entries, unit, automaticMillions, notes, targetNote, count: filtered.length,
    axisLabel: settings.xAxis === 'year' ? 'Year' : catalog.groups.find(group => group.value === settings.xAxis).label,
    caption: settings.xAxis === 'year' ? `${years[0]}–${years[years.length - 1]}` : [settings.barMeasure, settings.lineMeasure].some(measure => ['annualSavings', 'cumulativeSavings'].includes(measure)) ? String(valueYear) : 'Current values',
    valueTitle: automaticMillions ? settings.barMeasure === 'cumulativeSavings' ? 'Cumulative Value' : 'Annual Increase' : unit === 'count' ? 'Projects' : 'Value',
    series: [{ name: names[0], type: 'column', data: entries.map(entry => numericValue(entry.bar)) }, { name: names[1], type: 'line', data: entries.map(entry => numericValue(entry.line)) }] };
}
