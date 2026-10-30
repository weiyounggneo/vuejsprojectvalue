import { widgetSelection, matchesFilter, fieldValue, categoryLabel, aggregateMeasure, numericValue } from './aggregation';
import { isSnapshotMeasure } from './metricDefinitions';
import { tableSettings, tableSettingsError, tableMeasures, categoryAxis } from './tableSettings';
import { formatValue } from './presentation';

// Actual entries are cumulative balances. Only the separately recorded annual
// site targets are accumulated, from the same baseline as the standard tables.
export function tableTargetValue(widget, targets, year, measure, selectedSite = 'ALL', baseline = 2025) {
  const site = String(selectedSite).trim().toUpperCase();
  return targets.reduce((total, target) => {
    const targetYear = Number(target.target_year);
    if (!Number.isInteger(targetYear) || (measure === 'cumulativeTarget' ? targetYear < baseline || targetYear > year : targetYear !== year)) return total;
    const targetSite = String(target.site || '').trim().toUpperCase();
    if (site !== 'ALL' && targetSite !== site) return total;
    if ((widget.filters || []).some(rule => rule.field === 'sites' && !matchesFilter({ sites: targetSite }, rule, { type: 'text' }))) return total;
    return total + numericValue(target.expected_value);
  }, 0);
}
export function tableData(widget, rows, currentYear, catalog, source = {}) {
  source = source || {};
  const settings = tableSettings(widget, currentYear);
  const error = tableSettingsError(settings, catalog);
  if (error) return { error };
  const selection = widgetSelection(widget, rows, catalog);
  if (selection.error) return { error: selection.error };
  const measures = settings.measures.map(value => tableMeasures(catalog).find(measure => measure.value === value));
  const usesTargets = settings.measures.some(value => ['cumulativeTarget', 'annualTarget'].includes(value));
  if (usesTargets && source.targetError) return { error: source.targetError };
  const hasYearAxis = [settings.rowAxis, settings.columnAxis].includes('year');
  const lastYear = settings.yearMode === 'current' ? currentYear : settings.endYear;
  const years = hasYearAxis && settings.yearMode === 'range'
    ? Array.from({ length: settings.endYear - settings.startYear + 1 }, (_, index) => settings.startYear + index) : [lastYear];
  const groups = new Map((catalog.groups || []).map(group => [group.value, group]));
  const rowLabel = axis => axis === 'year' ? 'Year' : axis === 'overall' ? 'Overall total' : axis === 'measures' ? 'Values' : groups.get(axis).label;
  const dimensionValue = (axis, row, year, measure) => axis === 'overall' ? 'Overall total' : axis === 'year' ? String(year)
    : axis === 'measures' ? measure.value : categoryLabel(fieldValue(row, axis), groups.get(axis).type);
  const entriesFor = axis => axis === 'overall' ? ['Overall total'] : axis === 'year' ? years.map(String) : axis === 'measures' ? settings.measures
    : [...new Set(selection.rows.map(row => dimensionValue(axis, row)))].sort((a, b) => a.localeCompare(b));
  const rowEntries = entriesFor(settings.rowAxis), columnEntries = entriesFor(settings.columnAxis);
  const key = (row, column, measure) => JSON.stringify([row, column, measure]);
  const values = new Map();
  const cellProjects = new Map();
  // Aggregate once per project/year/value rather than rescanning the projects
  // for every cell. Maps also keep category labels such as __proto__ safe.
  selection.rows.forEach(project => years.forEach(year => measures.forEach(measure => {
    if (['cumulativeTarget', 'annualTarget'].includes(measure.value)) return;
    const cell = key(dimensionValue(settings.rowAxis, project, year, measure), dimensionValue(settings.columnAxis, project, year, measure), measure.value);
    if (!cellProjects.has(cell)) cellProjects.set(cell, []);
    cellProjects.get(cell).push(project);
  })));
  cellProjects.forEach((projects, cell) => {
    const [row, column, measure] = JSON.parse(cell);
    const year = settings.rowAxis === 'year' ? Number(row) : settings.columnAxis === 'year' ? Number(column) : lastYear;
    values.set(cell, aggregateMeasure(projects, measure, year));
  });
  if (usesTargets) years.forEach(year => measures.forEach(measure => {
    if (!['cumulativeTarget', 'annualTarget'].includes(measure.value)) return;
    values.set(key(dimensionValue(settings.rowAxis, null, year, measure), dimensionValue(settings.columnAxis, null, year, measure), measure.value),
      tableTargetValue(widget, source.siteTargets || [], year, measure.value, source.selectedSite, source.cardsStartYear));
  }));
  const measureOnRows = settings.rowAxis === 'measures';
  const measureOnColumns = settings.columnAxis === 'measures';
  const numericColumns = columnEntries.flatMap(entry => {
    const selected = measureOnRows ? [null] : measureOnColumns ? [measures.find(measure => measure.value === entry)] : measures;
    return selected.map(measure => ({ entry, measure, label: measureOnColumns ? measure.label :
      settings.columnAxis === 'overall' ? (measureOnRows ? 'Value' : measure.label) :
        !measure || measures.length === 1 ? entry : `${entry} · ${measure.label}` }));
  }).map((column, index) => ({ ...column, key: 'value' + index }));
  const format = (value, measure) => measure.unit === 'count' ? formatValue(value, 'count', { mode: 'number', decimals: 0 })
    : formatValue(value, measure.unit, widget.format);
  let rawRows = rowEntries.map(entry => ({ label: measureOnRows ? measures.find(measure => measure.value === entry).label : entry,
    entry, values: numericColumns.map(column => values.get(key(entry, column.entry, (column.measure || measures.find(measure => measure.value === entry)).value)) || 0) }));
  if (categoryAxis(settings.rowAxis) && settings.sort === 'valueDesc') {
    const scoreColumns = numericColumns.map((column, index) => ({ column, index })).filter(({ column }) =>
      column.measure.value === measures[0].value && (settings.columnAxis !== 'year' || column.entry === String(lastYear)));
    const score = row => scoreColumns.reduce((total, { index }) => total + row.values[index], 0);
    rawRows.sort((a, b) => score(b) - score(a) || a.label.localeCompare(b.label));
  }
  const descriptor = (entry, column, overall = false) => {
    const measure = column.measure || measures.find(item => item.value === entry);
    const year = settings.rowAxis === 'year' ? Number(entry) : settings.columnAxis === 'year' ? Number(column.entry) : lastYear;
    const projects = overall ? selection.rows.filter(project => !categoryAxis(settings.columnAxis)
      || dimensionValue(settings.columnAxis, project, year, measure) === column.entry)
      : cellProjects.get(key(entry, column.entry, measure.value)) || [];
    return { rows: projects, measure: measure.value, year, label: overall ? 'Overall result' : `${entry} · ${column.label}`,
      value: ['cumulativeTarget', 'annualTarget'].includes(measure.value) ? tableTargetValue(widget, source.siteTargets || [], year, measure.value, source.selectedSite, source.cardsStartYear) : undefined };
  };
  const footerDrilldowns = categoryAxis(settings.rowAxis) ? Object.fromEntries(numericColumns.map(column => [column.key, descriptor(null, column, true)])) : {};
  const footer = settings.showTotals && categoryAxis(settings.rowAxis) ? { label: settings.measures.some(measure => measure.startsWith('aggregate:')) ? 'Overall result' : 'Total', ...Object.fromEntries(numericColumns.map(column => {
    const scope = footerDrilldowns[column.key];
    return [column.key, format(aggregateMeasure(scope.rows, scope.measure, scope.year), column.measure)];
  })) } : null;
  if (settings.hideZeroRows) rawRows = rawRows.filter(row => row.values.some(value => value !== 0));
  const formattedRows = rawRows.map(row => ({ label: row.label, ...Object.fromEntries(numericColumns.map((column, index) =>
    [column.key, format(row.values[index], column.measure || measures.find(measure => measure.value === row.entry))])) }));
  const notes = [];
  if (settings.hideZeroRows && footer) notes.push('Overall results still include projects in zero rows hidden for display. Hiding a row is not a data filter.');
  if (hasYearAxis && settings.measures.some(measure => measure === 'count')) notes.push('Project count uses the current filtered project list in each year; historical project counts are not stored.');
  if (hasYearAxis && settings.measures.some(isSnapshotMeasure)) notes.push('Numeric project columns use the current saved value in each year; historical snapshots are not stored.');
  if (settings.measures.some(measure => measure.startsWith('aggregate:'))) notes.push('Overall results are recalculated from the underlying projects, not added from category averages, extrema or distinct counts. Blank or invalid values are excluded; an empty result displays 0.');
  if (usesTargets && ((widget.filterGate && widget.filterGate !== 'ALL') || widget.filters?.some(rule => rule.field !== 'sites'))) notes.push('Targets are site-level. Project category and gate filters apply to actual values only.');
  return { error: '', columns: [{ key: 'label', label: rowLabel(settings.rowAxis) }, ...numericColumns.map(column => ({ key: column.key, label: column.label, numeric: true }))],
    rows: formattedRows, footer, drilldowns: rawRows.map(row => Object.fromEntries(numericColumns.map(column => [column.key, descriptor(row.entry, column)]))),
    footerDrilldowns, notes, yearLabel: hasYearAxis && years.length > 1 ? `${years[0]}–${lastYear}` : String(lastYear) };
}
