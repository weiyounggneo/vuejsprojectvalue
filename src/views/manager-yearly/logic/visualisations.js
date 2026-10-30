import { DEFAULT_WIDGETS, DEFAULT_CATALOG } from '../../portfolio-layout/defaults';
import { DEFAULT_GLOBAL_FILTERS, cleanGlobalValues, globalFilterRules, globalTargetRows } from '../../portfolio-layout/globalFilters';

export const computed = {
  portfolioGlobalFilters() { return this.visualisationGlobalFilters || DEFAULT_GLOBAL_FILTERS; },
  portfolioGlobalValues() {
    const values = { ...this.dashboardFilter.values };
    if (this.dashboardFilter.selectedSite !== 'ALL') values.sites = this.dashboardFilter.selectedSite;
    return cleanGlobalValues(this.portfolioGlobalFilters, values, this.rows, this.portfolioLayoutCatalog, this.siteTargets, this.configOptions?.SITE || []);
  },
  globalProjectFilters() { return globalFilterRules(this.portfolioGlobalFilters, this.portfolioGlobalValues, this.rows, this.portfolioLayoutCatalog, this.siteTargets, this.configOptions?.SITE || []); },
  portfolioTargetRows() { return globalTargetRows(this.siteTargets, this.globalProjectFilters); },
  portfolioLayoutCatalog() {
    if (this.visualisationCatalog) return this.visualisationCatalog;
    return {
      ...DEFAULT_CATALOG,
      groups: [...DEFAULT_CATALOG.groups, ...this.projectFields.filter(f => ['text', 'boolean', 'date'].includes(f.type)).map(f => ({ value: `customFields.${f.columnName}`, label: f.label, type: f.type }))],
      measures: [...DEFAULT_CATALOG.measures, ...this.projectFields.filter(f => f.type === 'number').map(f => ({ value: `field:customFields.${f.columnName}`, label: `Total ${f.label}`, unit: 'number' }))]
    };
  },
  portfolioLayoutWidgets() {
    return this.visualisationWidgets || DEFAULT_WIDGETS;
  }
};

export const methods = {
  setPortfolioGlobalValues(values) {
    this.dashboardFilter.values = cleanGlobalValues(this.portfolioGlobalFilters, values, this.rows, this.portfolioLayoutCatalog, this.siteTargets, this.configOptions?.SITE || []);
    this.dashboardFilter.selectedSite = this.dashboardFilter.values.sites || 'ALL';
  },
  async fetchPortfolioLayout() {
    if (this.isVisualisationLoading) return;
    this.isVisualisationLoading = true;
    this.visualisationError = '';
    try {
      const response = await this.apiFetch(`${this.apiBaseUrl}/api/manager-visualisation-layout`);
      const data = await this.readApiJson(response, 'Could not load the visualisation layout.');
      if (!Array.isArray(data.widgets) || !Array.isArray(data.catalog?.groups) || !Array.isArray(data.catalog?.measures)) throw new Error('The server returned an invalid visualisation layout.');
      this.visualisationWidgets = data.widgets;
      this.visualisationGlobalFilters = data.globalFilters || DEFAULT_GLOBAL_FILTERS;
      this.visualisationCatalog = data.catalog;
      this.setPortfolioGlobalValues(this.portfolioGlobalValues);
      this.visualisationLayoutLoaded = true;
    } catch (err) {
      if (!err.isUnauthorized) this.visualisationError = `${err.message} ${this.visualisationLayoutLoaded ? 'Showing the last loaded layout.' : 'Showing the standard layout until settings are available.'}`;
    } finally { this.isVisualisationLoading = false; }
  },
  async openPortfolioOverview() {
    this.activeTab = 'analytics';
    await this.fetchPortfolioLayout();
  }
};
