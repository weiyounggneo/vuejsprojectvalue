import { editorIssues, fieldAttributes, validationId, draftChangeSummary } from './editorValidation';

export function createFeedbackState() { return { toolbarHeight: 76, validationErrorActive: false, retainedSettings: '', layoutActionsOpen: false, tableAdjustment: null }; }

export const computed = {
  canRestoreStandard() {
    return !this.locked && !this.gestureActive && !!this.standardToAdd
      && this.catalog.builtins.some(item => item.value === this.standardToAdd)
      && (this.widgets.some(widget => widget.kind === 'builtin' && widget.builtin === this.standardToAdd) || this.widgets.length < 30);
  },
  tableAdjustmentMessage() {
    const notice = this.tableAdjustment;
    return notice && notice.widgetId === this.selectedId && this.canUndo
      && notice.draft === JSON.stringify({ widgets: this.widgets, globalFilters: this.globalFilters }) ? notice.message : '';
  },
  validationIssues() { return this.loaded ? editorIssues(this) : []; },
  selectedFieldErrors() { return Object.fromEntries(this.validationIssues.filter(issue => issue.widgetId === this.selectedId).map(issue => [issue.field, issue.message])); },
  globalFieldErrors() { return Object.fromEntries(this.validationIssues.filter(issue => issue.scope === 'global').map(issue => [issue.field, issue.message])); },
  draftSummary() { return this.loaded ? draftChangeSummary(this.widgets, this.savedWidgets, this.globalFilters, this.savedGlobalFilters) : ''; },
  editorStyle() { return { '--editor-toolbar-offset': `${this.toolbarHeight + 24}px` }; }
};

export const watch = {
  validationIssues(issues) {
    if (!this.validationErrorActive) return;
    this.error = issues.length ? this.issueSummary(issues[0]) : '';
    if (!issues.length) this.validationErrorActive = false;
  },
  active(value) { if (value) this.$nextTick(() => this.measureToolbar()); }
};

export const methods = {
  togglePreviewFocus() {
    if (this.locked || this.gestureActive) return;
    this.previewFocused = !this.previewFocused;
    if (!this.previewFocused) {
      this.settingsTab = 'layout';
      this.$nextTick(() => {
        const panel = this.$refs.inspector?.querySelector?.('[data-validation-field="layout.width"]') || this.$refs.inspector;
        panel?.scrollIntoView?.({ block: 'nearest' }); panel?.focus?.();
      });
    }
  },
  toggleLayoutActions() {
    if (this.layoutActionsOpen) { this.closeLayoutActions(); return; }
    if (this.locked || this.gestureActive) return;
    this.endFieldEdit(); this.chartChooserOpen = false; this.layoutActionsOpen = true;
    this.$nextTick(() => this.$refs.restoreStandardSelect?.focus());
  },
  closeLayoutActions() {
    this.layoutActionsOpen = false;
    this.$nextTick(() => this.$refs.layoutActionsButton?.focus());
  },
  undoTableAdjustment() {
    if (!this.tableAdjustmentMessage || this.locked || this.gestureActive) return;
    const field = this.tableAdjustment.field;
    this.undo();
    this.$nextTick(() => {
      this.$refs.tableConfiguration?.openAdvanced?.();
      this.$nextTick(() => this.$refs.inspector?.querySelector?.(`[data-validation-field="table.${field}"]`)?.focus());
    });
  },
  fieldAttrs(field) { return fieldAttributes(this.selectedFieldErrors, this.selectedId || 'editor', field); },
  errorId(field) { return validationId(this.selectedId || 'editor', field); },
  errorsForWidget(id) { return this.validationIssues.filter(issue => issue.widgetId === id); },
  errorsForTab(tab) { return this.validationIssues.filter(issue => issue.widgetId === this.selectedId && issue.tab === tab); },
  issueSummary(issue) {
    if (issue.scope !== 'widget') return `Global filters: ${issue.message}`;
    const widget = this.widgets.find(item => item.id === issue.widgetId);
    return `${typeof widget?.title === 'string' && widget.title.trim() ? widget.title.trim() : 'Untitled item'}: ${issue.message}`;
  },
  focusFirstIssue() { if (this.validationIssues.length) this.focusIssue(this.validationIssues[0]); },
  focusIssue(issue) {
    if (this.locked || this.gestureActive) return;
    this.endFieldEdit();
    if (issue.scope === 'global') { this.$refs.globalFilterSettings?.focusIssue(issue); return; }
    if (issue.scope !== 'widget') { this.$refs.actionBar?.focus?.(); return; }
    this.selectedId = issue.widgetId; this.settingsTab = issue.tab; this.previewFocused = false;
    if (issue.field.startsWith('table') && !this.selectedIsTable) this.retainedSettings = `${issue.widgetId}:table`;
    if (issue.field.startsWith('comparison') && !this.selectedIsComparison) this.retainedSettings = `${issue.widgetId}:comparison`;
    this.$nextTick(() => {
      const inspector = this.$refs.inspector;
      let target = inspector?.querySelector?.(`[data-validation-field="${issue.field}"]`);
      if (!target && issue.field.startsWith('table.')) target = inspector?.querySelector?.('[data-validation-field="table"]');
      if (!target && issue.field.startsWith('comparison.')) target = inspector?.querySelector?.('[data-validation-field="comparison"]');
      if (!target && issue.field.startsWith('filters.')) target = inspector?.querySelector?.('[data-validation-field="filters"]');
      target = target || inspector;
      target?.scrollIntoView?.({ block: 'center' }); target?.focus?.();
    });
  },
  measureToolbar() {
    const height = this.$refs.actionBar?.getBoundingClientRect?.().height;
    if (height > 0) this.toolbarHeight = Math.ceil(height);
  },
  observeToolbar() {
    this.measureToolbar();
    if (typeof ResizeObserver !== 'undefined') {
      this.toolbarObserver = new ResizeObserver(() => this.measureToolbar());
      if (this.$refs.actionBar) this.toolbarObserver.observe(this.$refs.actionBar);
    }
  },
  disconnectToolbar() { this.toolbarObserver?.disconnect(); }
};
