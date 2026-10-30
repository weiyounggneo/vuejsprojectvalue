// History logic for ManagerYearlyTracking. Functions run on the page instance.
import { ACTUAL_DATE_LABELS } from './fields.constants';

export const computed = {
  customFieldHistoryRows() {
      return this.customFieldHistory.flatMap(log => {
        const before = log.before_values || {};
        const after = log.after_values || {};
        return [...new Set([...Object.keys(before), ...Object.keys(after)])].map(columnName => ({
          key: `${log.audit_id}:${columnName}`,
          columnName,
          label: ACTUAL_DATE_LABELS[columnName] || this.projectFields.find(field => field.columnName === columnName)?.label || columnName,
          before: before[columnName] ?? null,
          after: after[columnName] ?? null,
          changedAt: log.changed_at,
          changedBy: log.changed_by
        }));
      });
    },

  globalHistoryColumns() {
      return [
        { label: 'Date Changed', field: 'changed_at', width: '160px' },
        { label: 'Changed By', field: 'changed_by', width: '120px' },
        { label: 'Action', field: 'action_type', width: '120px' },
        { label: 'Project ID', field: 'project_id', width: '100px' },
        { label: 'Project Name', field: 'project_name', width: '150px' },
        { label: 'Proj. Status', field: 'project_status', width: '110px' },
        { label: 'PMO Gate', field: 'current_pmo_gate', width: '100px' },
        { label: 'Comment', field: 'comment_text', width: '200px' },
        { label: 'Cap. Gain Val', field: 'capacity_gain_value', formatFn: this.formatCurrency, width: '120px' },
        { label: 'Cap. Gain %', field: 'capacity_gain_pct', formatFn: this.formatPercent, width: '100px' },
        { label: 'DL Value', field: 'dl_value', formatFn: this.formatCurrency, width: '120px' },
        { label: 'DL Eq.', field: 'dl_equivalent', width: '90px' },
        { label: 'IDL Value', field: 'idl_value', formatFn: this.formatCurrency, width: '120px' },
        { label: 'IDL FTE', field: 'idl_fte', width: '90px' },
        { label: 'Yield Value', field: 'yield_value', formatFn: this.formatCurrency, width: '120px' },
        { label: 'Yield %', field: 'yield_gain_pct', formatFn: this.formatPercent, width: '90px' },
        { label: 'Quality Value', field: 'quality_value', formatFn: this.formatCurrency, width: '120px' },
        { label: 'Quality Cases', field: 'quality_cases', width: '110px' }
      ];
    }
};

export const methods = {
  async fetchCustomFieldHistory(projectId) {
      this.isFetchingCustomFieldHistory = true;
      this.customFieldHistory = [];
      this.customFieldHistoryError = '';
      try {
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly/${encodeURIComponent(projectId)}/custom-fields/history`);
        const data = await this.readApiJson(response, 'Added-field history is unavailable.');
        if (!Array.isArray(data)) throw new Error('The server returned an invalid added-field history.');
        this.customFieldHistory = data;
      } catch (err) {
        this.customFieldHistoryError = err.message || 'Added-field history is unavailable.';
      } finally {
        this.isFetchingCustomFieldHistory = false;
      }
    },

  async forceSnapshot() {
      if (!this.manualSnapshotMonth) return alert('Please select a target month first.');

      const confirmed = confirm(`WARNING: Are you sure you want to manually trigger and overwrite the KPI snapshot for ${this.manualSnapshotMonth}?\n\nThis will take the current live values of all projects and permanently stamp them to this month in the database.`);
      
      if (!confirmed) return;

      this.isProcessing = true;
      this.processingMessage = `Capturing full portfolio snapshot for ${this.manualSnapshotMonth}...`;

      try {
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/admin/force-snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snapshotMonth: this.manualSnapshotMonth })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to capture snapshot.');
        }

        this.successMessage = result.message || `Manual snapshot for ${this.manualSnapshotMonth} synchronized successfully!`;
        this.showSuccessDialog = true;
      } catch (err) {
        alert('Snapshot override failed: ' + err.message);
      } finally {
        this.isProcessing = false;
        this.processingMessage = '';
      }
    },

  async openHistoryModal() {
      if (!this.selectedRow || !this.selectedRow.projectId) {
        return alert('Please select a row first.');
      }

      this.showHistoryModal = true;
      this.isFetchingHistory = true;
      this.historyData = [];
      const historyProject = this.selectedRow;

      try {
        const [response] = await Promise.all([
          this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly/${encodeURIComponent(historyProject.projectId)}/history`),
          this.fetchCustomFieldHistory(historyProject.projectId)
        ]);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Backend Server returned ${response.status}`);
        }

        const historicalRecords = await response.json();
        if (!Array.isArray(historicalRecords)) throw new Error('The server returned an invalid project history.');

        const currentState = {
          history_id: 'current',
          project_id: historyProject.projectId,
          changed_at: 'Current Status',
          changed_by: 'Active Record',
          action_type: 'CURRENT',
          project_name: historyProject.projectName,
          project_status: historyProject.projectStatus,
          current_pmo_gate: historyProject.currentPmoGate,
          capacity_gain_value: historyProject.capacityGainValue,
          capacity_gain_pct: historyProject.capacityGainPercent,
          dl_value: historyProject.dlValue,
          dl_equivalent: historyProject.dlEquivalent,
          idl_value: historyProject.idlValue,
          idl_fte: historyProject.idlFte,
          yield_value: historyProject.yieldValue,
          yield_gain_pct: historyProject.yieldPercentGain,
          quality_value: historyProject.qualityValue,
          quality_cases: historyProject.qualityCases,
          comment_text: historyProject.comment
        };

        this.historyData = [currentState, ...historicalRecords];
      } catch (err) {
        alert('Error loading history: ' + err.message);
        this.showHistoryModal = false;
      } finally {
        this.isFetchingHistory = false;
      }
    },

  async openGlobalHistoryModal() {
      this.showGlobalHistoryModal = true;
      this.isFetchingGlobalHistory = true;
      this.globalHistoryData = [];

      try {
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly/history/all`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Backend Server returned ${response.status}`);
        }

        const historicalRecords = await response.json();
        const metricsWithHistory = new Set(historicalRecords.map(log => log.project_id));

        const currentRecords = this.rows
          .filter(row => metricsWithHistory.has(row.projectId))
          .map(row => ({
            history_id: `current_${row.projectId}`,
            changed_at: 'Current Status',
            changed_by: 'Active Record',
            action_type: 'CURRENT',
            project_id: row.projectId,
            project_name: row.projectName,
            project_status: row.projectStatus,
            current_pmo_gate: row.currentPmoGate,
            capacity_gain_value: row.capacityGainValue,
            capacity_gain_pct: row.capacityGainPercent,
            dl_value: row.dlValue,
            dl_equivalent: row.dlEquivalent,
            idl_value: row.idlValue,
            idl_fte: row.idlFte,
            yield_value: row.yieldValue,
            yield_gain_pct: row.yieldPercentGain,
            quality_value: row.qualityValue,
            quality_cases: row.qualityCases,
            comment_text: row.comment
          }));

        const combined = [...currentRecords, ...historicalRecords];
        combined.sort((a, b) => {
          if (a.project_id !== b.project_id) {
            return b.project_id.localeCompare(a.project_id);
          }
          if (a.action_type === 'CURRENT' && b.action_type !== 'CURRENT') return -1;
          if (b.action_type === 'CURRENT' && a.action_type !== 'CURRENT') return 1;
          return new Date(b.changed_at) - new Date(a.changed_at);
        });

        this.globalHistoryData = combined;
      } catch (err) {
        alert('Error loading global history: ' + err.message);
        this.showGlobalHistoryModal = false;
      } finally {
        this.isFetchingGlobalHistory = false;
      }
    },

  globalRowClassFn(row) {
      return row.action_type === 'CURRENT' ? 'current-row-global' : '';
    },

  async restoreHistoricalRecord(log) {
      if (!this.isEditor || this.isProcessing || log.action_type === 'CURRENT') return;

      const confirmed = confirm(`Are you sure you want to revert to the values from ${log.changed_at}?`);
      if (!confirmed) return;

      this.isProcessing = true;
      this.processingMessage = 'Restoring record...';

      try {
        // These snapshots contain only selected fields. Read the current row so
        // unsnapshotted master data is retained by the existing whole-row PUT.
        const liveResponse = await this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly`);
        const liveRows = await this.readApiJson(liveResponse, 'Could not load the current project before restoring.');
        if (!Array.isArray(liveRows)) throw new Error('The server returned an invalid project list.');
        const liveRow = liveRows.find(row => row.projectId === log.project_id);
        if (!liveRow) throw new Error('This project no longer exists.');
        const restoredFields = {
          projectName: log.project_name,
          projectStatus: log.project_status,
          currentPmoGate: log.current_pmo_gate,
          comment: log.comment_text || log.comments,
          capacityGainValue: log.capacity_gain_value,
          capacityGainPercent: log.capacity_gain_pct,
          dlValue: log.dl_value,
          dlEquivalent: log.dl_equivalent,
          idlValue: log.idl_value,
          idlFte: log.idl_fte,
          yieldValue: log.yield_value,
          yieldPercentGain: log.yield_gain_pct,
          qualityValue: log.quality_value,
          qualityCases: log.quality_cases
        };
        const payload = this.buildProjectPayload({ ...liveRow, ...restoredFields }, { includeCustomFields: false });
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly/${encodeURIComponent(log.project_id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to restore record.');
        }

        this.successMessage = 'Record successfully reverted!';
        this.showSuccessDialog = true;

        await this.fetchTable();

        if (this.showHistoryModal) {
          this.selectedRow = this.rows.find(r => r.projectId === log.project_id);
          await this.openHistoryModal();
        } else if (this.showGlobalHistoryModal) {
          await this.openGlobalHistoryModal();
        }
      } catch (err) {
        alert('Restore failed: ' + err.message);
      } finally {
        this.isProcessing = false;
        this.processingMessage = '';
      }
    }
};
