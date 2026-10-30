<template>
  <div class="metric-builder">
    <label>Calculation<select :value="definition.operation" :disabled="disabled" @change="chooseOperation($event.target.value)">
      <option v-for="operation in operations" :key="operation.value" :value="operation.value" :disabled="!operationAvailable(operation.value)">{{ operation.label }}</option>
    </select></label>
    <label v-if="definition.operation !== 'count'">{{ definition.operation === 'sum' ? 'Numeric column or savings measure' : 'Numeric column' }}
      <select :value="definition.source" :disabled="disabled" v-bind="validationAttrs" @change="chooseSource($event.target.value)">
        <option v-if="!sources.some(source => source.value === definition.source)" :value="definition.source">Unavailable column — choose another</option>
        <option v-for="source in sources" :key="source.value" :value="source.value">{{ source.label.replace(/^Total /, '') }}</option>
      </select>
    </label>
    <p v-if="definition.operation === 'count'">Counts every eligible project once. No numeric column is needed.</p>
    <p v-else-if="definition.operation === 'sum'">Adds each project's value once. Cumulative savings reads the selected year directly; annual increase subtracts the previous calendar year.</p>
    <p v-else>Uses valid, non-blank numeric values only; zero is included. Distinct Count counts unique numeric values, not projects. An empty selection displays 0.</p>
    <p v-if="!enabled">Additional calculations require the updated backend portfolio-layout.js module. Replace it, restart Node and Refresh.</p>
  </div>
</template>

<script>
import { METRIC_OPERATIONS, metricDefinition, metricValue } from '../../portfolio-layout/metricDefinitions';
export default {
  name: 'MetricBuilder',
  props: ['value', 'catalog', 'enabled', 'disabled', 'validationAttrs'],
  emits: ['change'],
  computed: {
    definition() { return metricDefinition(this.value); },
    operations() { return METRIC_OPERATIONS; },
    baseSources() { return this.catalog.measures.filter(measure => measure.value !== 'count' && !measure.value.startsWith('aggregate:')); },
    sources() { return this.baseSources.filter(source => this.definition.operation === 'sum' || source.value.startsWith('field:')); }
  },
  methods: {
    operationAvailable(operation) { return ['count', 'sum'].includes(operation) || this.enabled; },
    chooseOperation(operation) {
      if (this.disabled || !this.operationAvailable(operation)) return;
      const source = this.baseSources.find(item => item.value === this.definition.source && (operation === 'sum' || item.value.startsWith('field:')))
        || this.baseSources.find(item => operation === 'sum' || item.value.startsWith('field:'));
      const value = metricValue(operation, source?.value);
      if (this.catalog.measures.some(item => item.value === value)) this.$emit('change', value);
    },
    chooseSource(source) {
      const value = metricValue(this.definition.operation, source);
      if (!this.disabled && this.operationAvailable(this.definition.operation) && this.catalog.measures.some(item => item.value === value)) this.$emit('change', value);
    }
  }
};
</script>

<style scoped>
.metric-builder { padding: 10px; border: 1px solid #dce5ef; border-radius: 6px; margin: 10px 0; background: #f8fafc; }
label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 600; margin-bottom: 10px; }
select { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #bdccdc; border-radius: 5px; color: #23344b; background: white; }
select:focus-visible { outline: 3px solid #87baf2; outline-offset: 2px; }
p { font-size: 12px; line-height: 1.5; color: #536378; margin: 6px 0; }
</style>
