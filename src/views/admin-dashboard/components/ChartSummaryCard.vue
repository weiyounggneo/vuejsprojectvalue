<template>
  <section v-if="summary" class="chart-summary" :aria-labelledby="headingId">
    <div class="chart-summary-heading">
      <h4 :id="headingId"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="2.5" width="14" height="15" rx="2" /><path d="M6 6h8M6 10h8M6 14h5" /></svg>What this shows</h4>
      <span class="summary-type">{{ summary.type }}</span>
    </div>
    <p class="summary-sentence">{{ summary.sentence }}</p>
    <div class="summary-meta"><span>{{ summary.period }}</span><span v-if="summary.hidden" class="summary-hidden">Hidden from portfolio</span></div>
    <dl class="summary-scopes">
      <div><dt>Chart filters</dt><dd>{{ summary.chartScope }}</dd></div>
      <div v-if="summary.previewScope" class="summary-preview-scope"><dt>Preview only <span>Not saved</span></dt><dd>{{ summary.previewScope }}</dd></div>
    </dl>
    <div v-if="summary.warnings.length" class="summary-warning"><strong>Keep in mind</strong><p v-for="warning in summary.warnings" :key="warning">{{ warning }}</p></div>
    <details class="summary-details">
      <summary>Calculation &amp; scope</summary>
      <div class="summary-detail-body">
        <dl><div><dt>Arrangement</dt><dd>{{ summary.axis }}</dd></div><div v-for="(detail, index) in summary.valueDetails" :key="index"><dt>{{ detail.label }}</dt><dd>{{ detail.value }}</dd></div></dl>
        <div v-if="summary.chartFilters.length"><h5>Chart filters · saved with this item</h5><ul><li v-for="(filter, index) in summary.chartFilters" :key="index">{{ filter }}</li></ul></div>
        <div v-if="summary.previewFilters.length"><h5>Preview filters · this session only</h5><ul><li v-for="(filter, index) in summary.previewFilters" :key="index">{{ filter }}</li></ul></div>
        <h5>How values are calculated</h5><ul><li v-for="note in summary.notes" :key="note">{{ note }}</li></ul>
      </div>
    </details>
  </section>
</template>

<script>
import { chartSummary } from '../logic/chartSummary';

export default {
  name: 'ChartSummaryCard',
  props: ['widget', 'catalog', 'currentYear', 'previewFilters'],
  computed: {
    headingId() { return 'chart-summary-' + this.widget.id; },
    summary() { return chartSummary(this.widget, this.catalog, this.currentYear, this.previewFilters); }
  }
};
</script>

<style scoped>
.chart-summary { margin-bottom: 18px; border: 1px solid #d5e2ee; border-radius: 9px; background: #f6f9fd; color: #243e60; overflow-wrap: anywhere; }
.chart-summary-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 12px 12px 0; }
.chart-summary h4 { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; margin: 0; }
.chart-summary h4 svg { flex-shrink: 0; color: #1f5fa8; }
.summary-type { font-size: 11px; padding: 3px 7px; border-radius: 4px; background: #e7eff8; color: #244e7c; }
.summary-sentence { font-size: 14px; font-weight: 600; line-height: 1.55; margin: 10px 12px 8px; }
.summary-meta { display: flex; align-items: center; gap: 6px 12px; flex-wrap: wrap; margin: 0 12px 12px; color: #536378; font-size: 12px; }
.summary-hidden { background: #e7edf3; padding: 3px 6px; border-radius: 4px; }
.summary-scopes { margin: 0 12px 12px; font-size: 12px; line-height: 1.5; }
.summary-scopes > div { display: grid; grid-template-columns: 78px minmax(0, 1fr); gap: 8px; }
.summary-scopes > div + div { margin-top: 9px; }
.chart-summary dt { font-weight: 700; margin-bottom: 3px; }
.chart-summary dd { margin: 0; color: #536378; }
.summary-preview-scope { border-left: 2px solid #7d96ae; padding-left: 8px; }
.summary-preview-scope dt span { display: block; font-weight: 400; color: #536378; }
.summary-warning { margin: 0 12px 12px; padding: 8px; border-left: 3px solid #946019; background: #fff6e7; color: #70480f; font-size: 12px; line-height: 1.5; }
.summary-warning p { margin: 4px 0 0; }
.summary-details { border-top: 1px solid #d5e2ee; }
.summary-details > summary { cursor: pointer; padding: 8px 12px; font-size: 12px; font-weight: 600; line-height: 20px; min-height: 20px; box-sizing: content-box; }
.summary-details > summary:hover { background: #edf3fa; }
.summary-details > summary:focus-visible { outline: 2px solid #007fa3; outline-offset: -3px; border-radius: 4px; }
.summary-detail-body { padding: 0 12px 12px; font-size: 12px; line-height: 1.6; }
.summary-detail-body dl { margin: 0; }
.summary-detail-body dl > div { margin-bottom: 9px; }
.chart-summary h5 { margin: 12px 0 5px; font-size: 12px; }
.chart-summary ul { padding-left: 18px; margin: 0; color: #536378; }
.chart-summary li + li { margin-top: 7px; }
</style>
