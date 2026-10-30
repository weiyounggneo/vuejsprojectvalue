<template>
  <div class="table-configuration" v-bind="fieldAttrs('table')" tabindex="-1"><validation-message :id="errorId('table')" :message="errorFor('table')" />
    <div class="current-table-recipe"><strong>Current table</strong><span>Rows: {{ axisLabel(settings.rowAxis) }}</span><span>Columns: {{ axisLabel(settings.columnAxis) }}</span><span>Values: {{ settings.measures.map(measureLabel).join(', ') }}</span></div>
    <button type="button" class="table-disclosure" :aria-expanded="presetOpen" aria-controls="table-starting-layouts" @click="presetOpen = !presetOpen">Change starting layout <span aria-hidden="true">{{ presetOpen ? '▴' : '▾' }}</span></button>
    <div v-if="presetOpen" id="table-starting-layouts" class="table-presets">
      <button type="button" @click="preset('comparison')"><strong>Actual / Target by year</strong><small>Year × Actual / Target</small></button>
      <button type="button" @click="preset('category')"><strong>Category overview</strong><small>Category × Values</small></button>
      <button type="button" @click="preset('years')"><strong>Category across years</strong><small>Category × Year</small></button>
    </div>
    <h4>Values and period</h4>
    <div class="validation-control"><label>Year selection<select v-bind="fieldAttrs('table.yearMode')" :value="settings.yearMode" @change="set('yearMode', $event.target.value)"><option value="current">Current year (updates automatically)</option><option value="range">Choose years</option></select></label><validation-message :id="errorId('table.yearMode')" :message="errorFor('table.yearMode')" /></div>
    <div v-if="settings.yearMode === 'range'" class="table-axes">
      <div class="validation-control"><label v-if="hasYearAxis">From year<input v-bind="fieldAttrs('table.startYear')" type="number" :value="settings.startYear" min="2000" max="2100" @change="set('startYear', Number($event.target.value))" /></label><validation-message :id="errorId('table.startYear')" :message="errorFor('table.startYear')" /></div>
      <div class="validation-control"><label>{{ hasYearAxis ? 'To year' : 'Value year' }}<input v-bind="fieldAttrs('table.endYear')" type="number" :value="settings.endYear" min="2000" max="2100" @change="setYear(Number($event.target.value))" /></label><validation-message :id="errorId('table.endYear')" :message="errorFor('table.endYear')" /></div>
    </div>
    <p class="table-help">Cumulative Actual uses that year's grid entry directly. Annual Increase = that entry minus the previous calendar year's entry; an unentered year contributes zero.</p>
    <fieldset class="table-values" v-bind="fieldAttrs('table.measures')" tabindex="-1"><legend>Values (choose 1 to 6)</legend>
      <label v-for="measure in availableMeasures" :key="measure.value" class="table-check"><input type="checkbox" :checked="settings.measures.includes(measure.value)"
        :disabled="measureDisabled(measure.value)" @change="toggleMeasure(measure.value)" />{{ measure.label }}</label>
      <p v-for="value in missingMeasures" :key="value" class="table-help">Unavailable value: {{ value }} <button type="button" @click="toggleMeasure(value)" :disabled="settings.measures.length === 1">Remove</button></p>
    </fieldset><validation-message :id="errorId('table.measures')" :message="errorFor('table.measures')" />
    <details><summary>Build an aggregated table value</summary>
      <metric-builder :value="metricDraft" :catalog="catalog" :enabled="metricsEnabled" @change="metricDraft = $event" />
      <button type="button" :disabled="settings.measures.includes(metricDraft) || settings.measures.length >= 6" @click="toggleMeasure(metricDraft)">Add this value</button>
    </details>
    <button type="button" class="table-disclosure" :aria-expanded="advancedOpen || hasAdvancedError" aria-controls="advanced-table-setup" @click="advancedOpen = !advancedOpen">Advanced table setup <span aria-hidden="true">{{ advancedOpen || hasAdvancedError ? '▴' : '▾' }}</span></button>
    <div v-if="advancedOpen || hasAdvancedError" id="advanced-table-setup" class="advanced-table-setup">
      <div class="table-axes">
        <div class="validation-control"><label>Row axis<select v-bind="fieldAttrs('table.rowAxis')" :value="settings.rowAxis" @change="setAxis('rowAxis', $event.target.value)">
          <option v-if="missingAxis(settings.rowAxis)" :value="settings.rowAxis">Unavailable axis — choose another</option>
          <option v-for="axis in axes" :key="axis.value" :value="axis.value">{{ axis.label }}</option>
        </select></label><validation-message :id="errorId('table.rowAxis')" :message="errorFor('table.rowAxis')" /></div>
        <div class="validation-control"><label>Column axis<select v-bind="fieldAttrs('table.columnAxis')" :value="settings.columnAxis" @change="setAxis('columnAxis', $event.target.value)">
          <option v-if="missingAxis(settings.columnAxis)" :value="settings.columnAxis">Unavailable axis — choose another</option>
          <option v-for="axis in axes" :key="axis.value" :value="axis.value">{{ axis.label }}</option>
        </select></label><validation-message :id="errorId('table.columnAxis')" :message="errorFor('table.columnAxis')" /></div>
      </div>
      <button type="button" @click="swapAxes">Swap rows and columns</button>
      <p class="table-help">Values can appear as separate columns or rows. Two categories create a cross-tab; Year creates a time comparison.</p>
      <div v-if="settings.measures.length > 1" class="table-value-order">
        <p class="table-help">Value order</p>
        <div v-for="(value, index) in settings.measures" :key="value"><span>{{ measureLabel(value) }}</span>
          <button type="button" @click="moveMeasure(index, -1)" :disabled="index === 0" :aria-label="'Move ' + measureLabel(value) + ' up'">↑</button>
          <button type="button" @click="moveMeasure(index, 1)" :disabled="index === settings.measures.length - 1" :aria-label="'Move ' + measureLabel(value) + ' down'">↓</button>
        </div>
      </div>
    </div>
    <div class="table-adjustment" v-if="adjustmentMessage"><p role="status">{{ adjustmentMessage }}</p><button type="button" @click="$emit('undo-adjustment')" aria-label="Undo table axis change">Undo</button></div>
    <p v-if="hasCategory" class="table-help">Targets are recorded per site and cannot be split by project category. Use Year / Values or Overall total / Values to include targets.</p>
    <p v-if="hasYearAxis && settings.measures.includes('count')" class="table-help">Count shows the current filtered project list for each year. Historical project counts are not stored.</p>
    <p v-if="hasYearAxis && settings.measures.some(value => value.startsWith('field:'))" class="table-help">Numeric columns show their current saved value in each year; historical snapshots are not stored.</p>
    <h4>Table display</h4>
    <div class="validation-control"><label v-if="rowCategory">Sort rows<select v-bind="fieldAttrs('table.sort')" :value="settings.sort" @change="set('sort', $event.target.value)"><option value="valueDesc">Highest first value (last selected year)</option><option value="label">Alphabetical</option></select></label><validation-message :id="errorId('table.sort')" :message="errorFor('table.sort')" /></div>
    <label class="table-check"><input type="checkbox" :checked="rowCategory && settings.showTotals" :disabled="!rowCategory" @change="set('showTotals', $event.target.checked)" />Show totals row</label>
    <p v-if="!rowCategory" class="table-help">Totals are available for category rows only. Different years and different measures are never added together.</p>
    <label class="table-check"><input type="checkbox" :checked="settings.hideZeroRows" @change="set('hideZeroRows', $event.target.checked)" />Hide rows whose values are all zero</label>
    <div class="validation-control"><label>Row spacing<select v-bind="fieldAttrs('table.density')" :value="settings.density" @change="set('density', $event.target.value)"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><validation-message :id="errorId('table.density')" :message="errorFor('table.density')" /></div>
    <label class="table-check"><input type="checkbox" :checked="settings.striped" @change="set('striped', $event.target.checked)" />Alternate row shading</label>
    <p v-if="error && !Object.keys(validationErrors).some(field => field.startsWith('table'))" class="table-error" role="status">{{ error }}</p>
  </div>
</template>

<script>
import ValidationMessage from './ValidationMessage.vue';
import MetricBuilder from './MetricBuilder.vue';
import { fieldValidation } from '../logic/editorValidation';
import { tableSettings, tableMeasures, tableSettingsError, categoryAxis } from '../../portfolio-layout/tableSettings';
export default {
  mixins: [fieldValidation],
  components: { ValidationMessage, MetricBuilder },
  name: 'TableConfigurationControls',
  props: ['widget', 'catalog', 'currentYear', 'adjustmentMessage', 'metricsEnabled'],
  emits: ['change', 'undo-adjustment'],
  data() { return { presetOpen: false, advancedOpen: false, metricDraft: 'count' }; },
  computed: {
    settings() { return tableSettings(this.widget, this.currentYear); },
    axes() { return [{ value: 'year', label: 'Year' }, { value: 'overall', label: 'Overall total' }, { value: 'measures', label: 'Selected values' }, ...this.catalog.groups]; },
    availableMeasures() { return tableMeasures(this.catalog).filter(measure => !measure.value.startsWith('aggregate:') || this.settings.measures.includes(measure.value)); },
    missingMeasures() { return this.settings.measures.filter(value => !this.availableMeasures.some(measure => measure.value === value)); },
    hasYearAxis() { return [this.settings.rowAxis, this.settings.columnAxis].includes('year'); },
    hasCategory() { return [this.settings.rowAxis, this.settings.columnAxis].some(categoryAxis); },
    rowCategory() { return categoryAxis(this.settings.rowAxis); },
    error() { return tableSettingsError(this.settings, this.catalog); },
    hasAdvancedError() { return !!(this.errorFor('table.rowAxis') || this.errorFor('table.columnAxis')); }
  },
  methods: {
    openAdvanced() { this.advancedOpen = true; },
    update(mutator) { const settings = { ...this.settings, measures: [...this.settings.measures] }; mutator(settings); this.$emit('change', settings); },
    set(key, value) { this.update(settings => { settings[key] = value; }); },
    setYear(year) { this.update(settings => { settings.endYear = year; if (!this.hasYearAxis) settings.startYear = year; }); },
    missingAxis(axis) { return !this.axes.some(choice => choice.value === axis); },
    axisLabel(axis) { return this.axes.find(choice => choice.value === axis)?.label || 'Unavailable axis'; },
    setAxis(key, value) {
      const settings = { ...this.settings, measures: [...this.settings.measures] };
      const other = key === 'rowAxis' ? 'columnAxis' : 'rowAxis';
      if (settings[other] === value) settings[other] = settings[key];
      settings[key] = value;
      let adjustment;
      if ([settings.rowAxis, settings.columnAxis].some(categoryAxis)) {
        const removed = settings.measures.filter(measure => ['cumulativeTarget', 'annualTarget'].includes(measure));
        settings.measures = settings.measures.filter(measure => !removed.includes(measure));
        const usesCount = !settings.measures.length;
        if (usesCount) settings.measures = ['count'];
        if (removed.length) adjustment = { field: key,
          message: `${removed.map(this.measureLabel).join(' and ')} removed because targets aren't available by project category.${usesCount ? ' Project count added so the table still has a value.' : ''} Undo restores the previous axes and values.` };
      }
      this.$emit('change', settings, adjustment);
    },
    swapAxes() { this.update(settings => { [settings.rowAxis, settings.columnAxis] = [settings.columnAxis, settings.rowAxis]; }); },
    measureLabel(value) { return this.availableMeasures.find(measure => measure.value === value)?.label || value; },
    measureDisabled(value) { return this.settings.measures.includes(value) ? this.settings.measures.length === 1 :
      this.settings.measures.length >= 6 || (this.hasCategory && ['cumulativeTarget', 'annualTarget'].includes(value)); },
    toggleMeasure(value) {
      this.update(settings => {
        if (settings.measures.includes(value)) { if (settings.measures.length > 1) settings.measures = settings.measures.filter(measure => measure !== value); }
        else if (!this.measureDisabled(value)) settings.measures.push(value);
      });
    },
    moveMeasure(index, delta) { this.update(settings => { const [measure] = settings.measures.splice(index, 1); settings.measures.splice(index + delta, 0, measure); }); },
    preset(name) {
      this.update(settings => {
        const category = this.widget.groupBy || 'pillars';
        Object.assign(settings, name === 'comparison' ? { rowAxis: 'year', columnAxis: 'measures', measures: ['cumulativeSavings', 'cumulativeTarget'],
          yearMode: 'range', startYear: this.currentYear - 1, endYear: this.currentYear + 3, sort: 'label', showTotals: false }
          : name === 'years' ? { rowAxis: category, columnAxis: 'year', measures: ['cumulativeSavings'], yearMode: 'range',
            startYear: this.currentYear - 1, endYear: this.currentYear + 3, showTotals: true }
          : { rowAxis: category, columnAxis: 'measures', measures: ['count', 'cumulativeSavings', 'annualSavings'], yearMode: 'current', showTotals: true });
      });
      this.presetOpen = false;
    }
  }
};
</script>

<style scoped>
h4 { color: #05204a; margin: 16px 0 10px; }
label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
select, input[type="number"] { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #bdccdc; border-radius: 5px; background: #fff; color: #23344b; }
button { border: 1px solid #cdd7e2; background: #fff; color: #05204a; padding: 8px 10px; border-radius: 5px; cursor: pointer; font: inherit; font-size: 12px; }
button:hover:not(:disabled) { background: #eef4fa; } button:disabled { opacity: .5; cursor: default; }
.table-axes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.current-table-recipe { display: grid; gap: 4px; padding: 10px; margin: 4px 0 12px; border-left: 3px solid #1f5fa8; background: #eef4fa; color: #243e60; font-size: 12px; overflow-wrap: anywhere; }
.current-table-recipe strong { font-size: 13px; }
.table-disclosure { display: flex; justify-content: space-between; width: 100%; margin: 8px 0; text-align: left; }
.table-presets { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; padding: 8px 0 12px; }
.table-presets button { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; text-align: left; }
.table-presets small { color: #607086; font-size: 10px; }
.advanced-table-setup { padding: 10px; margin-bottom: 12px; border: 1px solid #dce3ec; border-radius: 6px; background: #f8fafc; }
.table-help, .table-error { font-size: 12px; line-height: 1.5; color: #536378; margin: 6px 0 12px; }
.table-error { color: #9b251d; }
.table-adjustment { background: #eef4fa; border-left: 3px solid #1f5fa8; padding: 10px; margin: 10px 0; color: #243e60; }
.table-adjustment p { margin: 0 0 8px; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.table-adjustment button { border: 1px solid #9aadc3; border-radius: 5px; padding: 7px 12px; background: #fff; color: #05204a; cursor: pointer; }
.table-adjustment button:focus-visible { outline: 2px solid #007fa3; outline-offset: 2px; }
.table-values { border: 1px solid #dce5ef; border-radius: 6px; margin: 12px 0; padding: 10px; max-height: 300px; overflow-y: auto; }
.table-values legend { font-weight: 600; }
.table-check { display: flex; flex-direction: row; align-items: flex-start; gap: 7px; margin: 8px 0; font-size: 13px; font-weight: 400; }
.table-check input { width: auto; margin: 2px 0 0; }
.table-value-order > div { display: flex; align-items: center; gap: 5px; margin-bottom: 5px; font-size: 12px; }
.table-value-order span { flex: 1; }
@media (max-width: 650px) { .table-axes, .table-presets { grid-template-columns: 1fr; } }
</style>
