<template>
  <div class="combined-savings-chart">
    <p v-if="data.error" class="comparison-message" role="status">{{ data.error }}</p>
    <template v-else>
      <p class="comparison-caption">{{ data.axisLabel }} · {{ data.caption }}</p>
      <p v-if="noValues" class="comparison-message">No values for this selection.</p>
      <apexchart v-else type="line" :height="widget.height" :options="options" :series="series" />
      <p v-for="note in data.notes" :key="note" class="comparison-caption">{{ note }}</p>
      <drilldown-access :choices="drillChoices" @open="scope = $event" />
    </template>
    <project-drilldown v-if="scope" :scope="scope" :catalog="catalog" :format-settings="widget.format" @close="scope = null" />
  </div>
</template>

<script>
import ReactiveChart from './ReactiveChart.vue';
import { savingsComparisonData } from './savingsComparison';
import { presentedComparisonSeries, presentedComparisonOptions } from './comparisonPresentation';
import ProjectDrilldown from './ProjectDrilldown.vue';
import DrilldownAccess from './DrilldownAccess.vue';
import { categoryProjects } from './drilldown';
import { comparisonSettings } from './comparisonSettings';
export default {
  name: 'CombinedSavingsChart',
  components: { apexchart: ReactiveChart, ProjectDrilldown, DrilldownAccess },
  props: ['widget', 'rows', 'currentYear', 'catalog', 'source'],
  data() { return { scope: null }; },
  watch: { rows: { deep: true, handler() { this.scope = null; } }, currentYear() { this.scope = null; }, widget: { deep: true, handler() { this.scope = null; } } },
  computed: {
    data() { return savingsComparisonData(this.widget, this.rows, this.currentYear, this.catalog, this.source); },
    noValues() { return (this.data.series || []).every(item => item.data.every(value => value === 0)); },
    series() { return presentedComparisonSeries(this.widget, this.data); },
    drillChoices() { return (this.data.entries || []).flatMap((entry, index) => [0, 1].map(series => ({ label: `${entry.label} · ${this.data.series[series].name}`, scope: this.pointScope(series, index) }))); },
    options() {
      if (this.data.error) return {};
      const options = presentedComparisonOptions(this.widget, this.data);
      return { ...options, chart: { ...options.chart, events: { dataPointSelection: (event, context, opts) => { if (opts.dataPointIndex >= 0 && opts.seriesIndex >= 0) this.scope = this.pointScope(opts.seriesIndex, opts.dataPointIndex); } } } };
    }
  },
  methods: {
    pointScope(series, index) {
      const entry = this.data.entries?.[index]; if (!entry || ![0, 1].includes(series)) return null;
      const settings = comparisonSettings(this.widget, this.currentYear);
      return { rows: categoryProjects(this.widget, this.rows, this.catalog, settings.xAxis === 'year' ? '' : settings.xAxis, entry.categories),
        measure: series === 0 ? settings.barMeasure : settings.lineMeasure,
        year: settings.xAxis === 'year' ? this.data.years[index] : settings.yearMode === 'range' ? settings.endYear : this.currentYear,
        label: entry.label, value: series === 0 ? entry.bar : entry.line };
    }
  }
};
</script>

<style scoped>
.combined-savings-chart { min-width: 0; }
.comparison-caption { color: #536378; font-size: 12px; line-height: 1.5; margin: 3px 0 8px; }
.comparison-message { padding: 24px 12px; color: #536378; line-height: 1.6; background: #f6f8fb; border-radius: 6px; }
</style>
