import { computed as portfolioComputed, methods as portfolioMethods } from '../manager-yearly/logic/portfolio';
import { widgetSelection, matchesFilter } from './aggregation';

export function filteredStandardContext(widget, source, catalog) {
  const selection = widgetSelection(widget, source.filteredDashboardRows || [], catalog);
  if (selection.error) return { error: selection.error };
  let targets = source.siteTargets || [];
  // Targets are recorded per site, not per project/category. Narrow them only
  // for a site rule; the page-level site selection still applies in portfolio logic.
  for (const rule of widget.filters || []) {
    if (rule.field === 'sites') targets = targets.filter(target => matchesFilter({ sites: target.site }, rule, { type: 'text' }));
  }
  const scope = { rows: selection.rows, currentYear: source.currentYear,
    trackingYears: source.trackingYears || [], siteTargets: targets,
    cardsStartYear: source.cardsStartYear || 2025, pieColors: source.pieColors,
    dashboardFilter: source.dashboardFilter || { selectedSite: 'ALL' } };
  Object.entries(portfolioMethods).forEach(([key, method]) => { scope[key] = method.bind(scope); });
  Object.entries(portfolioComputed).forEach(([key, compute]) => {
    Object.defineProperty(scope, key, { get: () => compute.call(scope) });
  });
  return scope;
}
