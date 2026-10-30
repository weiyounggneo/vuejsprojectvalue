<template>
  <div class="table-section" style="padding-top: 20px;">

    <div class="config-controls">
      <div class="form-group">
        <p style="margin: 0; color: #07254a; font-size: 0.95rem;">
          💡 <strong>Tip:</strong> Double-click any 'Expected Value' below to update it directly, or add a new target.
        </p>
      </div>
      <button class="primary-btn" @click="$emit('open-add', $event)" :disabled="isProcessing">
        + Add Site Target
      </button>
    </div>

    <vue-good-table
      :columns="targetColumns"
      :rows="siteTargets"
      :pagination-options="{ enabled: true, perPage: 10 }"
      :search-options="{ enabled: true, placeholder: 'Search by site or year...' }"
      :line-numbers="true"
    >
      <template #table-row="props">
        <span v-if="props.column.field === 'expected_value'">

          <span v-if="editingCell.rowId === `${props.row.site}_${props.row.target_year}` && editingCell.field === 'expected_value'">
            <input
              type="number"
              v-model="editingValue"
              @blur="$emit('save-target', props.row)"
              @keyup.enter="$emit('save-target', props.row)"
              @keyup.esc="$emit('cancel-edit', $event)"
              v-focus
              class="inline-input"
            />
          </span>

          <span
            v-else
            @dblclick.stop="$emit('start-edit', `${props.row.site}_${props.row.target_year}`, 'expected_value', props.row.expected_value)"
            class="editable-cell"
            title="Double-click to edit value"
          >
            {{ formatCurrency(props.row.expected_value) }}
          </span>
        </span>
        <span v-else>
          {{ props.formattedRow[props.column.field] }}
        </span>
      </template>

      <template #emptystate>
        <div class="no-data-message">No site targets found in the database.</div>
      </template>
    </vue-good-table>
  </div>
</template>

<script>
import { VueGoodTable } from 'vue-good-table-next';
import { methods as formatters } from '../logic/formatters';

export default {
  name: 'SiteTargetsTab',
  components: { VueGoodTable },
  props: [
    'editValue',
    'editingCell',
    'isProcessing',
    'siteTargets',
    'targetColumns'
  ],
  emits: [
    'cancel-edit',
    'open-add',
    'save-target',
    'start-edit',
    'update:editValue'
  ],
  directives: { focus: { mounted(el) { el.focus(); } } },
  computed: {
    editingValue: { get() { return this.editValue; }, set(value) { this.$emit('update:editValue', value); } },
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
