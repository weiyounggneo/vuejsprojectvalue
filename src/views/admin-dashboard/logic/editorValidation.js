import { filterError } from '../../portfolio-layout/aggregation';
import { globalFilterError } from '../../portfolio-layout/globalFilters';
import { chartTypeChoices } from '../../portfolio-layout/chartTypes';
import { isTableWidget, tableSettingsError, tableMeasures, categoryAxis } from '../../portfolio-layout/tableSettings';
import { comparisonSettings, comparisonError, comparisonMeasures, compatibleComparisonMeasures, isTarget } from '../../portfolio-layout/comparisonSettings';
import { displaySupported } from '../../portfolio-layout/chartDisplay';
import { WIDTH_CHOICES, HEIGHT_CHOICES } from '../../portfolio-layout/layoutSizing';

export function validationId(scope, field) { return `validation-${scope}-${field.replace(/[^a-zA-Z0-9_-]/g, '-')}`; }

export function fieldAttributes(errors, scope, field) {
  return { 'data-validation-field': field, 'aria-invalid': errors[field] ? 'true' : undefined,
    'aria-describedby': errors[field] ? validationId(scope, field) : undefined };
}

export const fieldValidation = {
  props: { validationErrors: { type: Object, default: () => ({}) }, validationScope: { type: String, default: 'editor' } },
  methods: {
    fieldAttrs(field) { return fieldAttributes(this.validationErrors, this.validationScope, field); },
    errorId(field) { return validationId(this.validationScope, field); },
    errorFor(field) { return this.validationErrors[field] || ''; }
  }
};

function invalidYear(year) { return !Number.isInteger(year) || year < 2000 || year > 2100; }
function yearField(settings) {
  if (!['tracking', 'range', 'current'].includes(settings.yearMode)) return 'yearMode';
  if (invalidYear(settings.startYear) || settings.startYear > settings.endYear) return 'startYear';
  return 'endYear';
}

// Existing shared validators remain authoritative; these helpers locate their errors.
function tableField(settings, catalog) {
  if (!settings || typeof settings !== 'object') return 'table';
  const axes = ['year', 'overall', 'measures', ...catalog.groups.map(group => group.value)];
  if (!axes.includes(settings.rowAxis)) return 'table.rowAxis';
  if (!axes.includes(settings.columnAxis) || settings.rowAxis === settings.columnAxis) return 'table.columnAxis';
  const measures = tableMeasures(catalog);
  if (!Array.isArray(settings.measures) || !settings.measures.length || settings.measures.length > 6
    || new Set(settings.measures).size !== settings.measures.length || settings.measures.some(value => !measures.some(measure => measure.value === value))) return 'table.measures';
  if (settings.measures.some(isTarget) && [settings.rowAxis, settings.columnAxis].some(categoryAxis)) return 'table.measures';
  if (!['current', 'range'].includes(settings.yearMode) || invalidYear(settings.startYear) || invalidYear(settings.endYear)
    || settings.startYear > settings.endYear || settings.endYear - settings.startYear > 29) return `table.${yearField(settings)}`;
  if (!['label', 'valueDesc'].includes(settings.sort)) return 'table.sort';
  if (!['comfortable', 'compact'].includes(settings.density)) return 'table.density';
  return 'table';
}

function comparisonField(settings, catalog) {
  if (!settings || typeof settings !== 'object') return 'comparison';
  if (settings.xAxis !== 'year' && !catalog.groups.some(group => group.value === settings.xAxis)) return 'comparison.xAxis';
  const measures = comparisonMeasures(catalog);
  if (!measures.some(measure => measure.value === settings.barMeasure) || isTarget(settings.barMeasure)) return 'comparison.barMeasure';
  if (!measures.some(measure => measure.value === settings.lineMeasure) || settings.barMeasure === settings.lineMeasure) return 'comparison.lineMeasure';
  if (isTarget(settings.lineMeasure) && settings.xAxis !== 'year') return 'comparison.xAxis';
  // A validator can reject incompatible units before reaching year validation.
  const bar = measures.find(measure => measure.value === settings.barMeasure), line = measures.find(measure => measure.value === settings.lineMeasure);
  if (!compatibleComparisonMeasures(bar, line)) return 'comparison.lineMeasure';
  if (!['tracking', 'range'].includes(settings.yearMode) || invalidYear(settings.startYear) || invalidYear(settings.endYear)
    || settings.startYear > settings.endYear || settings.endYear - settings.startYear > 29) return `comparison.${yearField(settings)}`;
  if (!['label', 'valueDesc'].includes(settings.sort)) return 'comparison.sort';
  return 'comparison.maxCategories';
}

function filterField(widget, catalog) {
  if (!Array.isArray(widget.filters) || widget.filters.length > 10) return 'filters';
  const seen = new Set();
  for (let index = 0; index < widget.filters.length; index += 1) {
    const rule = widget.filters[index];
    if (!rule || !catalog.groups.some(group => group.value === rule.field) || seen.has(rule.field)) return `filters.${index}.field`;
    seen.add(rule.field);
    if (!['in', 'notIn'].includes(rule.operator)) return `filters.${index}.operator`;
    if (filterError({ filters: [rule] }, catalog)) return `filters.${index}.values`;
  }
  return 'filters';
}

export function editorIssues(context) {
  const { widgets, globalFilters, catalog, currentYear } = context;
  const issues = [];
  const add = (widget, tab, field, message) => issues.push({ scope: 'widget', widgetId: widget.id, tab, field, message });
  if (context.globalFiltersEnabled) {
    const problem = globalFilterError(globalFilters, catalog);
    if (problem) {
      const seen = new Set();
      let found = false;
      (Array.isArray(globalFilters) ? globalFilters : []).forEach((filter, index) => {
        let field;
        if (!filter || !catalog.groups.some(group => group.value === filter.field) || seen.has(filter.field)) field = 'category';
        else if (typeof filter.label !== 'string' || !filter.label.trim() || [...filter.label.trim()].length > 60) field = 'label';
        else if (!['buttons', 'dropdown'].includes(filter.display)) field = 'display';
        if (filter) seen.add(filter.field);
        if (field) {
          const message = field === 'category' ? 'A global filter category is unavailable or already used. Choose another category or remove the filter.'
            : field === 'label' ? 'Enter a label with 1 to 60 characters.' : 'Choose Buttons or Dropdown.';
          issues.push({ scope: 'global', index, field: `global.${index}.${field}`, message }); found = true;
        }
      });
      if (!found) issues.push({ scope: 'global', field: 'global', message: problem });
    }
  }
  if (widgets.length > 30) issues.push({ scope: 'layout', field: 'layout', message: 'Use at most 30 visualisations.' });
  widgets.forEach(widget => {
    if (typeof widget.title !== 'string' || !widget.title.trim() || [...widget.title.trim()].length > 100) add(widget, 'data', 'title', 'Enter a title with 1 to 100 characters.');
    const filterProblem = filterError(widget, catalog);
    if (filterProblem) {
      const field = filterField(widget, catalog);
      const message = field.endsWith('.field') ? `${filterProblem} Remove this filter before saving, or choose an available category.` : filterProblem;
      add(widget, 'filters', field, message);
    }
    if (!WIDTH_CHOICES.some(choice => choice.value === widget.width)) add(widget, 'layout', 'layout.width', 'Choose a supported number of charts per row.');
    if (!HEIGHT_CHOICES.includes(widget.height)) add(widget, 'layout', 'layout.height', 'Choose a supported chart height.');
    const choices = chartTypeChoices(widget);
    if (widget.chartType === 'table' && !context.tableChartsEnabled) add(widget, 'data', 'chartType', 'Table views need the updated backend portfolio-layout.js module. Replace it and Refresh before saving.');
    else if (widget.chartType && !choices.some(type => type.value === widget.chartType)) add(widget, 'data', 'chartType', 'Choose an available chart type.');
    else if (choices.find(type => type.value === widget.chartType)?.enhanced && !context.enhancedChartsEnabled) add(widget, 'data', 'chartType', 'New chart types need the updated backend portfolio-layout.js. Restart the backend and Refresh.');
    if (widget.display && (!context.enhancedChartsEnabled || !displaySupported(widget) || Object.keys(widget.display).some(key => !['showValues', 'showLegend', 'smoothLines'].includes(key))
      || ['showValues', 'showLegend', 'smoothLines'].some(key => typeof widget.display[key] !== 'boolean'))) add(widget, 'appearance', 'display', 'Choose valid chart display settings using the updated backend.');
    if (widget.comparison || widget.chartType === 'combo') {
      if (!context.flexibleComparisonEnabled || widget.kind !== 'grouped') add(widget, 'data', 'comparison', 'Bar + Line selectors need the updated backend portfolio-layout.js. Restart Node and Refresh.');
      else {
        const settings = comparisonSettings(widget, currentYear), problem = comparisonError(settings, catalog);
        if (problem) add(widget, 'data', comparisonField(settings, catalog), problem);
      }
    }
    if (widget.table) {
      if (!context.tableConfigurationEnabled) add(widget, 'data', 'table', 'Table settings need the updated backend portfolio-layout.js. Restart the backend and Refresh.');
      else {
        const problem = tableSettingsError(widget.table, catalog);
        if (problem) add(widget, 'data', tableField(widget.table, catalog), problem);
      }
      if (isTableWidget(widget)) return;
    }
    if (widget.kind === 'builtin') return;
    if (!['ALL', 'G1', 'G2', 'G3', 'Closure'].includes(widget.filterGate)) add(widget, 'filters', 'filterGate', 'Choose an available PMO gate or All gates.');
    if (widget.chartType === 'combo') return;
    if (!catalog.measures.some(measure => measure.value === widget.measure)) add(widget, 'data', 'measure', 'Choose an available measure.');
    if (widget.kind === 'grouped') {
      if (widget.groupBy && !catalog.groups.some(group => group.value === widget.groupBy)) add(widget, 'data', 'groupBy', 'Choose an available grouping column or None.');
      if (!Number.isInteger(widget.maxCategories) || widget.maxCategories < 3 || widget.maxCategories > 20) add(widget, 'data', 'maxCategories', 'Choose a category limit from 3 to 20.');
      if (!['label', 'valueDesc'].includes(widget.sort)) add(widget, 'data', 'sort', 'Choose a supported category sort order.');
    }
  });
  return issues;
}

export function draftChangeSummary(widgets, savedWidgets, filters, savedFilters) {
  const saved = new Map(savedWidgets.map(widget => [widget.id, widget]));
  const added = widgets.filter(widget => !saved.has(widget.id)).length;
  const edited = widgets.filter(widget => saved.has(widget.id) && JSON.stringify(widget) !== JSON.stringify(saved.get(widget.id))).length;
  const removed = savedWidgets.filter(widget => !widgets.some(item => item.id === widget.id)).length;
  const orderChanged = widgets.filter(widget => saved.has(widget.id)).map(widget => widget.id).join('|') !== savedWidgets.filter(widget => widgets.some(item => item.id === widget.id)).map(widget => widget.id).join('|');
  const parts = [];
  if (added) parts.push(`${added} added`);
  if (edited) parts.push(`${edited} edited`);
  if (removed) parts.push(`${removed} removed`);
  if (orderChanged) parts.push('Order changed');
  if (JSON.stringify(filters) !== JSON.stringify(savedFilters)) parts.push('Global filters changed');
  return parts.join(' · ');
}
