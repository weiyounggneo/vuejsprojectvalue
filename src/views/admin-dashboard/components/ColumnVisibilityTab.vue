<template>
  <div class="table-section project-columns-section">
    <div class="config-controls project-column-controls">
      <div class="project-column-intro">
        <h2>Column Visibility</h2>
        <p>Choose the columns shown in the data entry grid and Add / Update forms for everyone.</p>
        <p class="field-help">Uncheck a column to hide it. Its saved values are kept. Project ID, Project Name and yearly savings are always available in the forms.</p>
      </div>
      <button type="button" class="secondary-btn" @click="$emit('refresh', $event)" :disabled="isProcessing || isColumnVisibilityLoading">
        {{ isColumnVisibilityLoading ? 'Refreshing...' : 'Refresh' }}
      </button>
    </div>
    <div v-if="columnVisibilityError" class="column-error-panel" role="alert">
      <strong>Could not load or save column visibility.</strong>
      <p>{{ columnVisibilityError }}</p>
      <button type="button" class="secondary-btn" @click="$emit('refresh', $event)" :disabled="isProcessing || isColumnVisibilityLoading">Try Again</button>
    </div>
    <div v-if="isColumnVisibilityLoading" class="column-loading" role="status">Loading column visibility...</div>
    <div v-if="columnVisibilityLoaded && !isColumnVisibilityLoading" class="visibility-settings">
      <div class="visibility-toolbar">
        <input id="visibility-search" type="search" v-model="search" placeholder="Search columns..." aria-label="Search columns" :disabled="isProcessing" />
        <button type="button" class="secondary-btn" @click="$emit('set-all', true)" :disabled="isProcessing">Show all optional columns</button>
        <button type="button" class="secondary-btn" @click="$emit('set-all', false)" :disabled="isProcessing">Hide all optional columns</button>
      </div>
      <section v-for="group in visibilityGroups" :key="group.name" class="visibility-group">
        <h3>{{ group.name }}</h3>
        <div class="visibility-options">
          <label v-for="column in group.columns" :key="column.field" class="visibility-option">
            <input type="checkbox" :checked="column.visible" @change="$emit('toggle-column', column.field, $event.target.checked)" :disabled="column.required || isProcessing" />
            <span>{{ column.label }}<small v-if="column.required">Required</small></span>
          </label>
        </div>
      </section>
      <p v-if="!visibilityGroups.length" class="field-help">No columns match your search.</p>
      <p class="field-help">Grid view presets can hide additional columns. Columns hidden here stay hidden in every grid view.</p>
      <p v-if="columnVisibilityUpdatedBy" class="field-help">Last saved by {{ columnVisibilityUpdatedBy }}<span v-if="columnVisibilityUpdatedAt"> on {{ formatDate(columnVisibilityUpdatedAt) }}</span>.</p>
      <div class="visibility-actions">
        <button type="button" class="primary-btn" @click="$emit('save', $event)" :disabled="isProcessing || !columnVisibilityDirty">{{ isProcessing ? 'Saving...' : 'Save Visibility' }}</button>
        <button type="button" class="secondary-btn" @click="$emit('discard', $event)" :disabled="isProcessing || !columnVisibilityDirty">Discard Changes</button>
        <span v-if="columnVisibilityDirty" class="field-help">You have unsaved changes.</span>
      </div>
    </div>
  </div>
</template>

<script>
import { methods as formatters } from '../logic/formatters';

export default {
  name: 'ColumnVisibilityTab',
  props: [
    'columnVisibilityDirty',
    'columnVisibilityError',
    'columnVisibilityLoaded',
    'columnVisibilityUpdatedAt',
    'columnVisibilityUpdatedBy',
    'isColumnVisibilityLoading',
    'isProcessing',
    'visibilityGroups',
    'visibilitySearch'
  ],
  emits: [
    'discard',
    'refresh',
    'save',
    'set-all',
    'toggle-column',
    'update:visibilitySearch'
  ],
  computed: {
    search: { get() { return this.visibilitySearch; }, set(value) { this.$emit('update:visibilitySearch', value); } },
  },
  methods: {
    ...formatters,
  },
};
</script>

<style scoped src="../styles/tables.css"></style>
<style scoped src="../styles/controls.css"></style>
<style scoped src="../styles/dialogs.css"></style>
<style scoped src="../styles/columns.css"></style>
<style scoped src="../styles/visibility.css"></style>
