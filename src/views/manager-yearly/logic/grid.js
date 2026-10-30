// Grid logic for ManagerYearlyTracking. Functions run on the page instance.
import { MASTER_FIELDS } from './fields.constants';

export const computed = {
  uniqueProjectNames() {
      return [...new Set(this.rows.map(r => r.projectName).filter(Boolean))].sort();
    },

  filteredProjectNames() {
      const query = (this.filters.projectName || '').toLowerCase().trim();
      if (!query) {
        return this.uniqueProjectNames;
      }
      return this.uniqueProjectNames.filter(name =>
        name.toLowerCase().includes(query)
      );
    },

  uniquePillars() {
      return [...new Set(this.rows.map(r => r.pillars).filter(Boolean))].sort();
    },

  uniqueSites() {
      const allSites = new Set();
      this.rows.forEach(r => {
        if (r.sites) {
          String(r.sites).split(',').forEach(s => {
            const clean = s.trim();
            if (clean && clean.toUpperCase() !== 'ALL') allSites.add(clean);
          });
        }
      });
      return Array.from(allSites).sort();
    },

  filteredRows() {
      return this.rows.filter(row => {
        const matchName = !this.filters.projectName || 
          (row.projectName && row.projectName.toLowerCase().includes(this.filters.projectName.toLowerCase()));
          
        const matchPillar = !this.filters.pillar || row.pillars === this.filters.pillar;
        
        let matchSite = true;
        if (this.filters.site) {
          matchSite = row.sites && (row.sites.includes(this.filters.site) || row.sites.includes('ALL'));
        }

        return matchName && matchPillar && matchSite;
      });
    }
};

export const methods = {
  selectProject(name) {
      this.filters.projectName = name;
      this.showProjectDropdown = false;
    },

  closeProjectDropdown() {
      // Small timeout allows click events on list items to register first
      setTimeout(() => {
        this.showProjectDropdown = false;
      }, 150);
    },

  baseColumnDefs() {
      return [
        { label: 'Project Name', field: 'projectName', type: 'text', fixed: true, width: '180px', hidden: false },
        { label: 'Project ID', field: 'projectId', type: 'text', width: '120px', hidden: true },
        { label: 'Project Status', field: 'projectStatus', type: 'text', width: '130px', hidden: true },
        { label: 'Pillars', field: 'pillars', type: 'text', width: '150px', hidden: true },
        { label: 'Sites', field: 'sites', type: 'text', width: '150px', hidden: true },
        { label: 'PMO Gate', field: 'currentPmoGate', type: 'text', width: '120px', hidden: true },
        { label: 'DTIT Involved', field: 'dtitInvolved', type: 'text', width: '120px', hidden: true },
        { label: 'AI/AA/A Type', field: 'aiAaAType', type: 'text', width: '120px', hidden: true },
        { label: 'FOAK/NOAK', field: 'foakNoak', type: 'text', width: '120px', hidden: true }
      ];
    },

  yearColumnDefs() {
      return this.trackingYears.map(year => ({
        label: String(year),
        field: 'year' + year,
        type: 'number',
        formatType: 'currency',
        width: '120px',
        hidden: false
      }));
    },

  kpiColumnDefs() {
      return [
        { label: 'Comment', field: 'comment', type: 'text', width: '200px', hidden: false },
        { label: 'Capacity Gain Val', field: 'capacityGainValue', type: 'number', formatType: 'currency', width: '140px', hidden: false },
        { label: 'Capacity Gain %', field: 'capacityGainPercent', type: 'number', formatType: 'percent', width: '130px', hidden: false },
        { label: 'DL Value', field: 'dlValue', type: 'number', formatType: 'currency', width: '120px', hidden: false },
        { label: 'DL Equivalent', field: 'dlEquivalent', type: 'number', width: '120px', hidden: false },
        { label: 'IDL Value', field: 'idlValue', type: 'number', formatType: 'currency', width: '120px', hidden: false },
        { label: 'IDL FTE', field: 'idlFte', type: 'number', width: '100px', hidden: false },
        { label: 'Yield Value', field: 'yieldValue', type: 'number', formatType: 'currency', width: '120px', hidden: false },
        { label: 'Yield (%) Gain', field: 'yieldPercentGain', type: 'number', formatType: 'percent', width: '120px', hidden: false },
        { label: 'Quality Value', field: 'qualityValue', type: 'number', formatType: 'currency', width: '120px', hidden: false },
        { label: 'Quality Cases', field: 'qualityCases', type: 'number', width: '120px', hidden: false }
      ];
    },

  timelineColumnDefs() {
      return [
        { label: 'Target G1 Date', field: 'targetG1Date', type: 'text', formatType: 'date', width: '130px', hidden: true },
        { label: 'Actual G1 Date', field: 'actualG1Date', type: 'text', formatType: 'date', width: '130px', hidden: true },
        { label: 'Target G2 Date', field: 'targetG2Date', type: 'text', formatType: 'date', width: '130px', hidden: true },
        { label: 'Actual G2 Date', field: 'actualG2Date', type: 'text', formatType: 'date', width: '130px', hidden: true },
        { label: 'Target G3 Date', field: 'targetG3Date', type: 'text', formatType: 'date', width: '130px', hidden: true },
        { label: 'Actual G3 Date', field: 'actualG3Date', type: 'text', formatType: 'date', width: '130px', hidden: true },
        { label: 'Target Closed Date', field: 'targetClosedDate', type: 'text', formatType: 'date', width: '150px', hidden: true },
        { label: 'Actual Closed Date', field: 'actualClosedDate', type: 'text', formatType: 'date', width: '150px', hidden: true }
      ];
    },

  allColumnDefs() {
      return [
        ...this.baseColumnDefs(),
        ...this.yearColumnDefs(),
        ...this.kpiColumnDefs(),
        ...this.timelineColumnDefs(),
        ...this.customColumnDefs()
      ];
    },

  isColumnHidden(field, defaultHidden = false) {
      if (!this.isFieldShown(field)) return true;
      return Object.prototype.hasOwnProperty.call(this.hiddenColumns, field)
        ? this.hiddenColumns[field]
        : defaultHidden;
    },

  rebuildTableColumns() {
      this.tableColumns = this.allColumnDefs().map(col => ({
        ...col,
        hidden: this.isColumnHidden(col.field, col.hidden || false)
      }));
      this.tableViewVersion++;
    },

  setFinancialView() {
      const yearFields = this.trackingYears.map(y => `year${y}`);
      const financialFields = new Set([
        'projectName',
        ...yearFields,
        'comment',
        'capacityGainValue',
        'capacityGainPercent',
        'dlValue',
        'dlEquivalent',
        'idlValue',
        'idlFte',
        'yieldValue',
        'yieldPercentGain',
        'qualityValue',
        'qualityCases'
      ]);

      this.hiddenColumns = {};
      this.allColumnDefs().forEach(col => {
        this.hiddenColumns[col.field] = !financialFields.has(col.field);
      });

      this.rebuildTableColumns();
      this.saveColumnPreferences();
    },

  setTimelineView() {
      const timelineFields = new Set([
        'projectName',
        'projectStatus',
        'currentPmoGate',
        'targetG1Date',
        'actualG1Date',
        'targetG2Date',
        'actualG2Date',
        'targetG3Date',
        'actualG3Date',
        'targetClosedDate',
        'actualClosedDate'
      ]);

      this.hiddenColumns = {};
      this.allColumnDefs().forEach(col => {
        this.hiddenColumns[col.field] = !timelineFields.has(col.field);
      });

      this.rebuildTableColumns();
      this.saveColumnPreferences();
    },

  setGlobalView() {
      this.hiddenColumns = {};
      this.allColumnDefs().forEach(col => {
        this.hiddenColumns[col.field] = false;
      });

      this.rebuildTableColumns();
      this.saveColumnPreferences();
    },

  selectRow({ row }) {
      this.selectedRow = row;
    },

  rowClassFn(row) {
      return this.selectedRow && this.selectedRow.projectId === row.projectId ? 'selected-row' : '';
    },

  clearTableUI() {
      this.selectedRow = null;
      this.cancelInlineEdit();
    },

  toggleColumnVisibility(col) {
      if (!this.isFieldShown(col.field) || col.field === 'projectName') return;
      this.hiddenColumns[col.field] = !this.isColumnHidden(col.field, col.hidden || false);
      this.rebuildTableColumns();
      this.saveColumnPreferences();
    },

  clearFilters() {
      this.filters = { projectName: '', pillar: '', site: '' };
      this.selectedRow = null;
      this.cancelInlineEdit();
    },

  startInlineEdit(row, field, currentValue) {
      if (!this.canEditField(field)) return;
      this.editingCell = { rowId: row.projectId, field };
      const custom = this.customFieldForGrid(field);
      if (custom) {
        this.editValue = this.customFieldFormValues(row.customFields)[custom.columnName];
      } else if (['targetG1Date', 'targetG2Date', 'targetG3Date', 'targetClosedDate'].includes(field)) {
        this.editValue = currentValue ? String(currentValue).slice(0, 10) : '';
      } else {
        this.editValue = currentValue;
      }
    },

  cancelInlineEdit() {
      this.editingCell = { rowId: null, field: null };
      this.editValue = null;
    },

  async saveInlineEdit(row) {
      const field = this.editingCell.field;
      if (!field || this.editingCell.rowId !== row.projectId || !this.canEditField(field)) return;
      const original = this.rows.find(item => item.projectId === row.projectId) || row;
      const custom = this.customFieldForGrid(field);
      let payload, method, newValue, nextProjectId = original.projectId;
      try {
        if (custom) {
          newValue = this.normalizeCustomField(custom, this.editValue);
          let oldValue;
          try { oldValue = this.normalizeCustomField(custom, original.customFields?.[custom.columnName]); }
          catch { oldValue = original.customFields?.[custom.columnName]; }
          const unchanged = custom.type === 'number' && newValue != null && oldValue != null
            ? this.compareCustomDecimals(newValue, oldValue) === 0 : newValue === oldValue;
          if (unchanged) return this.cancelInlineEdit();
          payload = { customFields: { [custom.columnName]: newValue } };
          method = 'PATCH';
        } else {
          newValue = this.editValue;
          if (!MASTER_FIELDS.includes(field) && field !== 'comment') {
            newValue = newValue === '' || newValue == null ? null : Number(newValue);
            if (newValue !== null && !Number.isFinite(newValue)) throw new Error('Enter a finite number or Blank.');
          }
          const draft = { ...original, [field]: newValue };
          if (field === 'projectId') {
            nextProjectId = String(newValue || '').trim();
            if (!nextProjectId) throw new Error('Project ID cannot be empty.');
            draft.projectId = original.projectId;
          }
          payload = this.buildProjectPayload(draft, { includeCustomFields: false });
          if (field === 'projectId') payload.newProjectId = nextProjectId;
          method = 'PUT';
        }
      } catch (err) {
        alert(err.message);
        return;
      }
      this.isProcessing = true;
      this.processingMessage = `Updating ${custom ? custom.label : field}...`;
      this.cancelInlineEdit();
      try {
        const suffix = custom ? '/custom-fields' : '';
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly/${encodeURIComponent(original.projectId)}${suffix}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        await this.readApiJson(response, 'Failed to update the project.');
        if (custom) {
          const updated = this.hydrateProjectRow({ ...original, customFields: { ...original.customFields, [custom.columnName]: newValue } });
          this.rows = this.rows.map(item => item.projectId === original.projectId ? updated : item);
          if (this.selectedRow?.projectId === original.projectId) this.selectedRow = updated;
        } else {
          // Reload phase-derived dates and any values the server normalized.
          const refreshed = await this.fetchTable({ selectedProjectId: nextProjectId });
          if (!refreshed && !this.sessionEnded) alert('Update saved, but the project list could not be refreshed. Use Refresh Data & Columns.');
        }
      } catch (err) {
        if (!err.isUnauthorized) alert('Update failed: ' + err.message);
      } finally {
        this.isProcessing = false;
        this.processingMessage = '';
      }
    }
};
