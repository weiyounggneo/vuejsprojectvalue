import { computed as portfolioComputed, methods as portfolioMethods } from '../../manager-yearly/logic/portfolio';
import { widgetTitle } from '../../portfolio-layout/aggregation';
import { comparisonNeedsTargets } from '../../portfolio-layout/comparisonSettings';
import { resolvedSiteValues } from '../../portfolio-layout/siteOptions';

export function createPreviewState() {
  return { cardsStartYear: 2025,
    pieColors: ['#1f5fa8', '#28a745', '#ffd600', '#d93025', '#17a2b8', '#6c757d', '#6f42c1', '#fd7e14'],
    dropTarget: null };
}
export function availablePreviewSites(rows, targets, masterSites = []) {
  return resolvedSiteValues({ masterSites, rows, targets });
}
export const computed = {
  ...portfolioComputed,
  // Rows and targets have already been scoped by the shared global controls.
  dashboardFilter() { return { selectedSite: 'ALL' }; },
  trackingYears() { return Array.from({ length: 5 }, (_, i) => this.currentYear - 1 + i); },
  selectedWidget() { return this.widgets.find(w => w.id === this.selectedId); },
  visibleWidgets() { return this.widgets.filter(w => w.visible); },
  selectedIndex() { return this.widgets.findIndex(w => w.id === this.selectedId); },
  previewContext() {
    return { currentYear: this.currentYear, executiveCardsData: this.executiveCardsData,
      filteredDashboardRows: this.filteredDashboardRows, siteTargets: this.siteTargets,
      trackingYears: this.trackingYears, cardsStartYear: this.cardsStartYear,
      pieColors: this.pieColors, dashboardFilter: this.dashboardFilter,
      pillarSummaryData: this.pillarSummaryData, yearlySummaryData: this.yearlySummaryData,
      cumulativeTrendOptions: this.cumulativeTrendOptions, cumulativeTrendSeries: this.cumulativeTrendSeries,
      annualizedTrendOptions: this.annualizedTrendOptions, annualizedTrendSeries: this.annualizedTrendSeries,
      kpiPieOptions: this.kpiPieOptions, kpiPieSeries: this.kpiPieSeries };
  }
};
export const methods = {
  ...portfolioMethods,
  title(widget) { return widgetTitle(widget, this.currentYear); },
  revealWidget(id, { align = 'nearest', focus = false } = {}) {
    const element = this.$refs.previewWidgets?.find(node => node.getAttribute('data-preview-widget-id') === id);
    if (!element) return;
    if (focus) element.querySelector?.('button')?.focus?.({ preventScroll: true });
    element.scrollIntoView?.({ block: align });
  },
  gridMetrics() {
    const width = this.$refs.previewGrid?.getBoundingClientRect?.().width || 0;
    return { width, gap: 20 };
  },
  gridElement() { return this.$refs.previewGrid; },
  needsTargets(widget) {
    if (widget.chartType === 'combo') return comparisonNeedsTargets(widget, this.currentYear);
    return widget.table && (widget.chartType === 'table' || ['yearly_summary', 'pillar_summary'].includes(widget.builtin))
      ? widget.table.measures.some(measure => ['cumulativeTarget', 'annualTarget'].includes(measure))
      : widget.kind === 'builtin' && ['yearly_summary', 'cumulative_trend', 'annual_trend'].includes(widget.builtin);
  }
};
