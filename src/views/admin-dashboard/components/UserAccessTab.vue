<template>
  <div class="table-section" style="padding-top: 20px;">

    <div class="config-controls">
      <div class="form-group">
        <p style="margin: 0; color: #07254a; font-size: 0.95rem;">
          💡 <strong>Tip:</strong> Double-click a user's 'Access Right' below to instantly change it, or add a new user proactively.
        </p>
      </div>
      <button class="primary-btn" @click="$emit('open-add', $event)" :disabled="isProcessing">
        + Add New User
      </button>
    </div>

    <vue-good-table
      :columns="userColumns"
      :rows="users"
      :pagination-options="{ enabled: true, perPage: 10 }"
      :search-options="{ enabled: true, placeholder: 'Search users...' }"
      :line-numbers="true"
    >
      <template #table-row="props">
        <span v-if="props.column.field === 'access_right'">

          <span v-if="editingCell.rowId === props.row.username && editingCell.field === 'access_right'">
            <select
              v-model="editingValue"
              @blur="$emit('save-role', props.row)"
              @keyup.enter="$emit('save-role', props.row)"
              @keyup.esc="$emit('cancel-edit', $event)"
              v-focus
              class="inline-input"
            >
              <option v-for="role in availableRoles" :key="role" :value="role">{{ role }}</option>
            </select>
          </span>


          <span
            v-else
            @dblclick.stop="$emit('start-edit', props.row.username, 'access_right', props.row.access_right)"
            class="editable-cell"
            title="Double-click to edit role"
          >
            <span class="status-badge" :class="'role-' + props.row.access_right">
              {{ props.row.access_right.toUpperCase() }}
            </span>
          </span>
        </span>

        <span v-else-if="props.column.field === 'updated_at'">
          {{ formatDate(props.row.updated_at) }}
        </span>

        <span v-else>
          {{ props.formattedRow[props.column.field] }}
        </span>
      </template>

      <template #emptystate>
        <div class="no-data-message">No users found in the system.</div>
      </template>
    </vue-good-table>
  </div>
</template>

<script>
import { VueGoodTable } from 'vue-good-table-next';
import { methods as formatters } from '../logic/formatters';

export default {
  name: 'UserAccessTab',
  components: { VueGoodTable },
  props: [
    'availableRoles',
    'editValue',
    'editingCell',
    'isProcessing',
    'userColumns',
    'users'
  ],
  emits: [
    'cancel-edit',
    'open-add',
    'save-role',
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
