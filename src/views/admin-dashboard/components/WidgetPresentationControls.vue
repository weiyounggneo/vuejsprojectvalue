<template>
  <div class="presentation-controls">
    <h4>Value formatting</h4>
    <label>Display values as
      <select :value="format.mode" @change="setFormat('mode', $event.target.value)">
        <option value="auto">Automatic (original formatting)</option>
        <option value="number">Number — 1,234.56</option>
        <option value="currency">Currency — $1,234.56</option>
        <option value="millions">Millions — 1.23M</option>
        <option value="currencyMillions">Currency in millions — $1.23M</option>
        <option value="percent">Percentage — 12.50%</option>
      </select>
    </label>
    <template v-if="format.mode !== 'auto'">
      <label>Decimal places
        <select :value="format.decimals === null ? 'auto' : format.decimals" @change="setFormat('decimals', $event.target.value === 'auto' ? null : Number($event.target.value))">
          <option value="auto">Default (2)</option><option v-for="n in [0, 1, 2, 3, 4]" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
      <label v-if="currencyMode">Currency
        <select :value="format.currency" @change="setFormat('currency', $event.target.value)">
          <option v-for="currency in currencies" :key="currency" :value="currency">{{ currency }}</option>
        </select>
      </label>
      <p v-if="currencyMode" class="help">Currency changes the label. Values are not converted.</p>
      <label v-if="format.mode === 'percent'">How percentages are stored
        <select :value="format.percentScale" @change="setFormat('percentScale', $event.target.value)">
          <option value="whole">12.5 means 12.5%</option><option value="fraction">0.125 means 12.5%</option>
        </select>
      </label>
      <p v-if="format.mode === 'percent'" class="help">Shows the measured value as a percentage; it does not calculate a share of the total.</p>
      <p class="format-example">Example: {{ sampleValue.toLocaleString('en-US') }} → <strong>{{ example }}</strong></p>
    </template>
    <p class="help">Live Preview shows the result. Formatting keeps the underlying values unchanged.</p>
    <button type="button" v-if="widget.format" @click="$emit('change', { key: 'format', value: null })">Reset value formatting</button>

    <template v-if="hasColors">
      <h4>Colours</h4>
      <label>Colour palette
        <select :value="appearance.palette" @change="setAppearance({ palette: $event.target.value })">
          <option v-for="palette in palettes" :key="palette.value" :value="palette.value">{{ palette.label }}</option>
        </select>
      </label>
      <div class="palette-preview" aria-label="Selected colour palette"><span v-for="(color, index) in previewColors" :key="index" :style="{ backgroundColor: color }"></span></div>
      <label v-if="widget.kind === 'metric'" class="colour-row">Value colour
        <input type="color" aria-label="Summary card value colour" :value="valueColor" @change="setAppearance({ primaryColor: $event.target.value })" /><span>{{ valueColor }}</span>
      </label>
      <template v-else>
        <p class="help">Choose a colour for each category or series. Individual choices override the palette and stay with their label when sorted.</p>
        <p v-if="!labels.length" class="help">Category colours appear when preview data is available.</p>
        <div v-for="(label, index) in labels" :key="label" class="colour-row">
          <label :for="widget.id + '-colour-' + index">{{ label }}</label>
          <input type="color" :id="widget.id + '-colour-' + index" :aria-label="'Colour for ' + label" :value="colorFor(label, index)" @change="setCategoryColor(label, $event.target.value)" />
          <button type="button" v-if="hasOverride(label)" @click="resetCategoryColor(label)" :aria-label="'Reset colour for ' + label">Reset</button>
        </div>
      </template>
      <button type="button" v-if="widget.appearance" @click="$emit('change', { key: 'appearance', value: null })">Reset original colours</button>
    </template>
  </div>
</template>

<script>
import { widgetData } from '../../portfolio-layout/aggregation';
import { savingsComparisonData } from '../../portfolio-layout/savingsComparison';
import { FORMAT_DEFAULTS, PALETTES, CARD_LABELS, KPI_LABELS, formatValue, paletteColors, categoryColor, primaryColor } from '../../portfolio-layout/presentation';

export default {
  name: 'WidgetPresentationControls',
  props: ['widget', 'rows', 'currentYear', 'catalog'],
  emits: ['change'],
  data() { return { palettes: PALETTES, currencies: ['USD', 'SGD', 'EUR', 'GBP', 'JPY', 'MYR'] }; },
  computed: {
    format() { return { ...FORMAT_DEFAULTS, ...this.widget.format }; },
    appearance() { return { palette: 'original', categoryColors: {}, ...this.widget.appearance }; },
    currencyMode() { return ['currency', 'currencyMillions'].includes(this.format.mode); },
    sampleValue() { return this.format.mode === 'percent' ? (this.format.percentScale === 'fraction' ? 0.125 : 12.5) : 1234567.89; },
    example() { return formatValue(this.sampleValue, 'number', this.format); },
    hasColors() { return this.widget.chartType !== 'table' && !(this.widget.kind === 'builtin' && ['pillar_summary', 'yearly_summary'].includes(this.widget.builtin)); },
    previewColors() { return paletteColors(this.widget); },
    valueColor() { return primaryColor(this.widget); },
    labels() {
      let labels = [];
      if (this.widget.chartType === 'combo') labels = (savingsComparisonData(this.widget, this.rows, this.currentYear, this.catalog).series || []).map(item => item.name);
      else if (this.widget.kind === 'grouped') labels = (widgetData(this.widget, this.rows, this.currentYear, this.catalog).entries || []).map(e => e.label);
      if (this.widget.builtin === 'executive_cards') labels = CARD_LABELS;
      if (this.widget.builtin === 'kpi_breakdown') labels = KPI_LABELS;
      if (this.widget.builtin === 'cumulative_trend') labels = ['Cumulative Actual', 'Cumulative Expected'];
      if (this.widget.builtin === 'annual_trend') labels = ['Annual Actual Increase', 'Annual Expected'];
      return [...new Set([...labels, ...Object.keys(this.appearance.categoryColors)])];
    }
  },
  methods: {
    setFormat(key, value) { this.$emit('change', { key: 'format', value: { ...this.format, [key]: value } }); },
    setAppearance(changes) { this.$emit('change', { key: 'appearance', value: { ...this.appearance, ...changes } }); },
    colorFor(label, index) { return categoryColor(this.widget, label, index); },
    hasOverride(label) { return Object.prototype.hasOwnProperty.call(this.appearance.categoryColors, label); },
    setCategoryColor(label, color) { this.setAppearance({ categoryColors: { ...this.appearance.categoryColors, [label]: color } }); },
    resetCategoryColor(label) {
      const colors = { ...this.appearance.categoryColors }; delete colors[label];
      this.setAppearance({ categoryColors: colors });
    }
  }
};
</script>

<style scoped>
.presentation-controls { min-width: 0; }
h4 { color: #05204a; margin: 16px 0 12px; }
label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 600; margin: 12px 0; }
select { width: 100%; min-width: 0; padding: 8px; border: 1px solid #b9c7d6; border-radius: 4px; background: #fff; color: #182c43; }
.help { color: #536378; font-size: 12px; line-height: 1.5; }
.format-example { background: #eef4fb; padding: 12px; font-size: 13px; border-radius: 5px; overflow-wrap: anywhere; }
.palette-preview { display: flex; gap: 4px; margin: 8px 0 14px; }
.palette-preview span { width: 24px; height: 24px; border: 1px solid #d4dce5; border-radius: 4px; }
.colour-row { display: flex; flex-direction: row; align-items: center; flex-wrap: wrap; gap: 8px; margin: 10px 0; font-size: 12px; }
.colour-row label { flex: 1; min-width: 100px; margin: 0; overflow-wrap: anywhere; }
input[type="color"] { width: 44px; height: 34px; padding: 2px; border: 1px solid #b9c7d6; background: #fff; border-radius: 4px; cursor: pointer; }
button { padding: 6px 9px; border: 1px solid #b9c7d6; border-radius: 4px; background: #fff; color: #05204a; cursor: pointer; font-size: 12px; }
button:disabled, select:disabled, input:disabled { cursor: not-allowed; opacity: 0.6; }
</style>
