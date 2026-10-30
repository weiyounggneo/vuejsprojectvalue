<template>
  <div class="configured-chart">
    <combined-savings-chart v-if="widget.chartType === 'combo'" :widget="widget" :rows="rows" :current-year="currentYear" :catalog="catalog" :source="tableSource" />
    <configured-table v-else-if="widget.chartType === 'table' && widget.table" :widget="widget" :rows="rows" :current-year="currentYear" :catalog="catalog" :source="tableSource" />
    <p v-else-if="data.error" class="chart-message" role="status">{{ data.error }}</p>
    <template v-else-if="widget.kind === 'metric'">
      <div class="configured-metric" :style="{ color: valueColor }">{{ format(data.total) }}</div>
      <p class="chart-caption">{{ data.measureLabel }} · {{ currentYear }}<template v-if="widget.filterGate !== 'ALL'"> · {{ widget.filterGate }}</template></p>
      <p class="chart-caption">{{ data.count }} projects</p>
    </template>
    <template v-else>
      <p class="chart-caption">{{ data.measureLabel }} · {{ currentYear }}</p>
      <p v-if="!widget.groupBy" class="chart-caption">No grouping · Overall total · {{ data.count }} projects</p>
      <p v-if="widget.groupBy === 'sites'" class="chart-caption">Projects with multiple sites appear under their saved site combination.</p>
      <visualisation-table v-if="widget.chartType === 'table'" :columns="tableColumns" :rows="tableRows" :footer="tableFooter" :caption="tableCaption" :drilldowns="tableDrilldowns" :footer-drilldowns="{ value: overallScope }" @drilldown="scope = $event" />
      <p v-else-if="nonAdditive && !['bar', 'column'].includes(widget.chartType)" class="chart-message" role="status">Averages, minimums, maximums and distinct counts are not parts of one additive total. Choose Bar, Column or Table to compare these results.</p>
      <p v-else-if="!['bar', 'column'].includes(widget.chartType) && data.hasNegative" class="chart-message" role="status">
        These values include a decrease. Pie, doughnut and treemap charts cannot represent negative values here; choose a bar, column chart or table in Visualisation Management.
      </p>
      <p v-else-if="!data.entries.length || data.entries.every(e => e.value === 0)" class="chart-message">No values to chart for this selection.</p>
      <apexchart v-else :key="widget.id + '-' + widget.chartType" :type="renderType"
        :height="widget.height" :options="options" :series="series" />
      <p v-if="data.combined" class="chart-caption">Smaller categories are combined into Other.</p>
    </template>
    <drilldown-access v-if="!data.error && !['combo', 'table'].includes(widget.chartType)" :choices="drillChoices" @open="scope = $event" />
    <project-drilldown v-if="scope" :scope="scope" :catalog="catalog" :format-settings="widget.format" @close="scope = null" />
  </div>
</template>

<script>
import ReactiveChart from './ReactiveChart.vue';
import VisualisationTable from './VisualisationTable.vue';
import ConfiguredTable from './ConfiguredTable.vue';
import CombinedSavingsChart from './CombinedSavingsChart.vue';
import ProjectDrilldown from './ProjectDrilldown.vue';
import DrilldownAccess from './DrilldownAccess.vue';
import { categoryProjects } from './drilldown';
import { widgetData, escapedLabel, widgetTitle } from './aggregation';
import { formatValue, formatSettings, chartColors, primaryColor } from './presentation';
import { chartDisplay } from './chartDisplay';
import { metricDefinition } from './metricDefinitions';

export default {
  name: 'ConfiguredChart',
  components: { apexchart: ReactiveChart, VisualisationTable, ConfiguredTable, CombinedSavingsChart, ProjectDrilldown, DrilldownAccess },
  props: ['widget', 'rows', 'currentYear', 'catalog', 'tableSource'],
  data() { return { scope: null }; },
  watch: { rows: { deep: true, handler() { this.scope = null; } }, currentYear() { this.scope = null; }, widget: { deep: true, handler() { this.scope = null; } } },
  computed: {
    nonAdditive() { return !['sum', 'count'].includes(metricDefinition(this.widget.measure).operation); },
    overallScope() { return { rows: categoryProjects(this.widget, this.rows, this.catalog), measure: this.widget.measure, year: this.currentYear, label: 'Overall result' }; },
    drillChoices() { return this.widget.kind === 'metric' ? [{ label: 'Overall result', scope: this.overallScope }]
      : (this.data.entries || []).map((entry, index) => ({ label: entry.label, scope: this.entryScope(index) })); },
    tableDrilldowns() { return this.drillChoices.map(choice => ({ value: choice.scope })); },
    data() { return widgetData(this.widget, this.rows, this.currentYear, this.catalog); },
    tableCaption() { return widgetTitle(this.widget, this.currentYear); },
    tableColumns() { return [{ key: 'label', label: this.data.groupLabel || 'Category' }, { key: 'value', label: this.data.measureLabel, numeric: true }]; },
    tableRows() { return (this.data.entries || []).map(entry => ({ label: entry.label, value: this.format(entry.value) })); },
    tableFooter() { return { label: this.nonAdditive ? 'Overall result' : 'Total', value: this.format(this.data.total) }; },
    valueColor() { return primaryColor(this.widget); },
    renderType() { return this.widget.chartType === 'column' ? 'bar' : this.widget.chartType; },
    series() {
      const values = (this.data.entries || []).map(e => e.value);
      if (this.widget.chartType === 'treemap') return [{ name: this.data.measureLabel, data: (this.data.entries || []).map(entry => ({ x: escapedLabel(entry.label), y: entry.value })) }];
      return ['bar', 'column'].includes(this.widget.chartType) ? [{ name: this.data.measureLabel, data: values }] : values;
    },
    options() {
      const entries = this.data.entries || [];
      const labels = entries.map(e => escapedLabel(e.label));
      const settings = formatSettings(this.widget);
      const unit = this.data.unit;
      const format = value => formatValue(value, unit, this.widget.measure.startsWith('aggregate:distinct:') ? { mode: 'number', decimals: 0 } : settings);
      const colors = chartColors(this.widget, entries.map(e => e.label));
      const display = chartDisplay(this.widget);
      const bars = ['bar', 'column'].includes(this.widget.chartType);
      const treemap = this.widget.chartType === 'treemap';
      const dataLabel = (value, opts) => {
        if (treemap) {
          const entry = entries[opts.dataPointIndex];
          const label = escapedLabel(entry?.label || '');
          return display.showValues ? [label, format(entry?.value)] : label;
        }
        // Pie labels receive percentages from Apex; show the measured raw value.
        return bars ? format(value) : format(entries[opts.seriesIndex]?.value);
      };
      return {
        chart: { type: this.renderType, fontFamily: 'Arial, sans-serif', toolbar: { show: false }, animations: { enabled: false },
          events: { dataPointSelection: (event, context, opts) => {
            const index = bars || treemap ? opts.dataPointIndex : opts.seriesIndex;
            if (index >= 0 && entries[index]) this.scope = this.entryScope(index);
          } } },
        labels, colors, dataLabels: { enabled: treemap || display.showValues, formatter: dataLabel },
        legend: { show: !bars && !treemap && display.showLegend, position: 'bottom', fontSize: '12px',
          formatter: (label, opts) => `${label}: ${format(entries[opts.seriesIndex]?.value)}` },
        xaxis: { categories: labels, ...(this.widget.chartType === 'bar' ? { labels: { formatter: format } } : {}) },
        yaxis: { labels: this.widget.chartType === 'bar' ? {} : { formatter: format } },
        plotOptions: { bar: { horizontal: this.widget.chartType === 'bar', borderRadius: 3, distributed: Boolean(this.widget.appearance) }, pie: { expandOnClick: false }, treemap: { distributed: true, enableShades: false } },
        stroke: { width: bars ? 0 : 1, colors: ['#ffffff'] },
        tooltip: { y: { formatter: format } },
        noData: { text: 'No values to chart' }
      };
    }
  },
  methods: {
    entryScope(index) {
      const entry = this.data.entries?.[index];
      return entry ? { rows: categoryProjects(this.widget, this.rows, this.catalog, this.widget.groupBy, entry.categories),
        measure: this.widget.measure, year: this.currentYear, label: entry.label } : null;
    },
    format(value) { return formatValue(value, this.data.unit, this.widget.measure.startsWith('aggregate:distinct:') ? { mode: 'number', decimals: 0 } : this.widget.format); }
  }
};
</script>

<style scoped>
.configured-chart { min-width: 0; }
.configured-metric { color: #05204a; font-size: 36px; font-weight: 700; padding: 22px 0 4px; }
.chart-caption { color: #536378; font-size: 12px; line-height: 1.5; margin: 3px 0 8px; }
.chart-message { padding: 24px 12px; color: #536378; line-height: 1.6; background: #f6f8fb; border-radius: 6px; }
</style>
