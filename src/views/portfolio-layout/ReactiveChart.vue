<template>
  <apexchart v-bind="$attrs" :key="renderRevision" :type="type" :height="height" :width="width" :options="detachedOptions" :series="detachedSeries" />
</template>

<script>
import VueApexCharts from 'vue3-apexcharts';
import { copyChartValue } from './chartRendering';

export default {
  name: 'ReactiveChart',
  components: { apexchart: VueApexCharts },
  inheritAttrs: false,
  props: { options: Object, series: Array, type: String, height: [String, Number],
    width: { type: [String, Number], default: '100%' } },
  data() { return { renderRevision: 0 }; },
  computed: {
    detachedOptions() { return copyChartValue(this.options); },
    detachedSeries() { return copyChartValue(this.series); }
  },
  // Some installed wrapper versions JSON-clone reactive options, dropping
  // formatter callbacks. Remount before passing changed props to that wrapper
  // so every draw receives the original options, including their functions.
  watch: {
    options: { deep: true, flush: 'sync', handler() { this.renderRevision += 1; } },
    series: { deep: true, flush: 'sync', handler() { this.renderRevision += 1; } },
    type() { this.renderRevision += 1; },
    height() { this.renderRevision += 1; },
    width() { this.renderRevision += 1; }
  }
};
</script>
