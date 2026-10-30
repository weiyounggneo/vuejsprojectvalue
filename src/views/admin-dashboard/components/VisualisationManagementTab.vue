<template>
  <section class="visualisation-manager" :style="editorStyle" @focusin="beginFieldEdit" @focusout="endFieldEdit">
    <div class="manager-heading">
      <div><h2>Visualisation Management</h2><p>Choose the charts, cards and tables shown in Portfolio Overview for everyone.</p></div>
    </div>
    <div ref="actionBar" class="manager-action-bar" role="region" aria-label="Layout actions" tabindex="-1">
      <div class="draft-status" role="status" aria-atomic="true">
        <strong :class="{ unsaved: dirty }">{{ saving ? 'Saving layout…' : conflict ? 'Save conflict — refresh to continue' : !loaded ? 'Loading layout…' : dirty ? 'Unsaved changes' : 'All changes saved' }}</strong>
        <span v-if="dirty" class="draft-summary">{{ draftSummary }}</span>
      </div>
      <button v-if="validationIssues.length" type="button" class="review-errors" :disabled="locked || gestureActive" @click="focusFirstIssue">Review {{ validationIssues.length }} {{ validationIssues.length === 1 ? 'issue' : 'issues' }}</button>
      <div class="manager-actions">
        <button @click="undo" :disabled="!canUndo || locked || gestureActive">Undo</button>
        <button @click="redo" :disabled="!canRedo || locked || gestureActive">Redo</button>
        <button @click="refresh" :disabled="saving || loading || busy || gestureActive">Refresh</button>
        <button @click="discard" :disabled="!dirty || saving || loading || busy || gestureActive">Discard changes</button>
        <button class="primary" @click="save" :disabled="!loaded || !dirty || locked || gestureActive">{{ saving ? 'Saving…' : 'Save Layout' }}</button>
      </div>
    </div>
    <p class="manager-help">Changes remain a draft until you click Save Layout. Users can apply the saved layout with Refresh Layout in Portfolio Overview.</p>
    <p v-if="error" class="manager-error" role="alert">{{ error }}</p>
    <p v-if="message" class="manager-success" role="status">{{ message }}</p>
    <p v-if="loading" class="manager-help">Loading layout…</p>
    <template v-if="loaded">
      <global-filter-settings ref="globalFilterSettings" :filters="globalFilters" :catalog="catalog" :enabled="globalFiltersEnabled"
        :disabled="locked || gestureActive" :validation-errors="globalFieldErrors" @change="applyGlobalFilters" @close="endFieldEdit" />
      <div class="add-controls">
        <button class="primary" ref="addChartButton" @click="openChartChooser" :disabled="locked || gestureActive || widgets.length >= 30" :aria-expanded="chartChooserOpen" aria-controls="chart-add-panel">+ Add Chart</button>
        <button ref="layoutActionsButton" type="button" @click="toggleLayoutActions" :disabled="locked || gestureActive" :aria-expanded="layoutActionsOpen" aria-controls="layout-actions-panel">Layout actions <span aria-hidden="true">▾</span></button>
      </div>
      <section v-if="layoutActionsOpen" id="layout-actions-panel" class="layout-actions-panel" aria-labelledby="layout-actions-title" @keydown.esc.stop="closeLayoutActions">
        <div class="layout-actions-heading"><h3 id="layout-actions-title">Layout actions</h3><button type="button" @click="closeLayoutActions">Done</button></div>
        <div class="restore-controls">
          <label for="restore-standard-item">Restore a standard item
            <select id="restore-standard-item" ref="restoreStandardSelect" v-model="standardToAdd" :disabled="locked || gestureActive"><option value="">Choose…</option><option v-for="item in catalog.builtins" :key="item.value" :value="item.value">{{ item.label }}</option></select>
          </label>
          <button type="button" @click="addStandard" :disabled="!canRestoreStandard">Add / Show</button>
        </div>
        <p class="manager-help">Show an existing standard item or add it back to the draft.</p>
        <div class="layout-reset-action"><button type="button" class="remove" @click="resetDefaults" :disabled="locked || gestureActive">Reset to standard layout</button><p class="manager-help">Replace all draft items and global filter controls with the standard layout. Save Layout applies it for everyone.</p></div>
      </section>
      <section v-if="chartChooserOpen" id="chart-add-panel" ref="chartAddPanel" class="chart-add-panel" aria-labelledby="chart-add-title" @keydown.esc="closeChartChooser">
        <h3 id="chart-add-title">Add a visualisation</h3><p class="manager-help">Choose a chart, table or summary card, then configure it in the inspector.</p>
        <chart-type-picker widget-id="new-chart" legend="Visualisation type" :value="chartTypeToAdd" :choices="addChartTypes" :disabled="locked || gestureActive" @change="chartTypeToAdd = $event" />
        <table-creation-controls v-if="chartTypeToAdd === 'table'" :draft="tableDraft" :catalog="catalog" :current-year="currentYear" :disabled="locked || gestureActive" @change="applyTableDraft" />
        <div v-if="chartTypeToAdd === 'table' && existingTables.length" class="duplicate-table-controls"><label for="duplicate-table-select">Or duplicate an existing table<select id="duplicate-table-select" v-model="tableToDuplicate" :disabled="locked || gestureActive"><option value="">Choose a table…</option><option v-for="widget in existingTables" :key="widget.id" :value="widget.id">{{ title(widget) }}</option></select></label><button type="button" @click="duplicateTableFromChooser" :disabled="!canDuplicateTable">Duplicate table</button></div>
        <div class="manager-actions"><button class="primary" @click="addChosenChart" :disabled="!canAddChosenChart">{{ chartTypeToAdd === 'table' ? 'Create table' : 'Add selected item' }}</button><button @click="closeChartChooser">Cancel</button></div>
      </section>
      <div class="editor-workspace" :class="{ focused: previewFocused }">
        <div class="preview-workspace">
          <live-portfolio-preview ref="livePreview" :widgets="widgets" :selected-id="selectedId" :rows="previewSelection.rows" :site-targets="previewFilteredTargets"
            :catalog="catalog" :current-year="currentYear" :selected-site="previewSite" :disabled="locked" :loading="previewLoading"
            :error="previewError || previewSelection.error" :target-error="previewTargetError" :dirty="dirty" :focused="previewFocused"
            :filter-summary="previewFilterSummary" :has-preview-filters="previewFilters.length > 0"
            :global-filters="globalFilters" :global-values="previewValues" :filter-rows="previewRows" :filter-targets="previewTargets"
            :master-sites="previewMasterSites" :config-error="previewConfigError"
            :global-filters-editable="globalFiltersEnabled" @edit-global-filter="$refs.globalFilterSettings.open($event)"
            @filter-change="setPreviewValues"
            :resizing-id="resizingId" :moving-id="reorderingId"
            @select="select" @resize="applyPreviewSize" @resize-start="startPreviewResize" @resize-end="endPreviewResize"
            @toggle-focus="togglePreviewFocus" @move="move"
            @reorder="reorderPreview" @reorder-start="startPreviewReorder" @reorder-end="endPreviewReorder" />
        </div>
        <aside ref="inspector" class="editor-inspector" tabindex="-1" v-show="!previewFocused" aria-label="Visualisation settings">
          <div class="inspector-header">
            <label class="inspector-picker" for="inspector-widget">Edit an item
              <select id="inspector-widget" :value="selectedId" :disabled="locked || gestureActive || !widgets.length" @change="selectInspectorItem($event.target.value)">
                <option v-if="!widgets.length" value="">No items yet</option>
                <option v-for="(widget, index) in widgets" :key="widget.id" :value="widget.id">{{ index + 1 }}. {{ title(widget) }}{{ widget.visible ? '' : ' (Hidden)' }}{{ errorsForWidget(widget.id).length ? ' — Needs attention' : '' }}</option>
              </select>
            </label>
            <details class="widget-list">
              <summary>Manage items <span>{{ widgets.length }}</span></summary>
              <div class="widget-list-scroll">
                <p class="manager-help">Move items up or down. Hide keeps its settings; Remove deletes only the visualisation.</p>
                <article v-for="(widget, index) in widgets" :key="widget.id" class="widget-row" :class="{ selected: widget.id === selectedId, hidden: !widget.visible }">
                  <button class="item-name" @click="selectInspectorItem(widget.id)" :disabled="locked || gestureActive"><span class="item-position">{{ index + 1 }}</span><span>{{ title(widget) }}<small>{{ description(widget) }}</small><span v-if="errorsForWidget(widget.id).length" class="item-issue-badge">Needs attention</span></span></button>
                  <div class="row-actions">
                    <label class="show-checkbox"><input type="checkbox" v-model="widget.visible" :disabled="locked" /> Show</label>
                    <button @click="move(index, -1)" :disabled="locked || index === 0" :aria-label="'Move ' + title(widget) + ' up'">↑</button>
                    <button @click="move(index, 1)" :disabled="locked || index === widgets.length - 1" :aria-label="'Move ' + title(widget) + ' down'">↓</button>
                    <button class="remove" @click="remove(widget)" :disabled="locked">Remove</button>
                  </div>
                </article>
                <p v-if="!widgets.length" class="manager-help">The layout is empty. Add a chart or restore a standard item.</p>
              </div>
            </details>
            <template v-if="selectedWidget">
              <h3 class="inspector-title">{{ title(selectedWidget) }}</h3>
              <button type="button" @click="duplicateSelected" :disabled="locked || gestureActive || widgets.length >= 30">Duplicate item</button>
              <p v-if="!selectedWidget.visible" class="hidden-item-note">Hidden from the dashboard. Enable Show in Manage items to preview it.</p>
              <div class="settings-tabs" role="tablist" aria-label="Visualisation settings sections">
                <button v-for="(tab, index) in settingsTabs" :key="tab.id" ref="settingsTabButtons" type="button" role="tab"
                  :id="'settings-tab-' + tab.id" :aria-controls="'settings-panel-' + tab.id" :aria-selected="settingsTab === tab.id"
                  :tabindex="settingsTab === tab.id ? 0 : -1" :disabled="locked || gestureActive"
                  @click="selectSettingsTab(tab.id)" @keydown="navigateSettingsTabs($event, index)">{{ tab.label }}<span v-if="errorsForTab(tab.id).length" class="tab-issue-dot" :aria-label="errorsForTab(tab.id).length + ' issues'">!</span></button>
              </div>
            </template>
          </div>
          <div class="widget-settings" v-if="selectedWidget">
            <chart-summary-card :key="selectedWidget.id" :widget="selectedWidget" :catalog="catalog" :current-year="currentYear" :preview-filters="previewFilters" />
            <fieldset :disabled="locked || gestureActive">
              <div v-if="validationIssues.some(issue => issue.widgetId === selectedId)" class="selected-issue-summary"><strong>Needs attention</strong><button v-for="issue in validationIssues.filter(item => item.widgetId === selectedId)" :key="issue.field" type="button" @click="focusIssue(issue)">{{ issue.message }}</button></div>
              <div id="settings-panel-data" role="tabpanel" aria-labelledby="settings-tab-data" v-show="settingsTab === 'data'" tabindex="0">
                <div class="validation-control"><label>Title<input v-model="selectedWidget.title" v-bind="fieldAttrs('title')" maxlength="100" placeholder="Projects by Saving Type" /></label><validation-message :id="errorId('title')" :message="selectedFieldErrors.title" /></div>
                <p class="manager-help">Use {year} to include the current year in the title.</p>
                <chart-type-picker :validation-errors="selectedFieldErrors" :validation-scope="selectedId" v-if="selectedChartTypes.length" :widget-id="selectedWidget.id" :value="selectedChartType" :choices="selectedChartTypes" :disabled="locked || gestureActive" @change="setChartType" />
                <p v-if="selectedChartTypes.some(type => type.comparison) && !flexibleComparisonEnabled" class="manager-help">Bar + Line selectors need the updated backend portfolio-layout.js. Restart Node and Refresh after replacing it.</p>
                <p v-if="selectedIsComparison" class="manager-help">Choose Bar value, Line value and X-axis below. Both series share one scale.</p>
                <p v-if="chartAdvice" class="manager-help" role="status">{{ chartAdvice }}</p>
                <p v-if="selectedChartTypes.some(type => type.enhanced) && !enhancedChartsEnabled" class="manager-help">New chart types and label controls need the updated backend portfolio-layout.js. Restart Node and Refresh after replacing it.</p>
                <p v-if="selectedChartTypes.length && !tableChartsEnabled" class="manager-help">Table views need the updated backend portfolio-layout.js module. Replace it, restart the backend and Refresh.</p>
                <p v-if="!selectedIsComparison && retainedSettings === selectedId + ':comparison'" class="manager-help">These Bar + Line settings are retained for this item. Repair them here; the current chart type stays the same.</p>
                <savings-comparison-controls :validation-errors="selectedFieldErrors" :validation-scope="selectedId" v-if="(selectedIsComparison || retainedSettings === selectedId + ':comparison') && flexibleComparisonEnabled" :widget="selectedWidget" :current-year="currentYear" :catalog="catalog" :metrics-enabled="guidedMetricsEnabled" @change="applyComparison" />
                <p v-if="!selectedIsTable && retainedSettings === selectedId + ':table'" class="manager-help">These table settings are retained for this item. Repair them here; the current chart type stays the same.</p>
                <table-configuration-controls ref="tableConfiguration" :validation-errors="selectedFieldErrors" :validation-scope="selectedId" v-if="(selectedIsTable || retainedSettings === selectedId + ':table') && tableConfigurationEnabled" :widget="selectedWidget" :catalog="catalog" :current-year="currentYear" :metrics-enabled="guidedMetricsEnabled" :adjustment-message="tableAdjustmentMessage" @undo-adjustment="undoTableAdjustment" @change="applyTable" />
                <p v-if="selectedIsTable && !tableConfigurationEnabled" class="manager-help">Row/column and multi-value settings need the updated backend portfolio-layout.js. Restart Node and Refresh after replacing it.</p>
                <template v-if="selectedWidget.kind === 'grouped' && !selectedIsTable && !selectedIsComparison">
                  <div class="validation-control"><label>Group projects by (optional)<select v-model="selectedWidget.groupBy" v-bind="fieldAttrs('groupBy')"><option value="" :disabled="!optionalGroupingEnabled">None — overall total</option><option v-if="missingGroup" :value="selectedWidget.groupBy">Unavailable column — choose another</option><option v-for="group in catalog.groups" :key="group.value" :value="group.value">{{ group.label }}{{ group.category ? ' (' + group.category + ')' : '' }}</option></select></label><validation-message :id="errorId('groupBy')" :message="selectedFieldErrors.groupBy" /></div>
                  <p class="manager-help">Choose None to show the selected measure as one overall total. Choose a category to split it into groups.</p>
                </template>
                <template v-if="selectedWidget.kind !== 'builtin' && !selectedIsTable && !selectedIsComparison">
                  <metric-builder :value="selectedWidget.measure" :catalog="catalog" :enabled="guidedMetricsEnabled" :validation-attrs="fieldAttrs('measure')" @change="setMetric" />
                  <validation-message :id="errorId('measure')" :message="selectedFieldErrors.measure" />
                </template>
                <div v-if="selectedWidget.kind === 'grouped' && selectedWidget.groupBy && !selectedIsTable && !selectedIsComparison" class="settings-row">
                  <div class="validation-control"><label v-if="selectedWidget.chartType !== 'table'">Maximum categories<input type="number" v-model.number="selectedWidget.maxCategories" v-bind="fieldAttrs('maxCategories')" min="3" max="20" /></label><validation-message :id="errorId('maxCategories')" :message="selectedFieldErrors.maxCategories" /></div>
                  <div class="validation-control"><label>Sort categories<select v-model="selectedWidget.sort" v-bind="fieldAttrs('sort')"><option value="valueDesc">Highest value first</option><option value="label">Alphabetical</option></select></label><validation-message :id="errorId('sort')" :message="selectedFieldErrors.sort" /></div>
                </div>
                <p v-if="selectedWidget.kind === 'builtin'" class="manager-help">This standard item uses the same calculations as Portfolio Overview. Use the other tabs to change its filters, appearance or layout.</p>
                <p v-if="!optionalGroupingEnabled && selectedWidget.kind === 'grouped'" class="manager-help">Optional grouping needs the updated backend portfolio-layout.js module. Replace it, restart the backend, then Refresh.</p>
              </div>
              <div id="settings-panel-filters" role="tabpanel" aria-labelledby="settings-tab-filters" v-show="settingsTab === 'filters'" tabindex="0">
                <div class="validation-control"><label v-if="selectedWidget.kind !== 'builtin'">PMO gate filter<select v-model="selectedWidget.filterGate" v-bind="fieldAttrs('filterGate')"><option value="ALL">All gates</option><option value="G1">G1</option><option value="G2">G2 (including G2.5)</option><option value="G3">G3</option><option value="Closure">Closure / Operationalised</option></select></label><validation-message :id="errorId('filterGate')" :message="selectedFieldErrors.filterGate" /></div>
                <chart-filter-controls :validation-errors="selectedFieldErrors" :validation-scope="selectedId" v-if="chartFiltersEnabled" :key="selectedWidget.id + '-filters'" :widget="selectedWidget"
                  :rows="previewRows" :catalog="catalog" @change="applyFilters" />
                <p v-else class="manager-help">Optional grouping and chart filters need the updated backend portfolio-layout.js module. Replace it, restart the backend, then Refresh.</p>
              </div>
              <div id="settings-panel-appearance" role="tabpanel" aria-labelledby="settings-tab-appearance" v-show="settingsTab === 'appearance'" tabindex="0">
                <div v-if="selectedDisplaySupported" class="chart-display-controls" v-bind="fieldAttrs('display')" tabindex="-1">
                  <h4>Chart labels</h4>
                  <label class="show-checkbox"><input type="checkbox" :checked="selectedDisplay.showValues" :disabled="!enhancedChartsEnabled" @change="setDisplay('showValues', $event.target.checked)" />Show values on chart</label>
                  <label v-if="selectedHasLegend" class="show-checkbox"><input type="checkbox" :checked="selectedDisplay.showLegend" :disabled="!enhancedChartsEnabled" @change="setDisplay('showLegend', $event.target.checked)" />Show legend</label>
                  <label v-if="selectedHasLines" class="show-checkbox"><input type="checkbox" :checked="selectedDisplay.smoothLines" :disabled="!enhancedChartsEnabled" @change="setDisplay('smoothLines', $event.target.checked)" />Smooth lines</label>
                  <validation-message :id="errorId('display')" :message="selectedFieldErrors.display" /><p class="manager-help">Value labels use the selected formatting. Turn them off when categories are crowded.</p>
                  <button v-if="selectedWidget.display" type="button" @click="resetDisplay" :disabled="!enhancedChartsEnabled">Reset chart labels</button>
                </div>
                <p v-if="selectedIsTable" class="manager-help">Set rows, columns and values in Data. Tables fit their content. Project counts stay as whole numbers; formatting applies to other values.</p>
                <widget-presentation-controls v-if="presentationEnabled" :key="selectedWidget.id" :widget="selectedWidget"
                  :rows="previewRows" :current-year="currentYear" :catalog="catalog" @change="applyPresentation" />
                <p v-else class="manager-help">Value formatting and colour controls need the updated backend portfolio-layout.js module. Replace that file and restart the backend, then Refresh.</p>
              </div>
              <div id="settings-panel-layout" role="tabpanel" aria-labelledby="settings-tab-layout" v-show="settingsTab === 'layout'" tabindex="0">
                <widget-layout-controls :validation-errors="selectedFieldErrors" :validation-scope="selectedId" :widget="selectedWidget" :index="selectedIndex" :count="widgets.length" :disabled="locked || gestureActive"
                  @resize="applyPreviewSize" @move="move" />
              </div>
            </fieldset>
          </div>
          <p v-else class="manager-help inspector-empty">Add a chart, card or standard item to start editing.</p>
        </aside>
      </div>
      <p class="manager-help">Layout widths adapt to smaller screens. Hiding a project column in the entry form does not hide its charts; control charts here.</p>
      <p v-if="updatedBy" class="manager-help">Last saved by {{ updatedBy }}<template v-if="updatedAt"> · {{ updatedAt }}</template></p>
    </template>
  </section>
</template>

<script>
import ValidationMessage from './ValidationMessage.vue';
import MetricBuilder from './MetricBuilder.vue';
import ChartSummaryCard from './ChartSummaryCard.vue';
import { createFeedbackState, computed as feedbackComputed, methods as feedbackMethods, watch as feedbackWatch } from '../logic/editorFeedback';
import LivePortfolioPreview from './LivePortfolioPreview.vue';
import GlobalFilterSettings from './GlobalFilterSettings.vue';
import WidgetPresentationControls from './WidgetPresentationControls.vue';
import ChartFilterControls from './ChartFilterControls.vue';
import TableConfigurationControls from './TableConfigurationControls.vue';
import TableCreationControls from './TableCreationControls.vue';
import ChartTypePicker from './ChartTypePicker.vue';
import SavingsComparisonControls from './SavingsComparisonControls.vue';
import WidgetLayoutControls from './WidgetLayoutControls.vue';
import { createVisualisationState, computed, methods } from '../logic/visualisations';
import { computed as historyComputed, methods as historyMethods, watch as historyWatch } from '../logic/draftHistory';

export default {
  name: 'VisualisationManagementTab',
  components: { ChartSummaryCard, MetricBuilder, ValidationMessage, LivePortfolioPreview, GlobalFilterSettings, WidgetPresentationControls, ChartFilterControls, WidgetLayoutControls, TableConfigurationControls, TableCreationControls, ChartTypePicker, SavingsComparisonControls },
  props: ['apiBaseUrl', 'apiFetch', 'busy', 'active'],
  data() { return { ...createVisualisationState(), ...createFeedbackState() }; },
  computed: { ...computed, ...historyComputed, ...feedbackComputed },
  methods: { ...methods, ...historyMethods, ...feedbackMethods },
  watch: { ...historyWatch, ...feedbackWatch, active(value) { if (value && !this.loaded) this.load(); if (value) this.$nextTick(() => this.measureToolbar()); } },
  mounted() { this.observeToolbar(); if (this.active) this.load(); },
  beforeUnmount() { this.disconnectToolbar(); }
};
</script>

<style scoped src="../styles/visualisations.css"></style>
