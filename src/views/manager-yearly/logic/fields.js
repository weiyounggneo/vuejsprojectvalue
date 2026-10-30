// Fields logic for ManagerYearlyTracking. Functions run on the page instance.
import { MASTER_FIELDS, METRIC_FIELDS, ACTUAL_DATE_FIELDS, ACTUAL_DATE_LABELS } from './fields.constants';
import { wholeNumberDisplay } from './numberDisplay';
import { FORM_SECTIONS, fieldSection } from '../../project-fields/sections';
import { projectUrl } from '../../project-fields/links';

export const computed = {
  visibleProjectFields() {
      return this.projectFields.filter(field => this.isFieldShown(this.customFieldKey(field.columnName)));
    },

  visibleTrackingYears() {
      return this.trackingYears.filter(year => this.isFieldShown(`year${year}`));
    },

  hasVisibleYearlyFields() {
      return this.visibleTrackingYears.length > 0 || this.isFieldShown('comment');
    },

  hasVisibleKpiFields() {
      return METRIC_FIELDS.some(field => this.isFieldShown(field));
    },

  hasVisibleMilestoneFields() {
      return [...ACTUAL_DATE_FIELDS, 'targetG1Date', 'targetG2Date', 'targetG3Date', 'targetClosedDate'].some(field => this.isFieldShown(field));
    }
};

export const methods = {
  isFieldShown(field) {
      return ['projectId', 'projectName'].includes(field) || /^year\d{4}$/.test(field) || !this.adminHiddenFields.includes(field);
    },

  async fetchColumnVisibility() {
      try {
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/manager-column-visibility`);
        if (response.status === 404) throw new Error('The backend needs the column visibility update. Replace server.js and run 004_column_visibility.sql.');
        const data = await this.readApiJson(response, 'Could not load column visibility.');
        if (!Array.isArray(data.hiddenFields) || data.hiddenFields.some(field => typeof field !== 'string') || !Number.isSafeInteger(data.revision) || data.revision < 0) throw new Error('The server returned invalid column visibility settings.');
        this.adminHiddenFields = [...new Set(data.hiddenFields)].filter(field => !['projectId', 'projectName'].includes(field) && !/^year\d{4}$/.test(field));
        this.columnVisibilityLoaded = true;
        this.columnVisibilityError = '';
        if (this.editingCell.field && !this.isFieldShown(this.editingCell.field)) this.cancelInlineEdit();
        this.rebuildTableColumns();
        return true;
      } catch (err) {
        this.columnVisibilityLoaded = false;
        this.columnVisibilityError = err.message || 'Could not load column visibility.';
        return false;
      }
    },

  customFieldKey(columnName) {
      return `customFields.${columnName}`;
    },

  customFieldForGrid(field) {
      return this.projectFields.find(item => this.customFieldKey(item.columnName) === field);
    },

  customColumnDefs() {
      return this.projectFields.map(field => ({
        label: field.label,
        field: this.customFieldKey(field.columnName),
        // Keep DECIMAL source data as strings; only its display is rounded.
        type: 'text',
        customColumn: field.columnName,
        customType: field.type,
        customInputMode: field.inputMode || 'free',
        customOptions: field.options || [],
        formatFn: value => this.formatCustomField(field.columnName, value),
        ...(field.type === 'number' ? { sortFn: this.compareCustomDecimals } : {}),
        width: '160px',
        hidden: false
      }));
    },

  compareCustomDecimals(a, b) {
      const empty = value => value == null || value === '';
      if (empty(a) || empty(b)) return empty(a) ? (empty(b) ? 0 : -1) : 1;
      const parts = value => {
        const match = /^(-?)(\d+)(?:\.(\d{1,4}))?$/.exec(String(value));
        if (!match) return null;
        const integer = match[2].replace(/^0+(?=\d)/, '');
        const fraction = (match[3] || '').padEnd(4, '0');
        return { negative: !!match[1] && !(integer === '0' && fraction === '0000'), integer, fraction };
      };
      const x = parts(a), y = parts(b);
      if (!x || !y) return String(a).localeCompare(String(b));
      if (x.negative !== y.negative) return x.negative ? -1 : 1;
      let result = x.integer.length === y.integer.length
        ? (x.integer < y.integer ? -1 : x.integer > y.integer ? 1 : 0)
        : x.integer.length < y.integer.length ? -1 : 1;
      if (!result) result = x.fraction < y.fraction ? -1 : x.fraction > y.fraction ? 1 : 0;
      return x.negative ? -result : result;
    },

  customFieldHelp(type) {
      return {
        text: 'Optional text, up to 255 characters.',
        number: 'Optional number: up to 14 integer digits and 4 decimal places.',
        date: 'Optional calendar date.',
        boolean: 'Yes, No, or Blank.'
      }[type] || '';
    },

  formatCustomField(columnName, value) {
      if (value == null || value === '') return '—';
      const field = this.projectFields.find(item => item.columnName === columnName);
      if (field?.type === 'boolean' || typeof value === 'boolean') {
        if ([true, 1, '1', 'true'].includes(value)) return 'Yes';
        if ([false, 0, '0', 'false'].includes(value)) return 'No';
      }
      if (field?.type === 'number') return wholeNumberDisplay(value);
      return field?.type === 'date' ? String(value).slice(0, 10) : String(value);
    },

  customFieldFormValues(source = {}) {
      const values = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
      return Object.fromEntries(this.projectFields.map(field => {
        let value = values[field.columnName] ?? null;
        if (field.type === 'boolean' && (value === 0 || value === 1)) value = value === 1;
        return [field.columnName, value];
      }));
    },

  normalizeCustomField(field, value) {
      if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
      if (field.type === 'url') {
        if (!projectUrl(value)) throw new Error(`${field.label} must be a full http:// or https:// URL with at most 2048 characters.`);
        return value.trim();
      }
      if (field.type === 'text') {
        if (typeof value !== 'string' || Array.from(value).length > 255) throw new Error(`${field.label} must be text with at most 255 characters.`);
        const text = value.trim();
        if (field.inputMode === 'dropdown' && !(field.options || []).includes(text)) throw new Error(`${field.label}: choose an option from ${field.configCategory}, or leave it blank. Use Refresh Data & Columns to load new options.`);
        return text;
      }
      if (field.type === 'number') {
        if (!['number', 'string'].includes(typeof value) || !/^-?\d{1,14}(?:\.\d{1,4})?$/.test(String(value).trim())) {
          throw new Error(`${field.label} must have at most 14 integer digits and 4 decimal places.`);
        }
        return String(value).trim();
      }
      if (field.type === 'boolean') {
        if (![true, false, 0, 1].includes(value)) throw new Error(`${field.label} must be Yes, No, or Blank.`);
        return value === true || value === 1;
      }
      if (field.type === 'date') {
        if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field.label} must be a valid YYYY-MM-DD date.`);
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error(`${field.label} is not a valid calendar date.`);
        return value;
      }
      throw new Error(`Unsupported field type for ${field.label}.`);
    },

  buildCustomFieldPayload(values = {}) {
      return Object.fromEntries(this.visibleProjectFields.map(field => [field.columnName, this.normalizeCustomField(field, values[field.columnName])]));
    },

  normalizeActualDate(field, value) {
      return this.normalizeCustomField({ type: 'date', label: ACTUAL_DATE_LABELS[field] }, value);
    },

  actualDateFormValues(record = {}) {
      return Object.fromEntries(ACTUAL_DATE_FIELDS.map(field => [field, this.normalizeActualDate(field, record[field] ?? null)]));
    },

  addActualDateChanges(payload, form) {
      for (const field of ACTUAL_DATE_FIELDS.filter(field => this.isFieldShown(field))) {
        const value = this.normalizeActualDate(field, form[field] ?? null);
        const original = this.normalizeActualDate(field, this.actualDateFormBaseline[field] ?? null);
        // Omitted dates retain phase-derived defaults. Explicit null clears one.
        if (value !== original) payload[field] = value;
      }
      return payload;
    },

  buildProjectPayload(record, { includeCustomFields = true } = {}) {
      if (!this.columnVisibilityLoaded || this.columnVisibilityError) throw new Error('Refresh Data & Columns to load column visibility before saving.');
      const payload = Object.fromEntries(MASTER_FIELDS.filter(field => this.isFieldShown(field)).map(field => [field, record[field] ?? null]));
      payload.projectId = String(record.projectId || '').trim();
      payload.projectName = String(record.projectName || '').trim();
      if (!payload.projectId || !payload.projectName) throw new Error('Project ID and Project Name are required.');
      if (this.isFieldShown('comment')) payload.comment = record.comment ?? null;
      for (const field of [...METRIC_FIELDS, ...Object.keys(record).filter(key => /^year\d{4}$/.test(key))]) {
        if (!this.isFieldShown(field)) continue;
        const value = record[field];
        if (value == null || String(value).trim() === '') payload[field] = null;
        else {
          if (!['number', 'string'].includes(typeof value) || !Number.isFinite(Number(value))) throw new Error(`${field} must be a finite number or Blank.`);
          payload[field] = value;
        }
      }
      if (includeCustomFields && this.projectFieldsLoaded && !this.projectFieldsError) payload.customFields = this.buildCustomFieldPayload(record.customFields || {});
      return payload;
    },

  hydrateProjectRow(row) {
      const source = row.customFields && typeof row.customFields === 'object' && !Array.isArray(row.customFields) ? row.customFields : {};
      return { ...row, projectStatus: row.projectStatus ?? row.project_status ?? null, customFields: { ...source, ...this.customFieldFormValues(source) } };
    },

  async fetchProjectFields() {
      try {
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/manager-project-fields`);
        if (response.status === 404) throw new Error('The server has not enabled project field definitions yet.');
        const fields = await this.readApiJson(response, 'Failed to load added project fields.');
        if (!Array.isArray(fields)) throw new Error('The server returned an invalid field definition list.');
        const seen = new Set();
        for (const field of fields) {
          if (!field || typeof field.columnName !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(field.columnName)
            || ['constructor', 'prototype'].includes(field.columnName) || seen.has(field.columnName)
            || typeof field.label !== 'string' || !field.label.trim() || !['text', 'url', 'number', 'date', 'boolean'].includes(field.type)) {
            throw new Error('The server returned an invalid or duplicate project field definition.');
          }
          if (field.inputMode === undefined) field.inputMode = 'free';
          if (!['free', 'dropdown'].includes(field.inputMode) || (field.inputMode === 'dropdown' && (field.type !== 'text' || typeof field.configCategory !== 'string' || !field.configCategory || !Array.isArray(field.options) || field.options.some(option => typeof option !== 'string')))) throw new Error('The server returned invalid dropdown settings.');
          if (!Array.isArray(field.options)) field.options = [];
          field.formSection = fieldSection(field);
          if (!FORM_SECTIONS.some(section => section.value === field.formSection)) throw new Error('The server returned an invalid project form section.');
          seen.add(field.columnName);
        }
        this.projectFields = fields;
        this.projectFieldsLoaded = true;
        this.projectFieldsError = '';
        this.rebuildTableColumns();
        if (this.showAddForm) this.addForm.customFields = this.customFieldFormValues(this.addForm.customFields);
        if (this.showUpdateForm) this.updateForm.customFields = this.customFieldFormValues(this.updateForm.customFields);
        return true;
      } catch (err) {
        this.projectFieldsError = err.message || 'Failed to load added project fields.';
        return false;
      }
    },

  canEditField(field) {
      if (!this.isEditor || this.isProcessing || this.isPageLoading || this.tableLoadError || !this.columnVisibilityLoaded || this.columnVisibilityError || !this.isFieldShown(field) || ACTUAL_DATE_FIELDS.includes(field)) return false;
      if (field === 'projectId' && !this.isAdmin) return false;
      if (this.customFieldForGrid(field)) return this.projectFieldsLoaded && !this.projectFieldsError;
      return this.allColumnDefs().some(column => column.field === field);
    }
};
