<template>
  <section id="visualisation-live-preview" class="live-portfolio-preview">
    <div class="preview-heading">
      <h3>Live Preview <span>{{ dirty ? 'Unsaved draft' : 'Saved layout' }}</span></h3>
      <button type="button" @click="$emit('toggle-focus')" :disabled="disabled">{{ focused ? 'Edit layout' : 'Focus Preview' }}</button>
    </div>
    <p class="preview-help">Drag the Move handle to reorder an item. Drag its bottom-right corner to resize. Changes apply after Save Layout.</p>
    <global-filter-bar :filters="globalFilters" :values="globalValues" :rows="filterRows" :site-targets="filterTargets" :master-sites="masterSites" :catalog="catalog"
      :project-count="filteredDashboardRows.length" :disabled="disabled || loading || !!resizingId || !!movingId" :has-target-comparison="true" :editable="globalFiltersEditable"
      @change="$emit('filter-change', $event)" @edit-filter="$emit('edit-global-filter', $event)" />
    <p class="preview-scope" role="status">{{ currentYear }} · {{ filterSummary || 'All sites and categories' }} · {{ filteredDashboardRows.length }} projects · On-Hold and Cancelled projects excluded</p>
    <p v-if="configError" class="preview-warning" role="status">{{ configError }}</p>
    <p v-if="loading" class="preview-help" role="status">Loading project data and site targets…</p>
    <p v-else-if="error" class="preview-error" role="alert">{{ error }}</p>
    <template v-else>
      <p v-if="!eligiblePortfolioRows.length" class="preview-help">{{ hasPreviewFilters ? 'No projects match the global filters. Choose All or reset the filters to show more projects.' : 'No eligible projects to preview. You can still arrange and resize the empty layout.' }}</p>
      <div ref="previewGrid" class="live-widget-grid">
        <section v-for="widget in visibleWidgets" :key="widget.id" ref="previewWidgets" class="chart-card live-widget"
          :class="{ selected: widget.id === selectedId, 'full-width': widget.width === 12, moving: widget.id === movingId,
            'drop-before': dropTarget?.targetId === widget.id && dropTarget?.placement === 'before',
            'drop-after': dropTarget?.targetId === widget.id && dropTarget?.placement === 'after' }"
          :style="{ '--widget-span': widget.width }" :data-preview-widget-id="widget.id"
          @click="$emit('select', widget.id)">
          <div class="chart-header"><h3 class="chart-title"><button type="button" :disabled="disabled"
            :aria-pressed="selectedId === widget.id" @click.stop="$emit('select', widget.id)">{{ title(widget) }}</button></h3>
            <chart-move-handle :widget="widget" :disabled="disabled || !!resizingId || (!!movingId && movingId !== widget.id)" :grid-element="gridElement"
              @select="$emit('select', $event)" @start="$emit('reorder-start', $event)" @hover="dropTarget = $event"
              @reorder="$emit('reorder', $event)" @end="$emit('reorder-end', $event)" />
          </div>
          <chart-filter-summary :widget="widget" :catalog="catalog" />
          <p v-if="targetError && needsTargets(widget)" class="preview-error">{{ targetError }}</p>
          <portfolio-standard-widget v-else-if="widget.kind === 'builtin'" :widget="widget" :context="previewContext" :catalog="catalog" />
          <configured-chart v-else :widget="widget" :rows="filteredDashboardRows" :current-year="currentYear" :catalog="catalog" :table-source="{ siteTargets, selectedSite: dashboardFilter.selectedSite, cardsStartYear, trackingYears, targetError }" />
          <chart-resize-handle :widget="widget" :disabled="disabled || !!movingId" :grid-metrics="gridMetrics"
            @select="$emit('select', $event)" @resize="$emit('resize', $event)"
            @start="$emit('resize-start', $event)" @end="$emit('resize-end', $event)" />
        </section>
        <div v-if="movingId" data-drop-end class="drop-end-zone" :class="{ active: dropTarget?.placement === 'end' }">Drop here to move to the end</div>
        <p v-if="!visibleWidgets.length" class="preview-empty">No items are enabled. Add an item or check Show in the settings list.</p>
      </div>
    </template>
    <p class="preview-help">The preview fits the available space. Use the Layout tab on the right to choose charts per row and chart height. You can also resize charts directly from their corner.</p>
  </section>
</template>

<script>
import ConfiguredChart from '../../portfolio-layout/ConfiguredChart.vue';
import GlobalFilterBar from '../../portfolio-layout/GlobalFilterBar.vue';
import ChartFilterSummary from '../../portfolio-layout/ChartFilterSummary.vue';
import ChartResizeHandle from '../../portfolio-layout/ChartResizeHandle.vue';
import ChartMoveHandle from './ChartMoveHandle.vue';
import PortfolioStandardWidget from '../../manager-yearly/components/PortfolioStandardWidget.vue';
import { createPreviewState, computed, methods } from '../logic/portfolioPreview';

export default {
  name: 'LivePortfolioPreview',
  components: { ConfiguredChart, GlobalFilterBar, ChartResizeHandle, ChartMoveHandle, PortfolioStandardWidget, ChartFilterSummary },
  props: ['widgets', 'selectedId', 'rows', 'siteTargets', 'catalog', 'currentYear', 'selectedSite', 'filterSummary', 'hasPreviewFilters', 'globalFilters', 'globalValues', 'globalFiltersEditable', 'filterRows', 'filterTargets', 'masterSites', 'disabled', 'loading', 'error', 'targetError', 'configError', 'dirty', 'focused', 'resizingId', 'movingId'],
  emits: ['select', 'resize', 'resize-start', 'resize-end', 'toggle-focus', 'move', 'reorder', 'reorder-start', 'reorder-end', 'filter-change', 'edit-global-filter'],
  data: createPreviewState,
  computed,
  methods
};
</script>

<style scoped src="../../manager-yearly/styles/dashboard.css"></style>
<style scoped src="../styles/livePreview.css"></style>
