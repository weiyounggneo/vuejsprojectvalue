<template>
  <div class="modal-overlay">
    <div class="modal x-large-modal" style="max-width: 98%;">
      <h3>Global Audit Log: Manager Dashboard</h3>

      <div v-if="isFetchingGlobalHistory" style="text-align: center; padding: 20px;">
        <div class="spinner" style="width: 24px; height: 24px; border-width: 3px;"></div>
        <p>Loading global audit data...</p>
      </div>

      <div v-else class="global-history-table-container" style="margin-top: 16px;">
        <vue-good-table
          :key="tableViewVersion + 1000"
          :columns="globalHistoryColumns"
          :rows="globalHistoryData"
          :pagination-options="{ enabled: true, perPage: 10 }"
          :search-options="{ enabled: true, placeholder: 'Search entire audit log...' }"
          :row-style-class="globalRowClassFn"
        >
          <template #table-row="props">
            <span v-if="props.column.field === 'action_type'">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge" :class="{ 'badge-current': props.row.action_type === 'CURRENT' }">
                  {{ props.row.action_type === 'UPDATE' ? 'PREVIOUS' : props.row.action_type }}
                </span>
                <!-- REQUIRE isEditor TO SEE RESTORE BUTTON -->
                <button
                  v-if="isEditor && props.row.action_type !== 'CURRENT'"
                  class="restore-btn"
                  @click="$emit('restore', props.row)"
                  title="Revert live record to this version"
                >
                  Restore
                </button>
              </div>
            </span>
            <span v-else>
              {{ props.formattedRow[props.column.field] }}
            </span>
          </template>

          <template #emptystate>
            <div class="no-data-message">No audit logs found.</div>
          </template>
        </vue-good-table>
      </div>

      <div class="modal-actions" style="margin-top: 20px;">
        <button type="button" class="actions cancel" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import { VueGoodTable } from 'vue-good-table-next';

export default {
  name: 'GlobalHistoryDialog',
  components: { VueGoodTable },
  props: [
    'globalHistoryColumns',
    'globalHistoryData',
    'globalRowClassFn',
    'isEditor',
    'isFetchingGlobalHistory',
    'tableViewVersion'
  ],
  emits: [
    'close',
    'restore'
  ],
};
</script>

<style scoped src="../styles/grid.css"></style>
<style scoped src="../styles/dialogs.css"></style>
<style scoped src="../styles/table.css"></style>
<style scoped src="../styles/responsive.css"></style>

<style scoped src="../styles/loading.css"></style>
