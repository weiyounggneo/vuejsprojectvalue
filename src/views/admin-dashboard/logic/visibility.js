// Visibility logic for AdminDashboard. Functions run on the page instance.
export const computed = {
  visibilityGroups() {
    const query = this.visibilitySearch.trim().toLowerCase();
    const groups = new Map();
    this.visibilityColumns.forEach(column => {
      if (query && !`${column.label} ${column.field} ${column.group}`.toLowerCase().includes(query)) return;
      if (!groups.has(column.group)) groups.set(column.group, []);
      groups.get(column.group).push(column);
    });
    return [...groups].map(([name, columns]) => ({ name, columns }));
  },

  columnVisibilityDirty() {
    return this.columnVisibilityLoaded && this.visibilityColumns.some(column => column.visible !== this.visibilitySavedColumns.find(saved => saved.field === column.field)?.visible);
  }
};

export const methods = {
  async openColumnVisibilityTab() {
    if (this.isProcessing || this.isPageLoading) return;
    this.activeTab = 'visibility';
    if (!this.columnVisibilityDirty) await this.fetchColumnVisibility();
  },

  async fetchColumnVisibility() {
    if (this.isColumnVisibilityLoading) return false;
    this.isColumnVisibilityLoading = true;
    this.columnVisibilityError = '';
    try {
      const response = await this.apiFetch(`${this.apiBaseUrl}/api/admin/column-visibility`);
      if (response.status === 404) throw new Error('The backend needs the column visibility update. Replace server.js and run 004_column_visibility.sql.');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Failed to load column visibility.');
      const seen = new Set();
      if (!Array.isArray(data.columns) || !Array.isArray(data.hiddenFields) || !Number.isSafeInteger(data.revision) || data.revision < 0 || data.columns.some(column => {
        if (!column || typeof column.field !== 'string' || !column.field || seen.has(column.field) || typeof column.label !== 'string' || typeof column.group !== 'string' || typeof column.visible !== 'boolean' || typeof column.required !== 'boolean') return true;
        seen.add(column.field);
        return false;
      }) || !['projectId', 'projectName'].every(field => data.columns.some(column => column.field === field && column.required && column.visible))) throw new Error('The server returned invalid column visibility settings.');
      // Ignore year options from older backends as well.
      this.visibilityColumns = data.columns.filter(column => !/^year\d{4}$/.test(column.field)).map(column => ({ ...column }));
      this.visibilitySavedColumns = this.visibilityColumns.map(column => ({ ...column }));
      this.columnVisibilityRevision = data.revision;
      this.columnVisibilityUpdatedBy = data.updatedBy || '';
      this.columnVisibilityUpdatedAt = data.updatedAt || '';
      this.columnVisibilityLoaded = true;
      return true;
    } catch (err) {
      this.columnVisibilityError = err.message || 'Failed to load column visibility.';
      return false;
    } finally { this.isColumnVisibilityLoading = false; }
  },

  setAllColumnsVisible(visible) {
    if (this.isProcessing || !this.columnVisibilityLoaded) return;
    this.visibilityColumns.forEach(column => { column.visible = column.required || visible; });
  },

  discardColumnVisibilityChanges() {
    if (this.isProcessing) return;
    this.visibilityColumns = this.visibilitySavedColumns.map(column => ({ ...column }));
  },

  async saveColumnVisibility() {
    if (!this.isAdmin || this.isProcessing || !this.columnVisibilityLoaded || this.isColumnVisibilityLoading || !this.columnVisibilityDirty) return;
    this.isProcessing = true;
    this.processingMessage = 'Saving column visibility for everyone...';
    this.columnVisibilityError = '';
    try {
      const hiddenFields = this.visibilityColumns.filter(column => !column.required && !column.visible).map(column => column.field);
      const response = await this.apiFetch(`${this.apiBaseUrl}/api/admin/column-visibility`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hiddenFields, revision: this.columnVisibilityRevision })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Failed to save column visibility.');
      if (!Array.isArray(data.hiddenFields) || !Number.isSafeInteger(data.revision)) throw new Error('The save response was invalid. Refresh to check whether the settings were saved.');
      const hidden = new Set(data.hiddenFields);
      this.visibilityColumns.forEach(column => { column.visible = column.required || !hidden.has(column.field); });
      this.visibilitySavedColumns = this.visibilityColumns.map(column => ({ ...column }));
      this.columnVisibilityRevision = data.revision;
      this.columnVisibilityUpdatedBy = data.updatedBy || '';
      this.columnVisibilityUpdatedAt = data.updatedAt || '';
      this.successMessage = 'Column visibility saved for everyone. Refresh Data & Columns on the tracking page to apply these settings.';
      this.showSuccessDialog = true;
    } catch (err) {
      this.columnVisibilityError = err.message || 'Failed to save column visibility.';
    } finally { this.isProcessing = false; this.processingMessage = ''; }
  }
};
