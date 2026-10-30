<template>
  <p v-if="summary" class="chart-filter-summary">Filters: {{ summary }}</p>
</template>

<script>
import { filterDescription } from './aggregation';

export default {
  name: 'ChartFilterSummary',
  props: ['widget', 'catalog'],
  computed: { summary() { return filterDescription(this.widget, this.catalog); } }
};
</script>

<style scoped>
.chart-filter-summary { color: #536378; background: #eef4fb; padding: 7px 9px; border-radius: 4px; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; margin: 0 0 10px; }
</style>
