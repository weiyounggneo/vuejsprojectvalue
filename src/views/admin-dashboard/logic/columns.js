// Columns logic for AdminDashboard. Functions run on the page instance.
import { FORM_SECTIONS, fieldSection, sectionLabel } from '../../project-fields/sections';
export const computed = {
  selectedProjectColumnTypeDescription() {
    const type = this.projectColumnTypes.find(item => item.value === this.projectColumnForm.type);
    return type ? type.description : '';
  }
};

export const methods = {
  formatProjectColumnSection(row) { return sectionLabel(fieldSection(row)); },
  formatProjectColumnType(value) {
    const type = this.projectColumnTypes.find(item => item.value === value);
    return type ? type.label : String(value || 'Unknown');
  },

  async projectColumnResponse(response, fallbackMessage) {
    let data;
    try {
      data = await response.json();
    } catch {
      if (response.status === 404) {
        throw new Error('Project column management is not enabled on the server yet.');
      }
      throw new Error(fallbackMessage);
    }
    if (!response.ok) {
      throw new Error(response.status === 404
        ? 'Project column management is not enabled on the server yet.'
        : (data && data.message) || fallbackMessage);
    }
    if (!data || typeof data !== 'object') throw new Error('The server returned an unexpected project column response.');
    return data;
  },

  async fetchProjectColumns() {
    if (this.isProjectColumnsLoading) return false;
    this.isProjectColumnsLoading = true;
    this.projectColumnsError = '';
    try {
      const response = await this.apiFetch(`${this.apiBaseUrl}/api/admin/project-fields`);
      const data = await this.projectColumnResponse(response, 'Failed to load project columns. Please retry.');
      if (!Array.isArray(data)) throw new Error('The server returned an unexpected project column list.');
      this.projectColumns = data;
      return true;
    } catch (err) {
      this.projectColumnsError = err.message || 'Failed to load project columns. Please retry.';
      return false;
    } finally {
      this.isProjectColumnsLoading = false;
    }
  },

  openAddProjectColumnModal() {
    if (this.isProcessing || this.isPageLoading || this.isProjectColumnsLoading || this.projectColumnsError) return;
    this.cancelInlineEdit();
    this.projectColumnForm = { columnName: '', label: '', type: 'text', inputMode: 'free', configCategory: '', formSection: 'details' };
    this.isEditingProjectColumn = false;
    this.projectColumnNewCategory = false;
    this.projectColumnCategoryName = '';
    void this.fetchConfigs();
    this.projectColumnNameEdited = false;
    this.isRetryingProjectColumn = false;
    this.projectColumnFormError = '';
    this.showProjectColumnModal = true;
  },

  openRetryProjectColumnModal(row) {
    if (this.isProcessing || this.isPageLoading || this.isProjectColumnsLoading || row.state !== 'creating') return;
    this.cancelInlineEdit();
    this.projectColumnForm = { columnName: row.columnName, label: row.label, type: row.type, inputMode: row.inputMode || 'free', configCategory: row.configCategory || '', formSection: fieldSection(row) };
    this.isEditingProjectColumn = false;
    this.projectColumnNewCategory = false;
    this.projectColumnCategoryName = '';
    void this.fetchConfigs();
    this.projectColumnNameEdited = true;
    this.isRetryingProjectColumn = true;
    this.projectColumnFormError = '';
    this.showProjectColumnModal = true;
  },

  openEditProjectColumnModal(row) {
    if (this.isProcessing || this.isPageLoading || row.state !== 'ready') return;
    this.cancelInlineEdit();
    this.projectColumnForm = { columnName: row.columnName, label: row.label, type: row.type, inputMode: row.inputMode || 'free', configCategory: row.configCategory || '', formSection: fieldSection(row) };
    this.isEditingProjectColumn = true;
    this.isRetryingProjectColumn = false;
    this.projectColumnNameEdited = true;
    this.projectColumnNewCategory = false;
    this.projectColumnCategoryName = '';
    this.projectColumnFormError = '';
    this.showProjectColumnModal = true;
    void this.fetchConfigs();
  },

  async manageProjectColumnOptions(row) {
    await this.fetchConfigs();
    this.selectedCategory = row.configCategory;
    this.activeTab = 'config';
  },

  closeProjectColumnModal() {
    if (this.isProcessing) return;
    this.showProjectColumnModal = false;
    this.projectColumnFormError = '';
  },

  suggestProjectColumnName() {
    if (this.projectColumnNameEdited || this.isRetryingProjectColumn || this.isEditingProjectColumn) return;
    let name = this.projectColumnForm.label.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (name && !/^[a-z]/.test(name)) name = `field_${name}`;
    this.projectColumnForm.columnName = name.slice(0, 64);
  },

  validateProjectColumn(payload) {
    if (!payload.label || Array.from(payload.label).length > 120) return 'Display label must contain 1 to 120 characters.';
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(payload.columnName)) {
      return 'Column name must start with a lowercase letter and contain only lowercase letters, digits, and underscores (maximum 64 characters).';
    }
    const reserved = [
      'project_id', 'project_name', 'project_status', 'pillar', 'site',
      'current_pmo_gate', 'dtit_involved', 'ai_type', 'foak_noak',
      'target_g1_date', 'target_g2_date', 'target_g3_date', 'target_closed_date',
      'constructor', 'prototype', '__proto__'
    ];
    if (reserved.includes(payload.columnName)) return 'This name is reserved for an existing project field. Choose another name.';
    if (!this.projectColumnTypes.some(type => type.value === payload.type)) return 'Choose a supported field type.';
    if (!FORM_SECTIONS.some(section => section.value === (payload.formSection ?? 'details'))) return 'Choose a supported form section.';
    const existing = this.projectColumns.find(field => field.columnName === payload.columnName);
    if (!['free', 'dropdown'].includes(payload.inputMode || 'free')) return 'Choose Free text or Dropdown.';
    if (payload.inputMode === 'dropdown' && (payload.type !== 'text' || !payload.configCategory || Array.from(payload.configCategory).length > 64 || ['constructor', 'prototype', '__proto__'].includes(payload.configCategory))) return 'Choose a text column and a master data category of 1 to 64 characters.';
    if (!this.isEditingProjectColumn && existing && (existing.label !== payload.label || existing.type !== payload.type || (existing.inputMode || 'free') !== (payload.inputMode || 'free') || (existing.configCategory || null) !== (payload.configCategory || null) || fieldSection(existing) !== (payload.formSection ?? fieldSection(existing)))) {
      return 'This column already has a different definition. Use its original label and type when retrying setup.';
    }
    return '';
  },

  async submitProjectColumn() {
    if (this.isProcessing || this.isPageLoading) return;
    // Settings describe the input control; physical column types stay fixed.
    const payload = {
      columnName: this.projectColumnForm.columnName.trim(),
      label: this.projectColumnForm.label.trim(),
      type: this.projectColumnForm.type,
      inputMode: this.projectColumnForm.type === 'text' ? this.projectColumnForm.inputMode || 'free' : 'free',
      configCategory: null,
      formSection: this.projectColumnForm.formSection ?? 'details'
    };
    if (payload.inputMode === 'dropdown') payload.configCategory = this.projectColumnNewCategory
      ? this.projectColumnCategoryName.trim().toUpperCase().replace(/\s+/g, '_') : (this.projectColumnForm.configCategory || '').trim();
    this.projectColumnFormError = this.validateProjectColumn(payload);
    if (this.projectColumnFormError) return;
    this.isProcessing = true;
    this.processingMessage = `${this.isEditingProjectColumn ? 'Updating settings for' : this.isRetryingProjectColumn ? 'Completing setup for' : 'Adding'} ${payload.label}...`;
    try {
      const editing = this.isEditingProjectColumn;
      const body = editing ? { label: payload.label, inputMode: payload.inputMode, configCategory: payload.configCategory, formSection: payload.formSection } : payload;
      const response = await this.apiFetch(`${this.apiBaseUrl}/api/admin/project-fields${editing ? '/' + encodeURIComponent(payload.columnName) : ''}`, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await this.projectColumnResponse(response, 'Failed to add the project column. Please retry.');
      const refreshed = await this.fetchProjectColumns();
      await this.fetchConfigs();
      this.showProjectColumnModal = false;
      this.successMessage = data.message || `${payload.label} is ready to use.`;
      if (!refreshed) this.successMessage += ' The column list could not be refreshed. Use Refresh to load it again.';
      this.showSuccessDialog = true;
    } catch (err) {
      if (err.isUnauthorized) return;
      this.projectColumnFormError = err.message || 'Failed to add the project column. Please retry.';
      // Setup may have reached the database before a timeout or server error.
      // Refresh state while retaining the original form for an identical retry.
      await this.fetchProjectColumns();
    } finally {
      this.isProcessing = false;
      this.processingMessage = '';
    }
  }
};
