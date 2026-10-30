<template>
  <div class="widget-layout-controls">
    <p class="layout-label">Charts per row</p>
    <div class="width-buttons" v-bind="fieldAttrs('layout.width')" tabindex="-1" role="group" aria-label="Charts per row">
      <button v-for="choice in widthChoices" :key="choice.value" type="button" :data-width="choice.value" :disabled="disabled"
        :aria-pressed="widget.width === choice.value" @click="resize(choice.value, widget.height)">
        <span class="row-pictogram" aria-hidden="true"><i v-for="n in 12 / choice.value" :key="n"></i></span>{{ choice.label }}
      </button>
    </div>
    <validation-message :id="errorId('layout.width')" :message="errorFor('layout.width')" />
    <label v-if="heightAdjustable" class="height-slider" :for="heightInputId">Chart height <output>{{ widget.height }} px</output>
      <input v-bind="fieldAttrs('layout.height')" :id="heightInputId" type="range" min="0" max="3" step="1" :value="heightIndex" :disabled="disabled" @input="changeHeight" />
    </label>
    <p v-else class="layout-help">Height fits the content of this card or table.</p>
    <validation-message :id="errorId('layout.height')" :message="errorFor('layout.height')" />
    <div class="preview-order-controls">
      <button type="button" :disabled="disabled || index <= 0" @click="$emit('move', index, -1)">Move up</button>
      <button type="button" :disabled="disabled || index >= count - 1" @click="$emit('move', index, 1)">Move down</button>
    </div>
    <p class="layout-help">You can also drag the chart's corner to resize it, or its Move handle to reorder it.</p>
  </div>
</template>

<script>
import ValidationMessage from './ValidationMessage.vue';
import { fieldValidation } from '../logic/editorValidation';
import { WIDTH_CHOICES, HEIGHT_CHOICES, hasChartHeight } from '../../portfolio-layout/layoutSizing';

export default {
  mixins: [fieldValidation],
  components: { ValidationMessage },
  name: 'WidgetLayoutControls',
  props: { widget: Object, index: Number, count: Number, disabled: Boolean,
    heightInputId: { type: String, default: 'inspector-chart-height' } },
  emits: ['resize', 'move'],
  data() { return { widthChoices: WIDTH_CHOICES }; },
  computed: {
    heightAdjustable() { return hasChartHeight(this.widget); },
    heightIndex() { return HEIGHT_CHOICES.indexOf(this.widget.height); }
  },
  methods: {
    resize(width, height) { if (!this.disabled) this.$emit('resize', { id: this.widget.id, width, height }); },
    changeHeight(event) {
      const height = HEIGHT_CHOICES[Number(event.target.value)];
      if (height !== undefined && this.heightAdjustable) this.resize(this.widget.width, height);
    }
  }
};
</script>

<style scoped>
.layout-label { font-size: 13px; font-weight: 600; color: #23344b; margin: 0 0 8px; }
.width-buttons, .preview-order-controls { display: flex; flex-wrap: wrap; gap: 6px; }
button { border: 1px solid #cdd7e2; background: #fff; color: #05204a; padding: 8px 10px; border-radius: 5px; cursor: pointer; font: inherit; font-size: 12px; }
button:hover:not(:disabled) { background: #eef4fa; }
button:disabled { opacity: .5; cursor: default; }
.width-buttons button { display: flex; align-items: center; gap: 6px; }
.width-buttons button[aria-pressed="true"] { border-color: #007fa3; color: #007fa3; box-shadow: inset 0 0 0 1px #007fa3; background: #eef9fc; }
.row-pictogram { display: flex; width: 30px; height: 16px; gap: 2px; }
.row-pictogram i { flex: 1; border: 1px solid currentColor; border-radius: 2px; }
.height-slider { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; font-size: 13px; font-weight: 600; margin: 18px 0; color: #23344b; }
.height-slider input { grid-column: 1 / -1; width: 100%; margin: 0; accent-color: #007fa3; }
.layout-help { color: #536378; font-size: 12px; line-height: 1.5; margin: 12px 0; }
</style>
