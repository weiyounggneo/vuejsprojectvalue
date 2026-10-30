<template>
  <div class="grid-section">

    <timeline-window v-bind="timelineWindowProps" @year-change="$emit('year-change', $event)" @apply-window="(start, end) => $emit('apply-window', start, end)" />


    <div class="actions" style="margin: 0 20px 16px 20px; background: white; padding: 16px 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); border: 1px solid #e0e6ed; justify-content: flex-start;">

      <button v-if="isEditor" class="primary-btn" @click="$emit('open-add', $event)" :disabled="isProcessing || isPageLoading || !!tableLoadError || !columnVisibilityLoaded || !!columnVisibilityError">Add</button>
      <button v-if="isEditor" class="primary-btn" @click="$emit('open-update', $event)" :disabled="isProcessing || isPageLoading || !selectedRow || !!tableLoadError || !columnVisibilityLoaded || !!columnVisibilityError">
        Update
      </button>

      <div v-if="isEditor" class="divider"></div>
      <button class="view-btn" @click="$emit('open-history', $event)" :disabled="isProcessing || isPageLoading || !selectedRow">
        View History
      </button>
      <button class="view-btn" v-if="isAdmin" @click="$emit('open-global-history', $event)" :disabled="isProcessing || isPageLoading">
        Global Audit Log
      </button>


      <div v-if="isAdmin" class="divider"></div>
      <div v-if="isAdmin" style="display: flex; align-items: center; gap: 8px; padding-left: 4px;">
        <label style="font-size: 0.85rem; font-weight: bold; color: #07254a; margin: 0;">Target Month:</label>
        <input 
          type="month" 
          v-model="snapshotMonth" 
          class="inline-input" 
          style="min-height: unset; height: 36px; width: auto; padding: 4px 8px;" 
          :disabled="isProcessing || isPageLoading" 
        />
        <button 
          class="view-btn" 
          @click="$emit('snapshot', $event)" 
          :disabled="isProcessing || isPageLoading || !manualSnapshotMonth" 
          style="background-color: #d93025 !important;"
        >
          Force Snapshot
        </button>
      </div>

      <div class="divider"></div>
      <button @click="$emit('financial-view', $event)" :disabled="isProcessing || isPageLoading" class="view-btn">
        Financial View
      </button>
      <button @click="$emit('timeline-view', $event)" :disabled="isProcessing || isPageLoading" class="view-btn">
        Timeline View
      </button>
      <button @click="$emit('global-view', $event)" :disabled="isProcessing || isPageLoading" class="view-btn">
        Global View
      </button>
      <button @click="$emit('open-column-manager')" :disabled="isProcessing || isPageLoading" class="view-btn">
        Show / Hide Columns
      </button>
      <button @click="$emit('refresh', $event)" :disabled="isProcessing || isPageLoading" class="view-btn">
        Refresh Data & Columns
      </button>
    </div>


    <div class="filters-bar">


      <div class="filter-group custom-dropdown-wrapper">
        <label>Search Project Name:</label>
        <input 
          type="text" 
          :value="filters.projectName" @input="$emit('filter-change', 'projectName', $event.target.value); $emit('open-project-dropdown')" 
          placeholder="Type or select a project..." 
          @focus="$emit('open-project-dropdown')"
          @blur="$emit('close-project-dropdown', $event)"
          class="filter-input"
        />


        <ul 
          v-if="showProjectDropdown && filteredProjectNames.length > 0" 
          class="custom-dropdown-menu"
        >
          <li 
            v-for="name in filteredProjectNames" 
            :key="name"
            @mousedown.prevent="$emit('select-project', name)"
          >
            {{ name }}
          </li>
        </ul>
      </div>

      <div class="filter-group">
        <label>Filter by Pillar:</label>
        <select :value="filters.pillar" @change="$emit('filter-change', 'pillar', $event.target.value)">
          <option value="">-- All Pillars --</option>
          <option v-for="pillar in uniquePillars" :key="pillar" :value="pillar">{{ pillar }}</option>
        </select>
      </div>


      <div class="filter-group">
        <label>Filter by Site:</label>
        <div style="display: flex; gap: 8px;">
          <select :value="filters.site" @change="$emit('filter-change', 'site', $event.target.value)" style="flex: 1;">
            <option value="">-- All Sites --</option>
            <option v-for="site in uniqueSites" :key="site" :value="site">{{ site }}</option>
          </select>
          <button class="cancel" style="padding: 8px 16px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; color: white;" @click="$emit('clear-filters', $event)">
            Clear Filters
          </button>
        </div>
      </div>

    </div>

    <div class="table-section">
      <div v-if="tableLoadError" class="project-data-error" role="alert">{{ tableLoadError }}</div>
      <div v-if="columnVisibilityError" class="project-data-error" role="alert">{{ columnVisibilityError }} Editing is paused until visibility loads. Use "Refresh Data &amp; Columns" to retry.</div>
      <div v-if="projectFieldsError" class="project-fields-notice" role="status">
        Added project fields could not be loaded: {{ projectFieldsError }} Use "Refresh Data & Columns" to retry.
      </div>

      <div v-if="isEditor" class="inline-edit-hint">
        💡 <strong>Tip:</strong> Double-click an editable cell to update its value. Use the data entry form to choose or clear actual milestone dates. For multiple sites, separate them with commas (e.g., BSK, MUA).
      </div>

      <div class="horizontal-scroll-wrapper">
        <vue-good-table
          :key="tableViewVersion"
          :columns="tableColumns"
          :rows="filteredRows"
          :pagination-options="{ enabled: true, perPage: 10 }"
          :line-numbers="true"
          @row-click="$emit('select-row', $event)"
          :row-style-class="rowClassFn"
        >
          <template #table-row="props">
            <span>

              <div v-if="editingCell.rowId === props.row.projectId && editingCell.field === props.column.field" style="width: 100%;">
                <select
                  v-if="props.column.customInputMode === 'dropdown'"
                  v-model="editingValue"
                  @blur="$emit('save-edit', props.row)"
                  @keyup.enter="$emit('save-edit', props.row)"
                  @keyup.esc="$emit('cancel-edit', $event)"
                  v-focus
                  class="inline-input"
                >
                  <option :value="null">(Blank)</option>
                  <option v-if="editValue != null && !(props.column.customOptions || []).includes(editValue)" :value="editValue" disabled>{{ editValue }} (refresh options)</option>
                  <option v-for="option in props.column.customOptions" :key="option" :value="option">{{ option }}</option>
                </select>
                <select
                  v-else-if="props.column.customType === 'boolean'"
                  v-model="editingValue"
                  @blur="$emit('save-edit', props.row)"
                  @keyup.enter="$emit('save-edit', props.row)"
                  @keyup.esc="$emit('cancel-edit', $event)"
                  v-focus
                  class="inline-input"
                >
                  <option :value="null">(Blank)</option>
                  <option :value="true">Yes</option>
                  <option :value="false">No</option>
                </select>
                <input
                  v-else-if="props.column.customType === 'url'"
                  type="url"
                  maxlength="2048"
                  placeholder="https://..."
                  v-model="editingValue"
                  @blur="$emit('save-edit', props.row)"
                  @keyup.enter="$emit('save-edit', props.row)"
                  @keyup.esc="$emit('cancel-edit', $event)"
                  v-focus
                  class="inline-input"
                />
                <input
                  v-else-if="props.column.customType === 'number'"
                  type="text"
                  inputmode="decimal"
                  v-model="editingValue"
                  @blur="$emit('save-edit', props.row)"
                  @keyup.enter="$emit('save-edit', props.row)"
                  @keyup.esc="$emit('cancel-edit', $event)"
                  v-focus
                  class="inline-input"
                />
                <input
                  v-else-if="props.column.formatType === 'date' || props.column.customType === 'date'"
                  type="date"
                  v-model="editingValue"
                  :min="props.column.customType === 'date' ? '1000-01-01' : undefined"
                  :max="props.column.customType === 'date' ? '9999-12-31' : undefined"
                  @blur="$emit('save-edit', props.row)"
                  @keyup.enter="$emit('save-edit', props.row)"
                  @keyup.esc="$emit('cancel-edit', $event)"
                  v-focus
                  class="inline-input"
                />
                <input
                  v-else-if="props.column.type === 'text'"
                  type="text"
                  v-model="editingValue"
                  :maxlength="props.column.customType === 'text' ? 255 : undefined"
                  @blur="$emit('save-edit', props.row)"
                  @keyup.enter="$emit('save-edit', props.row)"
                  @keyup.esc="$emit('cancel-edit', $event)"
                  v-focus
                  class="inline-input"
                />
                <input
                  v-else
                  type="number"
                  step="any"
                  v-model="editingValue"
                  @blur="$emit('save-edit', props.row)"
                  @keyup.enter="$emit('save-edit', props.row)"
                  @keyup.esc="$emit('cancel-edit', $event)"
                  v-focus
                  class="inline-input"
                />
              </div>


              <div
                v-else
                @dblclick.stop="$emit('start-edit', props.row, props.column.field, props.row[props.column.field])"
                class="editable-cell"
                :class="{ 'readonly-cell': !canEditField(props.column.field) }"
                :title="canEditField(props.column.field) ? 'Double-click to edit' : ''"
              >
                <template v-if="props.column.customColumn">
                  {{ formatCustomField(props.column.customColumn, props.row.customFields?.[props.column.customColumn]) }}
                </template>
                <template v-else-if="props.column.field === 'projectName'">
                  <strong>{{ props.row.projectName }}</strong>
                </template>
                <template v-else-if="props.column.formatType === 'currency'">
                  {{ formatCurrency(props.row[props.column.field]) }}
                </template>
                <template v-else-if="props.column.formatType === 'percent'">
                  {{ formatPercent(props.row[props.column.field]) }}
                </template>
                <template v-else-if="props.column.formatType === 'date'">
                  {{ formatDate(props.row[props.column.field]) }}
                </template>
                <template v-else>
                  {{ props.row[props.column.field] ?? '-' }}
                </template>
              </div>
            </span>
          </template>

          <template #emptystate>
            <div class="no-data-message">No project data available. Click 'Add' to begin.</div>
          </template>
        </vue-good-table>
      </div>
    </div>


    <div v-if="selectedRow" class="audit-panel">
      <h4>Selected Project Metadata</h4>
      <div class="audit-grid">
        <div><strong>Project ID:</strong> {{ selectedRow.projectId || '-' }}</div>
        <div><strong>Project Name:</strong> {{ selectedRow.projectName || '-' }}</div>
        <div><strong>Project Status:</strong> {{ selectedRow.projectStatus || '-' }}</div>
        <div><strong>Pillars:</strong> {{ selectedRow.pillars || '-' }}</div>
        <div><strong>Sites:</strong> {{ selectedRow.sites || '-' }}</div>
        <div><strong>Current PMO Gate:</strong> {{ selectedRow.currentPmoGate || '-' }}</div>
        <div><strong>DTIT Involved:</strong> {{ selectedRow.dtitInvolved || '-' }}</div>
        <div><strong>AI/AA/A Type:</strong> {{ selectedRow.aiAaAType || '-' }}</div>
        <div><strong>FOAK/NOAK:</strong> {{ selectedRow.foakNoak || '-' }}</div>
        <div v-for="field in projectFields" :key="field.columnName">
          <strong>{{ field.label }}:</strong> <project-field-value :field="field" :value="selectedRow.customFields?.[field.columnName]" :format-custom-field="formatCustomField" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { VueGoodTable } from 'vue-good-table-next';
import TimelineWindow from './TimelineWindow.vue';
import ProjectFieldValue from './ProjectFieldValue.vue';
import { methods as formatters } from '../logic/formatters';

export default {
  name: 'GridSection',
  components: { VueGoodTable, TimelineWindow, ProjectFieldValue },
  props: [
    'canEditField',
    'columnVisibilityError',
    'columnVisibilityLoaded',
    'currentYear',
    'defaultTimelineEnd',
    'defaultTimelineStart',
    'editValue',
    'editingCell',
    'filteredProjectNames',
    'filteredRows',
    'filters',
    'formatCustomField',
    'isAdmin',
    'isEditor',
    'isPageLoading',
    'isProcessing',
    'manualSnapshotMonth',
    'projectFields',
    'projectFieldsError',
    'rowClassFn',
    'selectedRow',
    'showProjectDropdown',
    'tableColumns',
    'tableLoadError',
    'tableViewVersion',
    'timelineConfig',
    'timelineWindowLabel',
    'trackingYears',
    'uniquePillars',
    'uniqueSites'
  ],
  emits: [
    'apply-window',
    'cancel-edit',
    'clear-filters',
    'close-project-dropdown',
    'filter-change',
    'financial-view',
    'global-view',
    'open-add',
    'open-column-manager',
    'open-global-history',
    'open-history',
    'open-project-dropdown',
    'open-update',
    'refresh',
    'save-edit',
    'select-project',
    'select-row',
    'snapshot',
    'start-edit',
    'timeline-view',
    'update:editValue',
    'update:manualSnapshotMonth',
    'year-change'
  ],
  directives: { focus: { mounted(el) { el.focus(); } } },
  computed: {
    timelineWindowProps() { return { timelineConfig: this.timelineConfig, timelineWindowLabel: this.timelineWindowLabel, trackingYears: this.trackingYears, defaultTimelineStart: this.defaultTimelineStart, defaultTimelineEnd: this.defaultTimelineEnd, currentYear: this.currentYear }; },
    snapshotMonth: { get() { return this.manualSnapshotMonth; }, set(value) { this.$emit('update:manualSnapshotMonth', value); } },editingValue: { get() { return this.editValue; }, set(value) { this.$emit('update:editValue', value); } },
  },
  methods: {
    ...formatters,

  },
};
</script>

<style scoped src="../styles/grid.css"></style>
<style scoped src="../styles/table.css"></style>
<style scoped src="../styles/responsive.css"></style>
