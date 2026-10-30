<template>
  <div class="modal-overlay">
    <div class="modal x-large-modal">
      <h3>Version History: {{ selectedRow?.projectName }}</h3>

      <div v-if="isFetchingHistory" style="text-align: center; padding: 20px;">
        <div class="spinner" style="width: 24px; height: 24px; border-width: 3px;"></div>
        <p>Loading historical data...</p>
      </div>

      <div v-else class="history-table-container">
        <table class="history-table">
          <thead>
            <tr>
              <th>Date Changed</th>
              <th>Changed By</th>
              <th>Status (Action)</th>
              <th>Proj. Status</th>
              <th>PMO Gate</th>
              <th>Comment</th>
              <th>Cap. Gain Val</th>
              <th>Cap. Gain %</th>
              <th>DL Val</th>
              <th>DL Eq.</th>
              <th>IDL Val</th>
              <th>IDL FTE</th>
              <th>Yield Val</th>
              <th>Yield %</th>
              <th>Quality Val</th>
              <th>Quality Cases</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in historyData"
              :key="log.history_id"
              :class="{ 'current-row': log.action_type === 'CURRENT' }"
            >
              <td>{{ log.changed_at }}</td>
              <td><strong>{{ log.changed_by }}</strong></td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge" :class="{ 'badge-current': log.action_type === 'CURRENT' }">
                    {{ log.action_type === 'UPDATE' ? 'PREVIOUS' : log.action_type }}
                  </span>
                  <!-- REQUIRE isEditor TO SEE RESTORE BUTTON -->
                  <button
                    v-if="isEditor && log.action_type !== 'CURRENT'"
                    class="restore-btn"
                    @click="$emit('restore', log)"
                    title="Revert live record to this version"
                  >
                    Restore
                  </button>
                </div>
              </td>
              <td>{{ log.project_status || '-' }}</td>
              <td>{{ log.current_pmo_gate || '-' }}</td>
              <td>{{ log.comment_text }}</td>
              <td>{{ formatCurrency(log.capacity_gain_value) }}</td>
              <td>{{ formatPercent(log.capacity_gain_pct) }}</td>
              <td>{{ formatCurrency(log.dl_value) }}</td>
              <td>{{ log.dl_equivalent }}</td>
              <td>{{ formatCurrency(log.idl_value) }}</td>
              <td>{{ log.idl_fte }}</td>
              <td>{{ formatCurrency(log.yield_value) }}</td>
              <td>{{ formatPercent(log.yield_gain_pct) }}</td>
              <td>{{ formatCurrency(log.quality_value) }}</td>
              <td>{{ log.quality_cases }}</td>
            </tr>
          </tbody>
        </table>

        <p v-if="historyData.length === 1" style="text-align: center; padding: 16px; color: #666; font-size: 0.9rem;">
          No previous edits found for this record. The current version is the original.
        </p>
      </div>

      <h4 class="section-heading">Additional Fields & Actual Date History</h4>
      <p class="project-field-help">The latest 100 additional-field and actual-date edits are shown below. The Restore buttons above use the recorded project details and KPIs.</p>
      <p v-if="customFieldHistoryError" class="project-fields-notice">{{ customFieldHistoryError }}</p>
      <div v-else-if="isFetchingCustomFieldHistory" class="project-field-help">Loading field and actual-date history...</div>
      <div v-else class="history-table-container">
        <table class="history-table">
          <thead><tr><th>Date Changed</th><th>Changed By</th><th>Field</th><th>Before</th><th>After</th></tr></thead>
          <tbody>
            <tr v-for="change in customFieldHistoryRows" :key="change.key">
              <td>{{ change.changedAt }}</td><td>{{ change.changedBy }}</td><td>{{ change.label }}</td>
              <td>{{ formatCustomField(change.columnName, change.before) }}</td>
              <td>{{ formatCustomField(change.columnName, change.after) }}</td>
            </tr>
            <tr v-if="!customFieldHistoryRows.length"><td colspan="5">No additional-field or actual-date edits have been recorded.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="modal-actions">
        <button type="button" class="actions cancel" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import { methods as formatters } from '../logic/formatters';

export default {
  name: 'ProjectHistoryDialog',
  props: [
    'customFieldHistoryError',
    'customFieldHistoryRows',
    'formatCustomField',
    'historyData',
    'isEditor',
    'isFetchingCustomFieldHistory',
    'isFetchingHistory',
    'selectedRow'
  ],
  emits: [
    'close',
    'restore'
  ],
  methods: {
    ...formatters,

  },
};
</script>

<style scoped src="../styles/grid.css"></style>
<style scoped src="../styles/dialogs.css"></style>
<style scoped src="../styles/table.css"></style>
<style scoped src="../styles/responsive.css"></style>

<style scoped src="../styles/loading.css"></style>
