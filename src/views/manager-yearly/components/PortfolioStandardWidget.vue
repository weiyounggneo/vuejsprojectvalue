<template>
  <div class="standard-widget">
    <p v-if="scopeError" class="cards-description" role="status">{{ scopeError }}</p>
    <template v-else>
    <p v-if="widget.builtin === 'executive_cards'" class="cards-description">Values are cumulative through {{ currentYear }}.</p>
<configured-table v-if="configuredTable" :widget="widget" :rows="context.filteredDashboardRows || context.rows" :current-year="currentYear" :catalog="catalog" :source="tableSource" />
<div v-else-if="widget.builtin === 'executive_cards'" class="executive-cards-section">
        <div class="metric-card bg-overall" :style="cardStyle('Overall', 0)">
          <h4>Overall</h4>
          <div class="metric-content">
            <span class="metric-value">{{ format(executiveCardsData.Overall.value) }}</span>
            <span class="metric-divider">|</span>
            <span class="metric-count">{{ executiveCardsData.Overall.count }} Proj</span>
          </div>
        </div>
        <div class="metric-card bg-g1" :style="cardStyle('G1', 1)">
          <h4>G1</h4>
          <div class="metric-content">
            <span class="metric-value">{{ format(executiveCardsData.G1.value) }}</span>
            <span class="metric-divider">|</span>
            <span class="metric-count">{{ executiveCardsData.G1.count }} Proj</span>
          </div>
        </div>
        <div class="metric-card bg-g2" :style="cardStyle('G2', 2)">
          <h4>G2</h4>
          <div class="metric-content">
            <span class="metric-value">{{ format(executiveCardsData.G2.value) }}</span>
            <span class="metric-divider">|</span>
            <span class="metric-count">{{ executiveCardsData.G2.count }} Proj</span>
          </div>
        </div>
        <div class="metric-card bg-g3" :style="cardStyle('G3', 3)">
          <h4>G3</h4>
          <div class="metric-content">
            <span class="metric-value">{{ format(executiveCardsData.G3.value) }}</span>
            <span class="metric-divider">|</span>
            <span class="metric-count">{{ executiveCardsData.G3.count }} Proj</span>
          </div>
        </div>
        <div class="metric-card bg-operationalised" :style="cardStyle('Operationalised', 4)">
          <h4>Operationalised</h4>
          <div class="metric-content">
            <span class="metric-value">{{ format(executiveCardsData.Operationalised.value) }}</span>
            <span class="metric-divider">|</span>
            <span class="metric-count">{{ executiveCardsData.Operationalised.count }} Proj</span>
          </div>
        </div>
      </div>
<div v-else-if="widget.builtin === 'pillar_summary'">
          <div class="table-responsive">
            <table class="summary-table">
              <thead>
                <tr>
                  <th>Pillar</th>
                  <th style="text-align: center;">Count</th>
                  <th style="text-align: right;">{{ currentYear }} Annual Value</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in pillarSummaryData" :key="item.pillar">
                  <td>{{ item.pillar }}</td>
                  <td style="text-align: center;"><button type="button" class="value-drill" @click.stop="openStandard(0, pillarSummaryData.indexOf(item))">{{ item.count }}</button></td>
                  <td style="text-align: right; font-weight: bold;"><button type="button" class="value-drill" @click.stop="openStandard(1, pillarSummaryData.indexOf(item))">{{ format(item.value) }}</button></td>
                </tr>
                <tr v-if="pillarSummaryData.length === 0">
                  <td colspan="3" style="text-align: center; color: #666;">No data available</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
<div v-else-if="widget.builtin === 'yearly_summary'">
          <div class="table-responsive">
            <table class="summary-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th style="text-align: right;">Cumulative Actual</th>
                  <th style="text-align: right;">Cumulative Target</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in yearlySummaryData" :key="item.year">
                  <td><strong>{{ item.year }}</strong></td>
                  <td style="text-align: right;"><button type="button" class="value-drill" @click.stop="openStandard(0, yearlySummaryData.indexOf(item))">{{ format(item.actual) }}</button></td>
                  <td style="text-align: right; color: #28a745;"><button type="button" class="value-drill" @click.stop="openStandard(1, yearlySummaryData.indexOf(item))">{{ format(item.target) }}</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
    <visualisation-table v-else-if="widget.chartType === 'table'" :columns="tableColumns" :rows="tableRows" :footer="tableFooter" :caption="tableCaption" :drilldowns="tableDrilldowns" :footer-drilldowns="kpiTotalScope" @drilldown="scope = $event" />
    <apexchart v-else-if="widget.builtin === 'cumulative_trend'" :type="trendRenderType" :height="widget.height" :options="trendOptions" :series="trendSeries" />
    <apexchart v-else-if="widget.builtin === 'annual_trend'" :type="trendRenderType" :height="widget.height" :options="trendOptions" :series="trendSeries" />
    <template v-else-if="widget.builtin === 'kpi_breakdown'">
      <p v-if="kpiPieSeries.some(v => v < 0)" class="cards-description">KPI values include a decrease. A pie chart cannot represent negative values.</p>
      <p v-else-if="kpiPieSeries.every(v => v === 0)" class="cards-description">No KPI values to chart for this selection.</p>
      <apexchart v-else type="pie" :height="widget.height" :options="displayKpiOptions" :series="kpiPieSeries" />
    </template>
    <p v-if="projectTargetFilter && !configuredTable" class="cards-description">Targets are site-level. Project category filters apply to actual values only.</p>
    <drilldown-access v-if="!configuredTable" :choices="drillChoices" @open="scope = $event" />
    </template>
    <project-drilldown v-if="scope" :scope="scope" :catalog="catalog" :format-settings="widget.format" @close="scope = null" />
  </div>
</template>

<script>
import ReactiveChart from '../../portfolio-layout/ReactiveChart.vue';
import VisualisationTable from '../../portfolio-layout/VisualisationTable.vue';
import ConfiguredTable from '../../portfolio-layout/ConfiguredTable.vue';
import { isTableWidget } from '../../portfolio-layout/tableSettings';
import { widgetTitle } from '../../portfolio-layout/aggregation';
import { methods as formatters } from '../logic/formatters';
import { formatValue, formatSettings, chartColors, categoryColor, contrastColor } from '../../portfolio-layout/presentation';
import { filteredStandardContext } from '../../portfolio-layout/standardContext';
import { chartDisplay } from '../../portfolio-layout/chartDisplay';
import { presentedTrendSeries, presentedTrendOptions, trendRenderType } from '../../portfolio-layout/trendPresentation';
import ProjectDrilldown from '../../portfolio-layout/ProjectDrilldown.vue';
import DrilldownAccess from '../../portfolio-layout/DrilldownAccess.vue';
import { standardDrilldown } from '../../portfolio-layout/drilldown';

const CONTEXT_KEYS = ["executiveCardsData", "currentYear", "pillarSummaryData", "yearlySummaryData", "cumulativeTrendOptions", "cumulativeTrendSeries", "annualizedTrendOptions", "annualizedTrendSeries", "kpiPieOptions", "kpiPieSeries"];
export default {
  name: 'PortfolioStandardWidget',
  components: { apexchart: ReactiveChart, VisualisationTable, ConfiguredTable, ProjectDrilldown, DrilldownAccess },
  props: ['widget', 'context', 'catalog'],
  data() { return { scope: null }; },
  watch: { context() { this.scope = null; }, 'context.filteredDashboardRows': { deep: true, handler() { this.scope = null; } },
    currentYear() { this.scope = null; }, widget: { deep: true, handler() { this.scope = null; } } },
  computed: {
    kpiTotalScope() { const scope = this.widget.builtin === 'kpi_breakdown' ? this.standardScope(0, 0) : null;
      return scope ? { value: { ...scope, measure: 'kpiTotal', label: 'All KPI values' } } : {}; },
    drillChoices() {
      if (this.scopeError) return [];
      if (this.widget.builtin === 'executive_cards') return ['Overall', 'G1', 'G2', 'G3', 'Operationalised'].map((label, index) => ({ label, scope: this.standardScope(0, index) }));
      if (this.widget.builtin === 'pillar_summary') return this.pillarSummaryData.map((item, index) => ({ label: item.pillar, scope: this.standardScope(1, index) }));
      if (this.widget.builtin === 'kpi_breakdown') return this.kpiPieSeries.map((value, index) => ({ label: this.kpiPieOptions.labels[index], scope: this.standardScope(0, index) }));
      const values = this.widget.builtin === 'yearly_summary' ? this.yearlySummaryData.map(item => item.year)
        : (this.widget.builtin === 'cumulative_trend' ? this.cumulativeTrendOptions : this.annualizedTrendOptions)?.xaxis?.categories || [];
      return values.flatMap((label, index) => [0, 1].map(series => ({ label: `${label} · ${series ? 'Target' : 'Actual'}`, scope: this.standardScope(series, index) })));
    },
    tableDrilldowns() { return this.tableRows.map((row, index) => Object.fromEntries(this.tableColumns.slice(1).map((column, series) => [column.key, this.standardScope(series, index)]))); },
    configuredTable() { return Boolean(this.widget.table && isTableWidget(this.widget)); },
    tableSource() { return { siteTargets: this.context.siteTargets, selectedSite: this.context.dashboardFilter?.selectedSite, cardsStartYear: this.context.cardsStartYear }; },
    renderContext() { return this.widget.filters?.length ? filteredStandardContext(this.widget, this.context, this.catalog) : this.context; },
    scopeError() { return this.renderContext.error || ''; },
    projectTargetFilter() { return ['yearly_summary', 'cumulative_trend', 'annual_trend'].includes(this.widget.builtin) && this.widget.filters?.some(rule => rule.field !== 'sites'); },
    ...Object.fromEntries(CONTEXT_KEYS.map(key => [key, function () { return this.renderContext[key]; }])),
    tableCaption() { return widgetTitle(this.widget, this.currentYear); },
    tableColumns() {
      if (this.widget.builtin === 'kpi_breakdown') return [{ key: 'label', label: 'KPI' }, { key: 'value', label: 'Value', numeric: true }];
      const series = this.widget.builtin === 'cumulative_trend' ? this.cumulativeTrendSeries : this.annualizedTrendSeries;
      return [{ key: 'label', label: 'Year' }, ...series.map((item, index) => ({ key: 'value' + index, label: item.name, numeric: true }))];
    },
    tableRows() {
      if (this.widget.builtin === 'kpi_breakdown') return this.kpiPieSeries.map((value, index) => ({
        label: this.kpiPieOptions.labels[index].replace(/ \(\$\)$/, ''), value: this.formatTable(value)
      }));
      const cumulative = this.widget.builtin === 'cumulative_trend';
      const series = cumulative ? this.cumulativeTrendSeries : this.annualizedTrendSeries;
      const labels = (cumulative ? this.cumulativeTrendOptions : this.annualizedTrendOptions).xaxis.categories;
      return labels.map((label, index) => ({ label, ...Object.fromEntries(series.map((item, column) =>
        ['value' + column, this.formatTable(item.data[index] * 1000000)])) }));
    },
    tableFooter() {
      // Cumulative amounts from different years must never be added together.
      return this.widget.builtin === 'kpi_breakdown' ? { label: 'Total', value: this.formatTable(this.kpiPieSeries.reduce((sum, value) => sum + value, 0)) } : null;
    },
    trendSeries() {
      const source = this.widget.builtin === 'cumulative_trend' ? this.cumulativeTrendSeries : this.annualizedTrendSeries;
      return presentedTrendSeries(this.widget, source);
    },
    trendRenderType() { return trendRenderType(this.widget); },
    trendOptions() {
      const cumulative = this.widget.builtin === 'cumulative_trend';
      const options = presentedTrendOptions(this.widget, cumulative ? this.cumulativeTrendOptions : this.annualizedTrendOptions,
        this.trendSeries, cumulative ? 'Cumulative Value' : 'Annual Increase');
      return { ...options, chart: { ...options.chart, events: { dataPointSelection: (event, context, opts) => this.openStandard(opts.seriesIndex, opts.dataPointIndex) } },
        markers: { ...options.markers, size: 4 }, tooltip: { ...options.tooltip, shared: false, intersect: true } };
    },
    displayKpiOptions() {
      const options = this.kpiPieOptions;
      const settings = formatSettings(this.widget);
      const display = chartDisplay(this.widget);
      const styled = { ...options, chart: { ...options.chart, events: { dataPointSelection: (event, context, opts) => this.openStandard(0, opts.seriesIndex) } }, colors: chartColors(this.widget, options.labels, options.colors),
        legend: { ...options.legend, show: display.showLegend },
        dataLabels: { ...options.dataLabels, enabled: display.showValues,
          formatter: (value, opts) => formatValue(this.kpiPieSeries[opts.seriesIndex], 'currency', settings, this.formatMillions) } };
      if (settings.mode === 'auto') return styled;
      const format = value => formatValue(value, 'currency', settings);
      const percent = index => {
        const total = this.kpiPieSeries.reduce((sum, v) => sum + v, 0);
        return total > 0 ? (this.kpiPieSeries[index] / total * 100).toFixed(1) : '0.0';
      };
      return { ...styled, labels: options.labels.map(label => label.replace(/ \(\$\)$/, '')),
        legend: { ...styled.legend, formatter: (label, opts) => `${label}: ${format(this.kpiPieSeries[opts.seriesIndex])} (${percent(opts.seriesIndex)}% of total)` },
        tooltip: { ...options.tooltip, y: { formatter: format } } };
    }
  },
  methods: {
    standardScope(series, index) { return standardDrilldown(this.widget, this.renderContext, this.catalog, series, index); },
    openStandard(series, index) { if (index >= 0 && series >= 0) this.scope = this.standardScope(series, index); },
    ...formatters,
    formatTable(value) {
      const settings = formatSettings(this.widget);
      return formatValue(value, 'currency', settings.mode === 'auto' ? { mode: 'currency', decimals: 2, currency: 'USD' } : settings);
    },
    format(value) { return formatValue(value, 'currency', this.widget.format, this.formatMillions); },
    cardStyle(label, index) {
      const appearance = this.widget.appearance;
      if (!appearance || (appearance.palette === 'original' && !Object.prototype.hasOwnProperty.call(appearance.categoryColors, label))) return {};
      const background = categoryColor(this.widget, label, index);
      return { background, color: contrastColor(background) };
    }
  }
};
</script>

<style scoped src="../styles/dashboard.css"></style>
<style scoped src="../styles/table.css"></style>
<style scoped src="../styles/responsive.css"></style>
<style scoped>
.cards-description { color: #536378; font-size: 13px; margin: 0 0 14px; }
.executive-cards-section { margin: 0; grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr)); }
.standard-widget { min-width: 0; }
.value-drill { border: 0; background: transparent; color: #1f5fa8; text-decoration: none; font: inherit; cursor: pointer; padding: 3px; min-height: 24px; } .value-drill:focus-visible { outline: 3px solid #87baf2; outline-offset: 2px; }
</style>
