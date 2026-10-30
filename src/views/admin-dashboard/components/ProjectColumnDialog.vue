<template>
  <div class="modal-overlay">
    <div class="modal project-column-modal" role="dialog" aria-modal="true" aria-labelledby="project-column-dialog-title">
      <h3 id="project-column-dialog-title">{{ isEditingProjectColumn ? 'Edit Column Settings' : isRetryingProjectColumn ? 'Finish Column Setup' : 'Add Project Column' }}</h3>
      <p class="field-help">
        {{ isRetryingProjectColumn
          ? 'Retry completes the original column definition. Its name, label, and type stay the same.'
          : 'Choose a label and type for the information you want to store for each project.' }}
      </p>
      <form @submit.prevent="$emit('save', $event)">
        <div class="form-group column-form-group">
          <label for="project_column_label">Display Label</label>
          <input
            id="project_column_label"
            :value="projectColumnForm.label" @input="$emit('change-field', 'label', $event.target.value)"
            :disabled="isProcessing || isRetryingProjectColumn"
            placeholder="e.g. Project Owner"
            maxlength="120"
            required
            v-focus
          />
        </div>
        <div class="form-group column-form-group">
          <label for="project_column_name">Database Column Name</label>
          <input
            id="project_column_name"
            :value="projectColumnForm.columnName" @input="$emit('change-field', 'columnName', $event.target.value)"
            :disabled="isProcessing || isRetryingProjectColumn || isEditingProjectColumn"
            placeholder="e.g. project_owner"
            pattern="[a-z][a-z0-9_]{0,63}"
            maxlength="64"
            aria-describedby="project-column-name-help"
            required
          />
          <p id="project-column-name-help" class="field-help">Start with a lowercase letter. Use lowercase letters, digits, and underscores.</p>
        </div>
        <div class="form-group column-form-group">
          <label for="project_column_type">Field Type</label>
          <select
            id="project_column_type"
            :value="projectColumnForm.type" @change="$emit('change-field', 'type', $event.target.value)"
            :disabled="isProcessing || isRetryingProjectColumn || isEditingProjectColumn"
            aria-describedby="project-column-type-help"
            required
          >
            <option v-for="type in projectColumnTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
          </select>
          <p id="project-column-type-help" class="field-help">{{ selectedProjectColumnTypeDescription }}</p>
        </div>
        <div class="form-group column-form-group">
          <label for="project_column_section">Place in form section</label>
          <select id="project_column_section" :value="projectColumnForm.formSection"
            @change="$emit('change-field', 'formSection', $event.target.value)" :disabled="isProcessing || isRetryingProjectColumn" required>
            <option v-for="section in projectColumnSections" :key="section.value" :value="section.value">{{ section.label }}</option>
          </select>
        </div>
        <template v-if="projectColumnForm.type === 'text'">
          <div class="form-group column-form-group">
            <label for="project_column_input_mode">How users enter a value</label>
            <select id="project_column_input_mode" :value="projectColumnForm.inputMode" @change="$emit('change-field', 'inputMode', $event.target.value)" :disabled="isProcessing || isRetryingProjectColumn">
              <option value="free">Free text</option>
              <option value="dropdown">Dropdown from Master Data</option>
            </select>
          </div>
          <div v-if="projectColumnForm.inputMode === 'dropdown'" class="form-group column-form-group">
            <label for="project_column_category">Master Data Category</label>
            <select id="project_column_category" :value="projectColumnForm.configCategory" @change="$emit('change-field', 'configCategory', $event.target.value)" :disabled="isProcessing || isRetryingProjectColumn || projectColumnNewCategory" :required="!projectColumnNewCategory">
              <option value="" disabled>Select a category...</option>
              <option v-for="category in availableCategories" :key="category" :value="category">{{ formatCategoryName(category) }}</option>
              <option v-if="isRetryingProjectColumn && projectColumnForm.configCategory && !availableCategories.includes(projectColumnForm.configCategory)" :value="projectColumnForm.configCategory">{{ formatCategoryName(projectColumnForm.configCategory) }}</option>
            </select>
            <label v-if="!isRetryingProjectColumn" class="field-help">
              <input type="checkbox" v-model="newCategory" :disabled="isProcessing" /> Create a new category instead
            </label>
            <input v-if="projectColumnNewCategory" v-model="categoryName" placeholder="e.g. PROJECT_PRIORITY" maxlength="64" :disabled="isProcessing" required />
            <p class="field-help">Choices are managed in Master Data Configuration. A new category appears there after saving; add its options before filling project values.</p>
            <p v-if="!projectColumnNewCategory" class="field-help">Current options: {{ (configMap[projectColumnForm.configCategory] || []).join(', ') || 'No options yet' }}</p>
            <p v-if="isEditingProjectColumn" class="field-help">Before switching, add every existing project value to the selected category. Saved values are preserved.</p>
          </div>
        </template>
        <div class="column-preview">
          <strong>{{ projectColumnForm.label.trim() || 'New project field' }}</strong>
          <span>{{ formatProjectColumnType(projectColumnForm.type) }} · Optional · Starts empty</span>
        </div>
        <p v-if="projectColumnFormError" class="column-form-error" role="alert">{{ projectColumnFormError }}</p>
        <div class="modal-actions">
          <button type="submit" class="actions formButton" :disabled="isProcessing">
            {{ isProcessing ? 'Saving...' : isEditingProjectColumn ? 'Save Settings' : isRetryingProjectColumn ? 'Retry Setup' : 'Add Column' }}
          </button>
          <button type="button" class="actions cancel" @click="$emit('close', $event)" :disabled="isProcessing">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { methods as formatters } from '../logic/formatters';

export default {
  name: 'ProjectColumnDialog',
  props: [
    'availableCategories',
    'configMap',
    'formatProjectColumnType',
    'isEditingProjectColumn',
    'isProcessing',
    'isRetryingProjectColumn',
    'projectColumnCategoryName',
    'projectColumnForm',
    'projectColumnFormError',
    'projectColumnNewCategory',
    'projectColumnTypes',
    'projectColumnSections',
    'selectedProjectColumnTypeDescription'
  ],
  emits: [
    'change-field',
    'close',
    'save',
    'update:projectColumnCategoryName',
    'update:projectColumnNewCategory'
  ],
  directives: { focus: { mounted(el) { el.focus(); } } },
  computed: {
    newCategory: { get() { return this.projectColumnNewCategory; }, set(value) { this.$emit('update:projectColumnNewCategory', value); } },
    categoryName: { get() { return this.projectColumnCategoryName; }, set(value) { this.$emit('update:projectColumnCategoryName', value); } },
  },
  methods: {
    ...formatters,
  },
};
</script>

<style scoped src="../styles/dialogs.css"></style>
<style scoped src="../styles/columns.css"></style>
