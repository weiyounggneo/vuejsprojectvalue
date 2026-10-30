const PREFIX = 'bem:manager-yearly:columns:v1:';

export function columnPreferenceKey(apiBaseUrl, username) {
  return PREFIX + encodeURIComponent(apiBaseUrl || 'same-origin') + ':' + encodeURIComponent(username);
}

export function parseColumnPreferences(text, baseFields) {
  const saved = JSON.parse(text);
  if (!saved || saved.version !== 1 || !saved.hiddenColumns ||
      typeof saved.hiddenColumns !== 'object' || Array.isArray(saved.hiddenColumns)) {
    throw new Error('Invalid column preferences.');
  }
  const allowed = new Set(baseFields);
  return Object.fromEntries(Object.entries(saved.hiddenColumns).filter(([field, hidden]) =>
    typeof hidden === 'boolean' && field !== 'projectName' &&
    (allowed.has(field) || /^year\d{4}$/.test(field) || /^customFields\.[a-z][a-z0-9_]{0,63}$/.test(field))));
}

export const methods = {
  loadColumnPreferences(username) {
    this.columnPreferenceUser = typeof username === 'string' ? username.trim() : '';
    this.hiddenColumns = {};
    this.columnPreferenceError = '';
    if (!this.columnPreferenceUser) return;
    try {
      const saved = localStorage.getItem(columnPreferenceKey(this.apiBaseUrl, this.columnPreferenceUser));
      if (saved !== null) this.hiddenColumns = parseColumnPreferences(saved, this.baseColumnDefs().concat(this.kpiColumnDefs(), this.timelineColumnDefs()).map(col => col.field));
    } catch {
      this.columnPreferenceError = 'Saved column choices could not be loaded. Choose your columns again to save a new selection.';
    }
    this.rebuildTableColumns();
  },

  saveColumnPreferences() {
    if (!this.columnPreferenceUser) return;
    try {
      localStorage.setItem(columnPreferenceKey(this.apiBaseUrl, this.columnPreferenceUser),
        JSON.stringify({ version: 1, hiddenColumns: this.hiddenColumns }));
      this.columnPreferenceError = '';
    } catch {
      this.columnPreferenceError = 'Your choices apply now, but this browser could not save them for your next visit.';
    }
  }
};
