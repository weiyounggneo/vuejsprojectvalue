<template>
  <div class="modal-overlay">
    <div class="modal">
      <h3>Show / Hide Columns</h3>
      <p style="margin-bottom: 16px; color: #666; font-size: 0.9rem;">
        Select the columns you want to view in the table. Your choices are saved
        automatically for your account in this browser.
      </p>
      <p v-if="columnPreferenceError" role="status">{{ columnPreferenceError }}</p>

      <div class="column-manager-grid">
        <label v-for="col in tableColumns" :key="col.field" class="column-toggle-label">
          <input
            type="checkbox"
            :checked="!col.hidden"
            @change="$emit('toggle', col)"
            :disabled="col.field === 'projectName' || !isFieldShown(col.field)"
          />
          {{ col.label }}
          <small v-if="!isFieldShown(col.field)"> (Hidden by admin)</small>
        </label>
      </div>

      <div class="modal-actions">
        <button type="button" class="actions cancel" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script>


export default {
  name: 'ColumnManagerDialog',
  props: [
    'columnPreferenceError',
    'isFieldShown',
    'tableColumns'
  ],
  emits: [
    'close',
    'toggle'
  ],
};
</script>

<style scoped src="../styles/grid.css"></style>
<style scoped src="../styles/dialogs.css"></style>
<style scoped src="../styles/responsive.css"></style>
