import { tableSettingsError } from '../../portfolio-layout/tableSettings';

export const TABLE_TEMPLATES = [
  { value: 'comparison', label: 'Actual vs Target over time', hint: 'Compare actual savings with the site target for each year.', sample: 'Year × Actual / Target' },
  { value: 'category', label: 'Category summary', hint: 'Compare project count and values for Pillars, Sites, Statuses or another category.', sample: 'Category × Values' },
  { value: 'years', label: 'Category trend over time', hint: 'Follow one savings measure across several years for every category.', sample: 'Category × Year' },
  { value: 'kpi', label: 'KPI summary', hint: 'Show selected numeric project fields together as a current snapshot.', sample: 'KPI × Current value' },
  { value: 'custom', label: 'Custom table', hint: 'Start with a simple table, then choose the exact rows and columns in Advanced table setup.', sample: 'Overall × Values' }
];

const measureExists = (catalog, value) => (catalog?.measures || []).some(measure => measure.value === value);
const groupExists = (catalog, value) => (catalog?.groups || []).some(group => group.value === value);
const preferredCategory = catalog => groupExists(catalog, 'pillars') ? 'pillars' : catalog?.groups?.[0]?.value || 'pillars';
const projectMeasures = catalog => (catalog?.measures || []).filter(measure => measure.value.startsWith('field:'));
const available = (catalog, values) => values.filter(value => measureExists(catalog, value));

export function tableTemplateDraft(template, currentYear, catalog = {}) {
  const category = preferredCategory(catalog);
  const categoryMeasures = available(catalog, ['count', 'cumulativeSavings', 'annualSavings']);
  const kpiMeasures = projectMeasures(catalog).slice(0, 5).map(measure => measure.value);
  return {
    template: TABLE_TEMPLATES.some(item => item.value === template) ? template : 'comparison',
    category,
    comparisonBasis: 'cumulative',
    categoryMeasures: categoryMeasures.length ? categoryMeasures : ['count'],
    categoryYearMode: 'current', categoryYear: currentYear,
    trendMeasure: measureExists(catalog, 'cumulativeSavings') ? 'cumulativeSavings' : catalog?.measures?.[0]?.value || 'count',
    startYear: currentYear - 1, endYear: currentYear + 3,
    kpiMeasures: kpiMeasures.length ? kpiMeasures : (catalog?.measures?.[0] ? [catalog.measures[0].value] : ['count'])
  };
}

export function createTableCreationDraft(currentYear, catalog = {}) { return tableTemplateDraft('comparison', currentYear, catalog); }

export function tableSettingsFromCreation(draft, currentYear) {
  const base = { yearMode: 'current', startYear: currentYear, endYear: currentYear, sort: 'valueDesc',
    showTotals: false, hideZeroRows: false, density: 'comfortable', striped: true };
  if (draft.template === 'comparison') return { ...base, rowAxis: 'year', columnAxis: 'measures',
    measures: draft.comparisonBasis === 'annual' ? ['annualSavings', 'annualTarget'] : ['cumulativeSavings', 'cumulativeTarget'],
    yearMode: 'range', startYear: draft.startYear, endYear: draft.endYear, sort: 'label' };
  if (draft.template === 'category') return { ...base, rowAxis: draft.category, columnAxis: 'measures', measures: [...draft.categoryMeasures],
    yearMode: draft.categoryYearMode, startYear: draft.categoryYearMode === 'current' ? currentYear : draft.categoryYear,
    endYear: draft.categoryYearMode === 'current' ? currentYear : draft.categoryYear, showTotals: true };
  if (draft.template === 'years') return { ...base, rowAxis: draft.category, columnAxis: 'year', measures: [draft.trendMeasure],
    yearMode: 'range', startYear: draft.startYear, endYear: draft.endYear, showTotals: true };
  if (draft.template === 'kpi') return { ...base, rowAxis: 'measures', columnAxis: 'overall', measures: [...draft.kpiMeasures], sort: 'label' };
  return { ...base, rowAxis: 'overall', columnAxis: 'measures', measures: ['count'], sort: 'label' };
}

export function tableCreationError(draft, currentYear, catalog) {
  if (!draft || !TABLE_TEMPLATES.some(item => item.value === draft.template)) return 'Choose a table starting layout.';
  const settings = tableSettingsFromCreation(draft, currentYear);
  return tableSettingsError(settings, catalog);
}

const groupLabel = (catalog, value) => catalog?.groups?.find(group => group.value === value)?.label || 'Category';
const measureLabel = (catalog, value) => {
  if (value === 'cumulativeTarget') return 'Cumulative Target';
  if (value === 'annualTarget') return 'Annual Target';
  const measure = catalog?.measures?.find(item => item.value === value);
  return measure?.value === 'cumulativeSavings' ? 'Cumulative Actual'
    : measure?.value === 'annualSavings' ? 'Annual Increase' : measure?.label || value;
};

export function tableTitleFromCreation(draft, currentYear, catalog) {
  if (draft.template === 'comparison') return `${draft.comparisonBasis === 'annual' ? 'Annual' : 'Cumulative'} Actual vs Target by Year`;
  if (draft.template === 'category') return `${draft.categoryYearMode === 'current' ? currentYear : draft.categoryYear} Overview by ${groupLabel(catalog, draft.category)}`;
  if (draft.template === 'years') return `${measureLabel(catalog, draft.trendMeasure)} by ${groupLabel(catalog, draft.category)} and Year`;
  if (draft.template === 'kpi') return 'KPI Summary';
  return 'Custom Table';
}

export function tableRecipeFromCreation(draft, currentYear, catalog) {
  const settings = tableSettingsFromCreation(draft, currentYear);
  const axis = value => value === 'year' ? 'Year' : value === 'overall' ? 'Overall total' : value === 'measures' ? 'Selected values' : groupLabel(catalog, value);
  const period = settings.yearMode === 'current' ? String(currentYear)
    : settings.startYear === settings.endYear ? String(settings.endYear) : `${settings.startYear}–${settings.endYear}`;
  const explanation = draft.template === 'comparison'
    ? (draft.comparisonBasis === 'annual' ? 'Annual Increase is each cumulative entry minus the previous calendar year.' : 'Cumulative Actual reads each year’s cumulative grid entry directly; the years are not added together.')
    : draft.template === 'years' ? 'Only stored yearly savings measures are offered, avoiding repeated current snapshots across years.'
      : draft.template === 'kpi' ? 'Numeric project fields are summed once per project as a current snapshot.'
        : draft.template === 'category' ? 'Targets are omitted because site targets cannot be allocated to ordinary project categories.'
          : 'Use Advanced table setup after creation to change the rows and columns.';
  return { rows: axis(settings.rowAxis), columns: axis(settings.columnAxis),
    values: settings.measures.map(value => measureLabel(catalog, value)).join(', '), period, explanation };
}
