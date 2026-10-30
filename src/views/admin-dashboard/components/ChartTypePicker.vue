<template>
  <fieldset class="chart-type-picker" v-bind="fieldAttrs('chartType')" tabindex="-1" :disabled="disabled">
    <legend>{{ legend || 'Chart type' }}</legend>
    <div class="chart-type-grid">
      <label v-for="choice in choices" :key="choice.value" class="chart-type-choice" :class="{ active: value === choice.value, unavailable: choice.disabled }">
        <input type="radio" :name="widgetId + '-chart-type'" :value="choice.value" :checked="value === choice.value" :disabled="choice.disabled" @change="$emit('change', choice.value)" />
        <svg viewBox="0 0 72 44" aria-hidden="true" focusable="false">
          <g v-if="choice.value === 'pie'"><circle cx="36" cy="22" r="18" fill="#dce6f1" /><path d="M36 22 V4 A18 18 0 0 1 54 22 Z" fill="currentColor" /></g>
          <g v-else-if="choice.value === 'donut'"><circle cx="36" cy="22" r="14" fill="none" stroke="#dce6f1" stroke-width="8" /><path d="M36 8 A14 14 0 0 1 50 22" fill="none" stroke="currentColor" stroke-width="8" /></g>
          <g v-else-if="choice.value === 'bar'" fill="currentColor"><rect x="8" y="7" width="52" height="7" rx="2" /><rect x="8" y="19" width="38" height="7" rx="2" /><rect x="8" y="31" width="24" height="7" rx="2" /></g>
          <g v-else-if="choice.value === 'column'" fill="currentColor"><rect x="12" y="22" width="10" height="16" rx="2" /><rect x="31" y="7" width="10" height="31" rx="2" /><rect x="50" y="15" width="10" height="23" rx="2" /></g>
          <g v-else-if="choice.value === 'treemap'"><rect x="8" y="5" width="32" height="34" rx="2" fill="currentColor" /><rect x="43" y="5" width="21" height="19" rx="2" fill="#44a693" /><rect x="43" y="27" width="21" height="12" rx="2" fill="#e1a62a" /></g>
          <g v-else-if="choice.value === 'metric'"><rect x="8" y="5" width="56" height="34" rx="4" fill="#eef4fa" stroke="currentColor" stroke-width="2" /><path d="M17 15 H38 M17 25 H52" fill="none" stroke="currentColor" stroke-width="4" /></g>
          <g v-else-if="choice.value === 'area'"><path d="M8 36 L24 27 L40 30 L63 9 V39 H8 Z" fill="#c8e8f0" /><path d="M8 36 L24 27 L40 30 L63 9" fill="none" stroke="currentColor" stroke-width="3" /></g>
          <g v-else-if="['line', 'combo'].includes(choice.value)"><rect x="11" y="25" width="8" height="14" fill="#05204a" /><rect x="29" y="18" width="8" height="21" fill="#05204a" /><rect x="49" y="8" width="8" height="31" fill="#05204a" /><path d="M8 32 L27 22 L43 25 L64 6" fill="none" stroke="#037d50" stroke-width="3" /></g>
          <g v-else fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="5" width="56" height="34" rx="2" /><path d="M8 16 H64 M8 27 H64 M27 5 V39 M47 5 V39" /></g>
        </svg>
        <strong>{{ choice.label }}</strong><small>{{ choice.hint }}</small>
      </label>
    </div><validation-message :id="errorId('chartType')" :message="errorFor('chartType')" />
  </fieldset>
</template>

<script>
import ValidationMessage from './ValidationMessage.vue';
import { fieldValidation } from '../logic/editorValidation';
export default {
  mixins: [fieldValidation],
  components: { ValidationMessage },
  name: 'ChartTypePicker',
  props: ['widgetId', 'value', 'choices', 'disabled', 'legend'],
  emits: ['change']
};
</script>

<style scoped>
.chart-type-picker { margin: 0 0 14px; border: 0; padding: 0; min-width: 0; }
legend { font-weight: 600; font-size: 13px; margin-bottom: 8px; }
.chart-type-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.chart-type-choice { display: grid; grid-template-columns: 18px 1fr; gap: 4px 6px; padding: 9px; border: 1px solid #cbd5df; border-radius: 7px; color: #007fa3; cursor: pointer; min-width: 0; }
.chart-type-choice.active { border-color: #007fa3; background: #eef8fb; box-shadow: inset 0 0 0 1px #007fa3; }
.chart-type-choice svg { width: 100%; height: 42px; grid-column: 2; grid-row: 1; }
.chart-type-choice input { margin: 3px 0 0; grid-column: 1; grid-row: 1; }
strong, small { grid-column: 1 / -1; color: #23344b; }
strong { font-size: 12px; } small { font-size: 11px; line-height: 1.4; color: #536378; }
.unavailable, fieldset:disabled { opacity: 0.55; cursor: not-allowed; }
.chart-type-choice:focus-within { outline: 2px solid #007fa3; outline-offset: 2px; }
</style>
