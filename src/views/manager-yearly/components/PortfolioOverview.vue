<template>
  <div class="analytics-section">
    <div class="analytics-layout">
      <p class="portfolio-scope">On-Hold and Cancelled projects are excluded from these values and counts.</p>
      <global-filter-bar :filters="globalFilters" :values="globalValues" :rows="rows" :site-targets="filterSiteTargets" :master-sites="masterSites"
        :catalog="layoutCatalog" :project-count="filteredDashboardRows.length" :disabled="layoutLoading" :has-target-comparison="true"
        @change="$emit('global-filter-change', $event)">
        <template #heading><h2 class="portfolio-title">Portfolio Overview</h2></template>
        <template #actions><button class="site-btn portfolio-refresh" @click="$emit('refresh-layout')" :disabled="layoutLoading">{{ layoutLoading ? 'Loading…' : 'Refresh Layout' }}</button></template>
      </global-filter-bar>
      <p v-if="layoutError" class="layout-error" role="status">{{ layoutError }}</p>
      <p v-if="eligiblePortfolioRows.length && !filteredDashboardRows.length" class="layout-empty" role="status">No projects match the global filters. Choose All or reset the filters to show more projects.</p>
      <div v-if="eligiblePortfolioRows.length" class="portfolio-widget-grid">
        <section v-for="widget in visibleWidgets" :key="widget.id" class="chart-card portfolio-widget" :class="{ 'full-width': widget.width === 12 }" :style="{ '--widget-span': widget.width }" :data-widget-id="widget.id">
          <div class="chart-header"><h3 class="chart-title">{{ title(widget) }}</h3></div>
          <chart-filter-summary :widget="widget" :catalog="layoutCatalog" />
          <portfolio-standard-widget v-if="widget.kind === 'builtin'" :widget="widget" :context="$props" :catalog="layoutCatalog" />
          <configured-chart v-else :widget="widget" :rows="filteredDashboardRows" :current-year="currentYear" :catalog="layoutCatalog" :table-source="tableSource" />
        </section>
        <p v-if="!visibleWidgets.length" class="layout-empty">No visualisations are enabled. An admin can add them in Visualisation Management.</p>
      </div>
      <p v-else class="layout-empty">No projects available for visualisation. On-Hold and Cancelled projects are excluded.</p>
    </div>
  </div>
</template>

<script>
import PortfolioStandardWidget from './PortfolioStandardWidget.vue';
import ConfiguredChart from '../../portfolio-layout/ConfiguredChart.vue';
import GlobalFilterBar from '../../portfolio-layout/GlobalFilterBar.vue';
import ChartFilterSummary from '../../portfolio-layout/ChartFilterSummary.vue';
import { widgetTitle } from '../../portfolio-layout/aggregation';

export default {
  name: 'PortfolioOverview',
  components: { PortfolioStandardWidget, ConfiguredChart, ChartFilterSummary, GlobalFilterBar },
  props: [
    "eligiblePortfolioRows",
    "analyticsSiteOptions",
    "annualizedTrendOptions",
    "annualizedTrendSeries",
    "cardsRangeLabel",
    "cumulativeTrendOptions",
    "cumulativeTrendSeries",
    "currentYear",
    "dashboardFilter",
    "dtitPieOptions",
    "dtitPieSeries",
    "executiveCardsData",
    "foakPieOptions",
    "foakPieSeries",
    "kpiPieOptions",
    "kpiPieSeries",
    "pillarPieOptions",
    "pillarPieSeries",
    "pillarSummaryData",
    "rows",
    "yearlySummaryData",
    "layoutWidgets",
    "layoutCatalog",
    "layoutError",
    "layoutLoading",
    "globalFilters", "globalValues", "filterSiteTargets", "masterSites",
    "filteredDashboardRows",
    "siteTargets", "trackingYears", "cardsStartYear", "pieColors"
],
  emits: ['global-filter-change', 'refresh-layout'],
  computed: { tableSource() { return { siteTargets: this.siteTargets, selectedSite: this.dashboardFilter.selectedSite, cardsStartYear: this.cardsStartYear, trackingYears: this.trackingYears }; }, visibleWidgets() { return (this.layoutWidgets || []).filter(widget => widget.visible); } },
  methods: { title(widget) { return widgetTitle(widget, this.currentYear); } }
};
</script>

<style scoped src="../styles/dashboard.css"></style>
<style scoped src="../styles/responsive.css"></style>
<style scoped>
.portfolio-widget-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 20px; width: 100%; }
.portfolio-widget { grid-column: span var(--widget-span); min-width: 0; margin: 0; overflow: hidden; }
.chart-title { overflow-wrap: anywhere; }
.portfolio-title { margin: 0; color: #243e60; font-size: 15px; line-height: 1.4; font-weight: 600; flex: 0 0 auto; }
.portfolio-refresh { padding: 7px 10px; font-size: 12px; white-space: nowrap; }
.portfolio-scope { color: #536378; font-size: 13px; margin: 0; }
.layout-error { background: #fff3d8; padding: 12px 16px; color: #684b17; border-radius: 6px; line-height: 1.5; }
.layout-empty { grid-column: 1 / -1; padding: 24px; text-align: center; color: #536378; }
@media (max-width: 1100px) { .portfolio-widget { grid-column: span 6; } .portfolio-widget.full-width { grid-column: 1 / -1; } }
@media (max-width: 680px) { .portfolio-widget { grid-column: 1 / -1; } }
</style>
