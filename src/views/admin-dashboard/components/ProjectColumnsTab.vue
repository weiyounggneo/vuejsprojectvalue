<template>
  <div class="table-section project-columns-section">
    <div class="config-controls project-column-controls">
      <div class="project-column-intro">
        <h2>Project Columns</h2>
        <p>Add information such as a project owner, review date, or budget.</p>
        <p class="field-help">New columns are optional. Text columns can accept free text or choices from Master Data Configuration.</p>
      </div>
      <div class="column-control-actions">
        <button
          type="button"
          class="secondary-btn"
          @click="$emit('refresh', $event)"
          :disabled="isProcessing || isPageLoading || isProjectColumnsLoading"
        >
          {{ isProjectColumnsLoading ? 'Refreshing...' : 'Refresh' }}
        </button>
        <button
          type="button"
          class="primary-btn"
          @click="$emit('open-add', $event)"
          :disabled="isProcessing || isPageLoading || isProjectColumnsLoading || !!projectColumnsError"
        >
          + Add Project Column
        </button>
      </div>
    </div>

    <div v-if="projectColumnsError" class="column-error-panel" role="alert">
      <strong>Could not load project columns.</strong>
      <p>{{ projectColumnsError }}</p>
      <button
        type="button"
        class="secondary-btn"
        @click="$emit('refresh', $event)"
        :disabled="isProcessing || isProjectColumnsLoading"
      >
        {{ isProjectColumnsLoading ? 'Retrying...' : 'Try Again' }}
      </button>
    </div>

    <div v-else-if="isProjectColumnsLoading" class="column-loading" role="status" aria-live="polite">
      Loading project columns...
    </div>

    <div v-else class="project-columns-table">
      <vue-good-table
        :columns="projectColumnTableColumns"
        :rows="projectColumns"
        :pagination-options="{ enabled: true, perPage: 10 }"
        :search-options="{ enabled: true, placeholder: 'Search project columns...' }"
        :line-numbers="true"
      >
        <template #table-row="props">
          <span v-if="props.column.field === 'type'">
            {{ formatProjectColumnType(props.row.type) }}
          </span>
          <span v-else-if="props.column.field === 'formSection'">
            {{ formatProjectColumnSection(props.row) }}
          </span>
          <span v-else-if="props.column.field === 'inputMode'">
            {{ props.row.inputMode === 'dropdown' ? 'Dropdown' : props.row.type === 'text' ? 'Free text' : 'Typed input' }}
          </span>
          <span v-else-if="props.column.field === 'configCategory'">
            {{ props.row.configCategory ? formatCategoryName(props.row.configCategory) : '—' }}
          </span>
          <span v-else-if="props.column.field === 'state'" class="column-state-cell">
            <span
              class="status-badge"
              :class="props.row.state === 'ready' ? 'column-ready' : 'column-pending'"
            >
              {{ props.row.state === 'ready' ? 'Ready' : 'Setup incomplete' }}
            </span>
            <small v-if="props.row.lastError" class="column-setup-error">
              {{ props.row.lastError }}
            </small>
          </span>
          <span v-else-if="props.column.field === 'createdAt'">
            {{ formatDate(props.row.createdAt) }}
          </span>
          <span v-else-if="props.column.field === 'actions'">
            <button
              v-if="props.row.state === 'creating'"
              type="button"
              class="secondary-btn retry-column-btn"
              @click="$emit('retry-column', props.row)"
              :disabled="isProcessing || isPageLoading || isProjectColumnsLoading"
            >
              Retry setup
            </button>
            <span v-else-if="props.row.state === 'ready'" class="column-control-actions">
              <button type="button" class="secondary-btn" @click="$emit('edit-column', props.row)" :disabled="isProcessing || isPageLoading">Edit settings</button>
              <button v-if="props.row.inputMode === 'dropdown'" type="button" class="secondary-btn" @click="$emit('manage-options', props.row)" :disabled="isProcessing || isPageLoading">Manage options</button>
            </span>
          </span>
          <span v-else>{{ props.formattedRow[props.column.field] }}</span>
        </template>
        <template #emptystate>
          <div class="no-data-message">No project columns have been added yet. Use "Add Project Column" to create the first one.</div>
        </template>
      </vue-good-table>
      <p class="field-help column-table-note">
        Use Edit settings to change a label or switch a text column between free text and a dropdown. Manage options opens its linked Master Data category.
      </p>
    </div>
  </div>
</template>

<script>
import { VueGoodTable } from 'vue-good-table-next';
import { methods as formatters } from '../logic/formatters';

export default {
  name: 'ProjectColumnsTab',
  components: { VueGoodTable },
  props: [
    'formatProjectColumnType',
    'formatProjectColumnSection',
    'isPageLoading',
    'isProcessing',
    'isProjectColumnsLoading',
    'projectColumnTableColumns',
    'projectColumns',
    'projectColumnsError'
  ],
  emits: [
    'edit-column',
    'manage-options',
    'open-add',
    'refresh',
    'retry-column'
  ],
  methods: {
    ...formatters,
  },
};
</script>

<style scoped src="../styles/tables.css"></style>
<style scoped src="../styles/controls.css"></style>
<style scoped src="../styles/dialogs.css"></style>
<style scoped src="../styles/columns.css"></style>
