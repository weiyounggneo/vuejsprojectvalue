<template>
  <div class="modal-overlay">
    <div class="modal">
      <h3>Add New Configuration</h3>
      <form @submit.prevent="saveDraft">
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" v-model="isAddingNewCategory" :disabled="isProcessing" style="width: auto; margin: 0;" />
            <strong>Create a new category</strong>
          </label>
        </div>

        <div v-if="isAddingNewCategory" class="form-group" style="margin-bottom: 16px;">
          <label for="new_category_name">New Category Name</label>
          <input
            id="new_category_name"
            v-model="addConfigForm.newCategory"
            :disabled="isProcessing"
            placeholder="e.g. DEPARTMENT or REGION"
            required
          />
        </div>
        <div v-else class="form-group" style="margin-bottom: 16px;">
          <label>Target Category</label>
          <input
            :value="availableCategories.length === 0 ? '-- No category selected --' : formatCategoryName(selectedCategory)"
            disabled
            style="background-color: #e9ecef; cursor: not-allowed; color: #495057; font-weight: bold;"
          />
        </div>

        <div class="form-group" style="margin-bottom: 24px;">
          <label for="new_config_value">New Value</label>
          <input
            id="new_config_value"
            v-model="addConfigForm.value"
            :disabled="isProcessing"
            placeholder="Enter new master data value..."
            v-focus
            required
          />
        </div>

        <div class="modal-actions">
          <button type="submit" class="actions formButton" :disabled="isProcessing">
            {{ isProcessing ? 'Adding...' : 'Add Option' }}
          </button>
          <button type="button" class="actions cancel" @click="$emit('close')" :disabled="isProcessing">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { methods as formatters } from '../logic/formatters';

export default {
  name: 'AddConfigDialog',
  props: [
    'addingNewCategory',
    'availableCategories',
    'form',
    'isProcessing',
    'selectedCategory'
  ],
  emits: [
    'close',
    'save'
  ],
  directives: { focus: { mounted(el) { el.focus(); } } },
  data() { return { addConfigForm: { ...this.form }, isAddingNewCategory: this.addingNewCategory }; },
  watch: { form: { deep: true, handler(value) { this.addConfigForm = { ...value }; } }, addingNewCategory(value) { this.isAddingNewCategory = value; } },
  methods: {
    ...formatters,
    saveDraft() { this.$emit('save', { ...this.addConfigForm }, this.isAddingNewCategory); },
  },
};
</script>

<style scoped src="../styles/dialogs.css"></style>
<style scoped src="../styles/columns.css"></style>
