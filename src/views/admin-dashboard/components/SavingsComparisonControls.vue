<template>
  <div class="savings-comparison-controls" v-bind="fieldAttrs('comparison')" tabindex="-1"><validation-message :id="errorId('comparison')" :message="errorFor('comparison')" />
    <h4>Bar + Line values</h4>
    <p class="help">Choose two values and an X-axis. Both series share one scale, so select columns that use matching units.</p>
    <div class="validation-control"><label>Bar value<select v-bind="fieldAttrs('comparison.barMeasure')" :value="settings.barMeasure" @change="set('barMeasure', $event.target.value)">
      <option v-if="missing(settings.barMeasure)" :value="settings.barMeasure">Unavailable value — choose another</option>
      <option v-for="measure in barChoices" :key="measure.value" :value="measure.value">{{ measure.label }}</option>
    </select></label><validation-message :id="errorId('comparison.barMeasure')" :message="errorFor('comparison.barMeasure')" /></div>
    <div class="validation-control"><label>Line value<select v-bind="fieldAttrs('comparison.lineMeasure')" :value="settings.lineMeasure" @change="set('lineMeasure', $event.target.value)">
      <option v-if="missing(settings.lineMeasure)" :value="settings.lineMeasure">Unavailable value — choose another</option>
      <option v-for="measure in measures" :key="measure.value" :value="measure.value" :disabled="lineDisabled(measure)">{{ measure.label }}{{ isTarget(measure.value) && settings.xAxis !== 'year' ? ' (Year only)' : '' }}</option>
    </select></label><validation-message :id="errorId('comparison.lineMeasure')" :message="errorFor('comparison.lineMeasure')" /></div>
    <details><summary>Build a metric for a series</summary>
      <metric-builder :value="metricDraft" :catalog="catalog" :enabled="metricsEnabled" @change="metricDraft = $event" />
      <button type="button" @click="set('barMeasure', metricDraft)">Use for bars</button>
      <button type="button" :disabled="metricDraft === settings.barMeasure" @click="set('lineMeasure', metricDraft)">Use for line</button>
    </details>
    <div class="validation-control"><label>X-axis<select v-bind="fieldAttrs('comparison.xAxis')" :value="settings.xAxis" @change="set('xAxis', $event.target.value)">
      <option value="year">Year</option>
      <option v-if="settings.xAxis !== 'year' && !catalog.groups.some(group => group.value === settings.xAxis)" :value="settings.xAxis">Unavailable category — choose another</option>
      <option v-for="group in catalog.groups" :key="group.value" :value="group.value">{{ group.label }}</option>
    </select></label><validation-message :id="errorId('comparison.xAxis')" :message="errorFor('comparison.xAxis')" /></div>
    <div class="validation-control"><label>{{ settings.xAxis === 'year' ? 'Years' : 'Savings value year' }}<select v-bind="fieldAttrs('comparison.yearMode')" :value="settings.yearMode" @change="set('yearMode', $event.target.value)">
      <option value="tracking">{{ settings.xAxis === 'year' ? 'Follow portfolio timeline' : 'Current year (updates automatically)' }}</option>
      <option value="range">{{ settings.xAxis === 'year' ? 'Choose year range' : 'Choose value year' }}</option>
    </select></label><validation-message :id="errorId('comparison.yearMode')" :message="errorFor('comparison.yearMode')" /></div>
    <div v-if="settings.yearMode === 'range'" class="year-range">
      <div class="validation-control"><label v-if="settings.xAxis === 'year'">From year<input v-bind="fieldAttrs('comparison.startYear')" type="number" :value="settings.startYear" min="2000" max="2100" @change="set('startYear', Number($event.target.value))" /></label><validation-message :id="errorId('comparison.startYear')" :message="errorFor('comparison.startYear')" /></div>
      <div class="validation-control"><label>{{ settings.xAxis === 'year' ? 'To year' : 'Value year' }}<input v-bind="fieldAttrs('comparison.endYear')" type="number" :value="settings.endYear" min="2000" max="2100" @change="setEndYear(Number($event.target.value))" /></label><validation-message :id="errorId('comparison.endYear')" :message="errorFor('comparison.endYear')" /></div>
    </div>
    <div v-if="settings.xAxis !== 'year'" class="year-range">
      <div class="validation-control"><label>Sort categories<select v-bind="fieldAttrs('comparison.sort')" :value="settings.sort" @change="set('sort', $event.target.value)"><option value="label">Alphabetical</option><option value="valueDesc">Highest bar value first</option></select></label><validation-message :id="errorId('comparison.sort')" :message="errorFor('comparison.sort')" /></div>
      <div class="validation-control"><label>Maximum categories<input v-bind="fieldAttrs('comparison.maxCategories')" type="number" :value="settings.maxCategories" min="3" max="20" @change="set('maxCategories', Number($event.target.value))" /></label><validation-message :id="errorId('comparison.maxCategories')" :message="errorFor('comparison.maxCategories')" /></div>
    </div>
    <p class="help">Cumulative actual uses each year's grid entry directly. Annual increase subtracts the previous calendar year's entry. Numeric project columns are summed once per project.</p>
    <p v-if="settings.xAxis === 'year' && snapshots.length" class="help">{{ snapshots.join(' and ') }} use current saved values in every year. Their yearly history is not stored; a category axis shows their current totals by group.</p>
    <p v-if="settings.xAxis !== 'year'" class="help">Site targets are available with Year on the X-axis. For categories, choose a numeric project column for the line.</p>
    <p v-if="customUnit" class="help">Custom numeric columns have no recorded unit. Choose columns that use the same units.</p>
    <p v-if="[settings.barMeasure, settings.lineMeasure].includes('count')" class="help">The other selected column must also contain counts. Count values stay as whole numbers.</p>
    <p v-if="error && !Object.keys(validationErrors).some(field => field.startsWith('comparison'))" class="help error" role="status">{{ error }}</p>
  </div>
</template>

<script>
import ValidationMessage from './ValidationMessage.vue';
import MetricBuilder from './MetricBuilder.vue';
import { isSnapshotMeasure } from '../../portfolio-layout/metricDefinitions';
import { fieldValidation } from '../logic/editorValidation';
import { comparisonSettings, comparisonError, comparisonMeasures, compatibleComparisonMeasures, isTarget } from '../../portfolio-layout/comparisonSettings';
export default {
  mixins: [fieldValidation],
  components: { ValidationMessage, MetricBuilder },
  name: 'SavingsComparisonControls',
  props: ['widget', 'currentYear', 'catalog', 'metricsEnabled'],
  emits: ['change'],
  data() { return { metricDraft: 'count' }; },
  computed: {
    settings() { return comparisonSettings(this.widget, this.currentYear); },
    measures() { return comparisonMeasures(this.catalog); },
    barChoices() { return this.measures.filter(measure => !isTarget(measure.value)); },
    snapshots() { return [this.settings.barMeasure, this.settings.lineMeasure].filter(value => value === 'count' || isSnapshotMeasure(value)).map(value => this.measures.find(measure => measure.value === value)?.label || value); },
    customUnit() { return [this.settings.barMeasure, this.settings.lineMeasure].some(value => value.includes('field:customFields.')); },
    error() { return comparisonError(this.settings, this.catalog); }
  },
  methods: {
    isTarget,
    missing(value) { return !this.measures.some(measure => measure.value === value); },
    lineDisabled(measure) { return measure.value === this.settings.barMeasure || (isTarget(measure.value) && this.settings.xAxis !== 'year') || !compatibleComparisonMeasures(this.measures.find(item => item.value === this.settings.barMeasure), measure); },
    set(key, value) {
      const settings = { ...this.settings, [key]: value };
      if (key === 'barMeasure' && isTarget(settings.lineMeasure) && ['annualSavings', 'cumulativeSavings'].includes(value)) settings.lineMeasure = value === 'annualSavings' ? 'annualTarget' : 'cumulativeTarget';
      this.$emit('change', settings);
    },
    setEndYear(year) { this.$emit('change', { ...this.settings, endYear: year, ...(this.settings.xAxis !== 'year' ? { startYear: year } : {}) }); }
  }
};
</script>

<style scoped>
h4 { color: #05204a; margin: 16px 0 10px; }
label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
select, input { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #bdccdc; border-radius: 5px; background: #fff; color: #23344b; }
.year-range { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.help { font-size: 12px; line-height: 1.5; color: #536378; margin: 6px 0 12px; }.error { color: #9b251d; }
</style>
