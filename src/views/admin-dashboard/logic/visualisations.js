// Local draft and API logic for the visualisation editor.
import { widgetTitle, widgetData, portfolioRows, filterDescription } from '../../portfolio-layout/aggregation';
import { DEFAULT_GLOBAL_FILTERS, cleanGlobalValues, globalFilterRules, globalSelection, globalTargetRows } from '../../portfolio-layout/globalFilters';
import { DEFAULT_WIDGETS } from '../../portfolio-layout/defaults';
import { WIDTH_CHOICES, HEIGHT_CHOICES } from '../../portfolio-layout/layoutSizing';
import { chartTypeChoices } from '../../portfolio-layout/chartTypes';
import { isTableWidget, categoryAxis } from '../../portfolio-layout/tableSettings';
import { chartDisplay, displaySupported, hasChartLegend } from '../../portfolio-layout/chartDisplay';
import { comparisonSettings } from '../../portfolio-layout/comparisonSettings';
import { availablePreviewSites } from './portfolioPreview';
import { createTableCreationDraft, tableCreationError, tableSettingsFromCreation, tableTitleFromCreation } from './tableCreation';

const copy = value => JSON.parse(JSON.stringify(value));
const SETTINGS_TABS = [{ id: 'data', label: 'Data' }, { id: 'filters', label: 'Filters' },
  { id: 'appearance', label: 'Appearance' }, { id: 'layout', label: 'Layout' }];
export function createVisualisationState() {
    return { widgets: [], savedWidgets: [], globalFilters: copy(DEFAULT_GLOBAL_FILTERS), savedGlobalFilters: copy(DEFAULT_GLOBAL_FILTERS), globalFiltersEnabled: false, catalog: { groups: [], measures: [], builtins: [] }, defaults: copy(DEFAULT_WIDGETS),
      selectedId: '', standardToAdd: '', revision: 0, loaded: false, loading: false, saving: false, conflict: false,
      error: '', message: '', updatedBy: '', updatedAt: '', currentYear: new Date().getFullYear(), presentationEnabled: false, guidedMetricsEnabled: false,
      chartFiltersEnabled: false, optionalGroupingEnabled: false, tableChartsEnabled: false, tableConfigurationEnabled: false, enhancedChartsEnabled: false, comparisonChartsEnabled: false, flexibleComparisonEnabled: false,
      settingsTab: 'data', settingsTabs: SETTINGS_TABS, chartChooserOpen: false, chartTypeToAdd: 'pie',
      tableDraft: createTableCreationDraft(new Date().getFullYear()), tableToDuplicate: '',
      previewRows: [], previewTargets: [], previewMasterSites: [], previewValues: {}, previewLoading: false,
      previewError: '', previewTargetError: '', previewConfigError: '', previewFocused: false, resizingId: null, reorderingId: null,
      undoStack: [], redoStack: [], historyBaseline: null, historyDepth: 0, historyApplying: false, historyField: null };
  }

export const computed = {
    dirty() { return this.loaded && (JSON.stringify(this.widgets) !== JSON.stringify(this.savedWidgets) || JSON.stringify(this.globalFilters) !== JSON.stringify(this.savedGlobalFilters)); },
    locked() { return this.busy || this.loading || this.saving || this.conflict; },
    selectedWidget() { return this.widgets.find(w => w.id === this.selectedId); },
    selectedIndex() { return this.widgets.findIndex(w => w.id === this.selectedId); },
    visibleWidgets() { return this.widgets.filter(w => w.visible); },
    missingGroup() { return this.selectedWidget?.groupBy && !this.catalog.groups.some(g => g.value === this.selectedWidget.groupBy); },
    missingMeasure() { return this.selectedWidget && !this.catalog.measures.some(m => m.value === this.selectedWidget.measure); },
    previewSiteOptions() { return availablePreviewSites(this.previewRows, this.previewTargets, this.previewMasterSites); },
    previewSite() {
      const rule = this.previewFilters.find(filter => filter.field === 'sites');
      return rule?.operator === 'in' && rule.values.length === 1 ? rule.values[0] || 'ALL' : 'ALL';
    },
    previewFilters() { return globalFilterRules(this.globalFilters, this.previewValues, this.previewRows, this.catalog, this.previewTargets, this.previewMasterSites); },
    previewSelection() { return globalSelection(this.globalFilters, this.previewValues, this.previewRows, this.catalog, this.previewTargets, this.previewMasterSites); },
    previewEligibleCount() { return portfolioRows(this.previewRows).length; },
    previewFilterSummary() { return filterDescription({ filters: this.previewFilters }, this.catalog); },
    previewFilteredTargets() { return globalTargetRows(this.previewTargets, this.previewFilters); },
    addChartTypes() {
      return [...chartTypeChoices({ kind: 'grouped' }),
        { value: 'metric', label: 'Summary Card', hint: 'Show a single total such as project count or savings' }]
        .map(type => ({ ...type, disabled: !this.chartTypeAvailable(type, { kind: 'grouped' })
          || (type.value === 'table' && !this.tableConfigurationEnabled) }));
    },
    canAddChosenChart() { return !this.locked && !this.gestureActive && this.widgets.length < 30
      && this.addChartTypes.some(type => type.value === this.chartTypeToAdd && !type.disabled)
      && (this.chartTypeToAdd !== 'table' || !tableCreationError(this.tableDraft, this.currentYear, this.catalog)); },
    existingTables() { return this.widgets.filter(isTableWidget); },
    canDuplicateTable() { return !this.locked && !this.gestureActive && this.widgets.length < 30 && this.existingTables.some(widget => widget.id === this.tableToDuplicate); },
    selectedChartTypes() { return chartTypeChoices(this.selectedWidget).map(type => ({ ...type, disabled: !this.chartTypeAvailable(type) })); },
    selectedChartType() { return this.selectedWidget?.chartType || this.selectedChartTypes[0]?.value; },
    selectedIsTable() { return isTableWidget(this.selectedWidget); },
    selectedIsComparison() { return this.selectedWidget?.kind === 'grouped' && this.selectedChartType === 'combo'; },
    selectedDisplay() { return chartDisplay(this.selectedWidget || {}); },
    selectedDisplaySupported() { return !this.selectedIsTable && displaySupported(this.selectedWidget); },
    selectedHasLegend() { return hasChartLegend(this.selectedWidget); },
    selectedHasLines() { return this.selectedIsComparison || (['cumulative_trend', 'annual_trend'].includes(this.selectedWidget?.builtin) && !['column', 'table'].includes(this.selectedChartType)); },
    chartAdvice() {
      if (this.selectedWidget?.kind !== 'grouped' || !['pie', 'donut', 'treemap'].includes(this.selectedChartType)) return '';
      const data = widgetData(this.selectedWidget, this.previewSelection.rows, this.currentYear, this.catalog);
      return data.hasNegative ? 'This selection includes negative values. Choose Bar, Column or Table to show decreases.' : '';
    }
  };

export const methods = {
    setMetric(value) {
      if (this.locked || this.gestureActive || !this.selectedWidget || !this.catalog.measures.some(measure => measure.value === value)) return;
      this.changeDraft(() => { this.selectedWidget.measure = value; });
    },
    applyGlobalFilters(filters) {
      if (this.locked || this.gestureActive || !this.globalFiltersEnabled || !Array.isArray(filters)) return;
      this.globalFilters = copy(filters);
    },
    setPreviewValues(values) {
      if (this.locked || this.gestureActive || this.previewLoading) return;
      this.previewValues = cleanGlobalValues(this.globalFilters, values, this.previewRows, this.catalog, this.previewTargets, this.previewMasterSites);
    },
    setPreviewSite(site) {
      if (this.locked || this.gestureActive || this.previewLoading || typeof site !== 'string') return;
      const value = site.trim().toUpperCase();
      if (value !== 'ALL' && !this.previewSiteOptions.includes(value)) return;
      const values = { ...this.previewValues };
      if (value === 'ALL') delete values.sites; else values.sites = value;
      this.setPreviewValues(values);
    },
    chartTypeAvailable(type, widget = this.selectedWidget) {
      if (type.comparison && !this.flexibleComparisonEnabled) return false;
      if (type.enhanced && !this.enhancedChartsEnabled) return false;
      if (type.value === 'table' && !this.tableChartsEnabled) return false;
      return !(widget?.kind === 'builtin' && !this.tableChartsEnabled && !this.enhancedChartsEnabled && type.value !== chartTypeChoices(widget)[0]?.value);
    },
    setDisplay(key, value) {
      if (this.locked || this.gestureActive || !this.enhancedChartsEnabled || !this.selectedDisplaySupported || !['showValues', 'showLegend', 'smoothLines'].includes(key) || typeof value !== 'boolean') return;
      this.changeDraft(() => { this.selectedWidget.display = { ...this.selectedDisplay, [key]: value }; });
    },
    resetDisplay() {
      if (this.locked || this.gestureActive || !this.enhancedChartsEnabled || !this.selectedWidget?.display) return;
      this.changeDraft(() => { delete this.selectedWidget.display; });
    },
    duplicateSelected() {
      if (this.locked || this.gestureActive || !this.selectedWidget || this.widgets.length >= 30) return;
      this.changeDraft(() => {
        const original = this.selectedWidget, index = this.selectedIndex;
        const widget = { ...copy(original), id: this.newId(), title: [...original.title].slice(0, 93).join('') + ' (copy)', visible: true };
        this.widgets.splice(index + 1, 0, widget); this.selectedId = widget.id;
      });
      this.message = 'Copy added to your draft. Edit it and Save Layout when ready.';
    },
    applyTable(settings, adjustment) {
      if (this.locked || this.gestureActive || !this.tableConfigurationEnabled || (!this.selectedIsTable && this.retainedSettings !== this.selectedId + ':table')) return;
      this.changeDraft(() => { this.selectedWidget.table = copy(settings); });
      if (adjustment?.message) this.tableAdjustment = { widgetId: this.selectedId, message: adjustment.message, field: adjustment.field,
        draft: JSON.stringify({ widgets: this.widgets, globalFilters: this.globalFilters }) };
    },
    applyComparison(settings) {
      if (this.locked || this.gestureActive || !this.flexibleComparisonEnabled || (!this.selectedIsComparison && this.retainedSettings !== this.selectedId + ':comparison')) return;
      this.changeDraft(() => { this.selectedWidget.comparison = copy(settings); });
    },
    applyTableDraft(draft) { if (!this.locked && !this.gestureActive && draft) this.tableDraft = copy(draft); },
    openChartChooser() {
      if (this.locked || this.gestureActive || this.widgets.length >= 30) return;
      if (!this.addChartTypes.some(type => type.value === this.chartTypeToAdd && !type.disabled)) this.chartTypeToAdd = 'pie';
      this.layoutActionsOpen = false; this.chartChooserOpen = true;
      this.$nextTick(() => this.$refs.chartAddPanel?.querySelector?.('input[type="radio"]:checked')?.focus());
    },
    closeChartChooser() {
      this.chartChooserOpen = false; this.$nextTick(() => this.$refs.addChartButton?.focus());
    },
    addChosenChart() {
      if (!this.canAddChosenChart) return;
      this.endFieldEdit(); this.beginDraftAction();
      try {
        if (this.chartTypeToAdd === 'table') this.addTable(tableSettingsFromCreation(this.tableDraft, this.currentYear), tableTitleFromCreation(this.tableDraft, this.currentYear, this.catalog));
        else if (this.chartTypeToAdd === 'metric') this.addWidget('metric');
        else {
          this.addWidget('grouped'); this.setChartType(this.chartTypeToAdd);
          this.changeDraft(() => { this.selectedWidget.title = this.chartTypeToAdd === 'combo' ? 'New bar + line chart' : 'New chart'; });
        }
      } finally { this.endDraftAction(); }
      this.chartChooserOpen = false; this.settingsTab = 'data';
      this.revealCreatedWidget(this.selectedId);
    },
    addTable(settings = null, suggestedTitle = 'New table') {
      if (this.locked || this.gestureActive || this.widgets.length >= 30 || !this.tableChartsEnabled || !this.tableConfigurationEnabled) return;
      this.endFieldEdit(); this.beginDraftAction();
      this.addWidget('grouped'); this.setChartType('table');
      this.changeDraft(() => {
        this.selectedWidget.title = [...suggestedTitle].slice(0, 100).join('');
        if (settings) {
          this.selectedWidget.table = copy(settings);
          const group = [settings.rowAxis, settings.columnAxis].find(categoryAxis);
          if (group) this.selectedWidget.groupBy = group;
          const measure = settings.measures.find(value => this.catalog.measures.some(item => item.value === value));
          if (measure) this.selectedWidget.measure = measure;
        }
      });
      this.endDraftAction();
    },
    duplicateTableFromChooser() {
      if (!this.canDuplicateTable) return;
      const original = this.widgets.find(widget => widget.id === this.tableToDuplicate), index = this.widgets.indexOf(original);
      this.changeDraft(() => {
        const widget = { ...copy(original), id: this.newId(), title: [...original.title].slice(0, 93).join('') + ' (copy)', visible: true };
        this.widgets.splice(index + 1, 0, widget); this.selectedId = widget.id;
      });
      this.tableToDuplicate = ''; this.chartChooserOpen = false; this.settingsTab = 'data';
      this.message = 'Table copy added to your draft. Edit it and Save Layout when ready.';
      this.revealCreatedWidget(this.selectedId);
    },
    setChartType(value) {
      if (this.locked || this.gestureActive || !this.selectedChartTypes.some(type => type.value === value)) return;
      if (!this.chartTypeAvailable(this.selectedChartTypes.find(type => type.value === value))) return;
      this.changeDraft(() => {
        if (this.selectedWidget.kind === 'builtin' && value === this.selectedChartTypes[0].value) delete this.selectedWidget.chartType;
        else this.selectedWidget.chartType = value;
        if (value === 'combo' && !this.selectedWidget.comparison) this.selectedWidget.comparison = comparisonSettings(this.selectedWidget, this.currentYear);
        if (value === 'table' && this.selectedWidget.kind === 'grouped' && (!Number.isInteger(this.selectedWidget.maxCategories) || this.selectedWidget.maxCategories < 3 || this.selectedWidget.maxCategories > 20)) this.selectedWidget.maxCategories = 10;
      });
    },
    title(widget) { return widgetTitle(widget, this.currentYear); },
    description(widget) {
      if (widget.kind === 'builtin') return this.catalog.builtins.find(b => b.value === widget.builtin)?.label || 'Standard item';
      if (widget.chartType === 'combo') { const settings = comparisonSettings(widget, this.currentYear); return `Bar + Line · ${settings.xAxis === 'year' ? 'Years' : this.catalog.groups.find(group => group.value === settings.xAxis)?.label || 'Unavailable category'}`; }
      const measure = this.catalog.measures.find(m => m.value === widget.measure)?.label || 'Unavailable measure';
      const group = widget.groupBy ? this.catalog.groups.find(g => g.value === widget.groupBy)?.label || 'Unavailable column' : 'Overall total';
      return widget.kind === 'metric' ? `Summary card · ${measure}` : `${widget.chartType} · ${group} · ${measure}`;
    },
    select(id) { this.selectedId = id; },
    revealCreatedWidget(id) {
      // Wait for the chooser to close and the fully configured item to mount.
      // Ignore a stale request if selection, navigation or a gesture changed.
      this.$nextTick(() => {
        if (this.active === false || this.locked || this.gestureActive || this.selectedId !== id
          || !this.widgets.some(widget => widget.id === id && widget.visible)) return;
        this.$refs.livePreview?.revealWidget(id, { align: 'start', focus: true });
      });
    },
    selectInspectorItem(id) {
      if (this.locked || this.gestureActive || !this.widgets.some(widget => widget.id === id)) return;
      this.select(id);
      this.$nextTick(() => this.$refs.livePreview?.revealWidget(id));
    },
    selectSettingsTab(id) {
      if (this.locked || this.gestureActive || !this.settingsTabs.some(tab => tab.id === id)) return;
      this.endFieldEdit(); this.settingsTab = id;
    },
    navigateSettingsTabs(event, index) {
      if (this.locked || this.gestureActive || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const count = this.settingsTabs.length;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + count) % count;
      this.selectSettingsTab(this.settingsTabs[next].id);
      this.$nextTick(() => this.$refs.settingsTabButtons?.[next]?.focus());
    },
    applyFilters(filters) {
      if (this.locked || this.gestureActive || !this.chartFiltersEnabled || !this.selectedWidget || !Array.isArray(filters)) return;
      this.changeDraft(() => {
        if (filters.length) this.selectedWidget.filters = copy(filters);
        else delete this.selectedWidget.filters;
      });
    },
    applyPresentation({ key, value }) {
      if (this.locked || this.gestureActive || !this.presentationEnabled || !this.selectedWidget || !['format', 'appearance'].includes(key)) return;
      this.changeDraft(() => {
        if (value === null) delete this.selectedWidget[key];
        else this.selectedWidget[key] = copy(value);
      });
    },
    applyPreviewSize({ id, width, height }) {
      if (this.locked || this.reorderingId || !WIDTH_CHOICES.some(c => c.value === width) || !HEIGHT_CHOICES.includes(height)) return;
      const widget = this.widgets.find(w => w.id === id);
      if (!widget) return;
      this.changeDraft(() => { widget.width = width; widget.height = height; this.selectedId = id; });
    },
    startPreviewResize(id) { if (this.gestureActive) return; this.endFieldEdit(); this.beginDraftAction(); this.resizingId = id; },
    endPreviewResize(id) { if (this.resizingId === id) { this.resizingId = null; this.endDraftAction(); } },
    startPreviewReorder(id) { if (this.gestureActive) return; this.endFieldEdit(); this.beginDraftAction(); this.reorderingId = id; },
    endPreviewReorder(id) { if (this.reorderingId === id) { this.reorderingId = null; this.endDraftAction(); } },
    reorderPreview({ id, targetId, placement }) {
      if (this.locked || this.resizingId || !['before', 'after', 'end'].includes(placement)) return;
      const from = this.widgets.findIndex(w => w.id === id);
      if (from < 0 || (placement !== 'end' && (id === targetId || !this.widgets.some(w => w.id === targetId)))) return;
      this.changeDraft(() => {
        const [widget] = this.widgets.splice(from, 1);
        const target = placement === 'end' ? this.widgets.length : this.widgets.findIndex(w => w.id === targetId) + (placement === 'after' ? 1 : 0);
        this.widgets.splice(target, 0, widget); this.selectedId = id;
      });
    },
    async readResponse(response) {
      let data;
      try { data = await response.json(); } catch { throw new Error('Could not read the layout response. Check the backend address.'); }
      if (!response.ok) {
        const err = new Error(data.message || 'Could not load or save the layout.');
        err.status = response.status;
        throw err;
      }
      return data;
    },
    async load() {
      if (this.loading || this.saving) return;
      this.loading = true; this.error = ''; this.message = ''; this.validationErrorActive = false;
      try {
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/admin/visualisation-layout`);
        const data = await this.readResponse(response);
        if (!Array.isArray(data.widgets) || !Array.isArray(data.defaults) || !Array.isArray(data.catalog?.groups) || !Array.isArray(data.catalog?.measures) || !Array.isArray(data.catalog?.builtins) || !Number.isSafeInteger(data.revision)) throw new Error('The server returned invalid layout settings.');
        this.historyApplying = true;
        this.widgets = copy(data.widgets); this.savedWidgets = copy(data.widgets); this.defaults = data.defaults; this.catalog = data.catalog;
        this.tableDraft = createTableCreationDraft(this.currentYear, this.catalog); this.tableToDuplicate = '';
        this.globalFilters = copy(data.globalFilters || DEFAULT_GLOBAL_FILTERS); this.savedGlobalFilters = copy(this.globalFilters);
        this.globalFiltersEnabled = data.globalFiltersEnabled === true;
        this.presentationEnabled = data.presentationEnabled === true;
        this.guidedMetricsEnabled = data.guidedMetricsEnabled === true;
        this.chartFiltersEnabled = data.chartFiltersEnabled === true;
        this.optionalGroupingEnabled = data.optionalGroupingEnabled === true;
        this.tableChartsEnabled = data.tableChartsEnabled === true;
        this.tableConfigurationEnabled = data.tableConfigurationEnabled === true;
        this.enhancedChartsEnabled = data.enhancedChartsEnabled === true;
        this.comparisonChartsEnabled = data.comparisonChartsEnabled === true;
        this.flexibleComparisonEnabled = data.flexibleComparisonEnabled === true;
        this.revision = data.revision; this.updatedBy = data.updatedBy; this.updatedAt = data.updatedAt;
        this.selectedId = this.widgets.some(w => w.id === this.selectedId) ? this.selectedId : this.widgets[0]?.id || '';
        this.loaded = true; this.conflict = false;
        this.resetDraftHistory(); this.historyApplying = false;
        await this.loadPreview();
      } catch (err) { if (!err.isUnauthorized) this.error = err.message; }
      finally { this.loading = false; this.historyApplying = false; }
    },
    async loadPreview() {
      this.previewLoading = true; this.previewError = ''; this.previewTargetError = ''; this.previewConfigError = '';
      try {
        const readList = async path => {
          const response = await this.apiFetch(`${this.apiBaseUrl}${path}`);
          const data = await this.readResponse(response);
          if (!Array.isArray(data)) throw new Error('Preview data is unavailable.');
          return data;
        };
        const readConfig = async () => {
          const response = await this.apiFetch(`${this.apiBaseUrl}/api/config/options`);
          const data = await this.readResponse(response);
          if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Master Data is unavailable.');
          return Array.isArray(data.SITE) ? data.SITE : [];
        };
        const [projects, targets, sites] = await Promise.allSettled([
          readList('/api/manager-yearly'), readList('/api/manager-site-targets'), readConfig()
        ]);
        if (projects.status === 'fulfilled') this.previewRows = projects.value;
        else if (!projects.reason.isUnauthorized) this.previewError = 'Could not load project data for Live Preview. Refresh to retry; layout settings are still available.';
        if (targets.status === 'fulfilled') this.previewTargets = targets.value;
        else if (!targets.reason.isUnauthorized) this.previewTargetError = 'Could not load site targets for this preview. Refresh to retry.';
        if (sites.status === 'fulfilled') this.previewMasterSites = sites.value;
        else if (!sites.reason.isUnauthorized) this.previewConfigError = 'Could not load configured Sites. Project and target Sites remain available in this preview.';
      } finally { this.previewLoading = false; }
    },
    async refresh() {
      if (this.dirty && !confirm('Discard unsaved layout changes and load the saved layout?')) return;
      await this.load();
    },
    discard() { if (this.gestureActive) return; this.endFieldEdit(); this.restoreHistory({ widgets: this.savedWidgets, globalFilters: this.savedGlobalFilters, selectedId: this.selectedId }); this.resetDraftHistory(); },
    resetDefaults() {
      if (this.locked || this.gestureActive) return;
      if (!confirm('Replace this draft with the standard layout? Click Save Layout afterward to apply it for everyone.')) return;
      this.changeDraft(() => { this.widgets = copy(this.defaults); this.globalFilters = copy(DEFAULT_GLOBAL_FILTERS); this.selectedId = this.widgets[0]?.id || ''; });
      this.message = 'Standard layout restored to the draft. Click Save Layout to apply it.';
      if (this.layoutActionsOpen) this.closeLayoutActions();
    },
    newId() {
      let id;
      do { id = `chart_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; } while (this.widgets.some(w => w.id === id));
      return id;
    },
    addWidget(kind) {
      if (this.locked || this.widgets.length >= 30) return;
      const widget = { id: this.newId(), kind, title: kind === 'metric' ? 'New summary card' : 'New chart', width: kind === 'metric' ? 4 : 6, visible: true, height: 280,
        measure: 'count', filterGate: 'ALL', ...(kind === 'grouped' ? { chartType: 'pie', groupBy: this.optionalGroupingEnabled ? '' : this.catalog.groups[0]?.value || 'projectStatus', maxCategories: 10, sort: 'valueDesc' } : {}) };
      this.changeDraft(() => { this.widgets.push(widget); this.selectedId = widget.id; }); this.settingsTab = 'data'; this.message = '';
    },
    addStandard() {
      if (!this.canRestoreStandard) return;
      this.changeDraft(() => {
      const existing = this.widgets.find(w => w.kind === 'builtin' && w.builtin === this.standardToAdd);
      if (existing) { existing.visible = true; this.selectedId = existing.id; }
      else {
        const widget = copy(this.defaults.find(w => w.kind === 'builtin' && w.builtin === this.standardToAdd));
        widget.id = this.newId(); this.widgets.push(widget); this.selectedId = widget.id;
      }
      this.standardToAdd = '';
      });
      this.settingsTab = 'data';
      if (this.layoutActionsOpen) this.closeLayoutActions();
    },
    move(index, delta) {
      if (this.locked || index + delta < 0 || index + delta >= this.widgets.length) return;
      this.changeDraft(() => { const [widget] = this.widgets.splice(index, 1); this.widgets.splice(index + delta, 0, widget); });
    },
    remove(widget) {
      if (this.locked || !confirm(`Remove '${this.title(widget)}' from the layout? Its project data will remain.`)) return;
      this.changeDraft(() => { this.widgets = this.widgets.filter(w => w.id !== widget.id);
        if (this.selectedId === widget.id) this.selectedId = this.widgets[0]?.id || ''; });
    },
    validate() {
      const issue = this.validationIssues[0];
      if (issue) throw Object.assign(new Error(this.issueSummary(issue)), { issue });
    },
    async save() {
      if (!this.loaded || this.locked || this.gestureActive || !this.dirty) return;
      this.endFieldEdit();
      this.error = ''; this.message = ''; this.validationErrorActive = false;
      try { this.validate(); } catch (err) { this.validationErrorActive = true; this.error = err.message; this.focusIssue(err.issue); return; }
      this.saving = true;
      try {
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/admin/visualisation-layout`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ widgets: this.widgets, revision: this.revision, ...(this.globalFiltersEnabled ? { globalFilters: this.globalFilters } : {}) }) });
        const data = await this.readResponse(response);
        this.historyApplying = true;
        this.widgets = copy(data.widgets); this.savedWidgets = copy(data.widgets); this.revision = data.revision;
        this.globalFilters = copy(data.globalFilters || this.globalFilters); this.savedGlobalFilters = copy(this.globalFilters);
        this.historyBaseline = this.historySnapshot(); this.historyApplying = false;
        this.updatedBy = data.updatedBy; this.updatedAt = ''; this.message = data.message;
      } catch (err) {
        if (!err.isUnauthorized) this.error = err.message;
        if (err.status === 409) this.conflict = true;
      } finally { this.saving = false; this.historyApplying = false; }
    }
  };
