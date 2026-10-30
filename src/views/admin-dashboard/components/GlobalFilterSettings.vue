<template>
  <section class="global-filter-settings" :class="{ expanded: panelOpen }" aria-label="Global filter settings" @keydown.esc.stop="close">
    <div class="filter-settings-toolbar">
      <button ref="toggleButton" type="button" class="filter-settings-toggle" aria-controls="global-filter-settings-panel"
        :aria-expanded="panelOpen" :disabled="disabled" @click="panelOpen ? close() : open()">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h14M6 10h8M9 16h2" /></svg>
        Global filters <span class="filter-count">{{ filters.length }}</span>
      </button>
      <div v-if="filters.length" class="filter-setting-chips" aria-label="Configured global filters">
        <button v-for="filter in filters" :key="filter.field" type="button" class="filter-setting-chip" :disabled="disabled"
          :aria-label="'Edit ' + filter.label + ' global filter'" :aria-expanded="panelOpen && focusedField === filter.field"
          aria-controls="global-filter-settings-panel" @click="open(filter.field)">{{ filter.label }}<span aria-hidden="true">✎</span></button>
      </div>
      <span v-else class="filter-settings-empty">No filters added</span>
    </div>
    <div v-if="panelOpen" id="global-filter-settings-panel" class="filter-settings-panel" aria-labelledby="global-filter-settings-title">
    <div class="filter-panel-heading"><h3 id="global-filter-settings-title">Edit global filters</h3><button type="button" @click="close">Done</button></div>
      <p>Choose the category filters users will see above Portfolio Overview. Try their values in Live Preview below, then Save Layout to publish the controls.</p>
    <p v-if="!enabled" role="status">Global filter settings need the updated backend portfolio-layout.js. Replace it, restart Node and Refresh.</p>
    <fieldset :disabled="disabled || !enabled">
      <div class="filter-add-row">
        <div class="validation-control"><label>Category<select ref="categoryPicker" v-model="categoryToAdd" aria-label="New global filter category"><option value="">Choose a category…</option>
          <option v-for="group in unusedGroups" :key="group.value" :value="group.value">{{ group.label }}</option></select></label></div>
        <label>Display as<select v-model="displayToAdd" aria-label="New global filter display"><option value="buttons">Buttons</option><option value="dropdown">Dropdown</option></select></label>
        <button type="button" :disabled="!categoryToAdd || filters.length >= 10" @click="add">+ Add global filter</button>
      </div>
      <div v-for="(filter, index) in filters" :key="filter.field" ref="filterRows" class="filter-setting-row" :class="{ focused: focusedField === filter.field }" :data-filter-setting="filter.field">
        <div class="validation-control"><label>Category<select v-bind="fieldAttrs('global.' + index + '.category')" :value="filter.field" :aria-label="'Category for global filter ' + (index + 1)" @change="changeCategory(index, $event.target.value)">
          <option v-if="!catalog.groups.some(group => group.value === filter.field)" :value="filter.field">Unavailable category — choose another</option>
          <option v-for="group in groupsFor(filter)" :key="group.value" :value="group.value">{{ group.label }}</option></select></label><validation-message :id="errorId('global.' + index + '.category')" :message="errorFor('global.' + index + '.category')" /></div>
        <div class="validation-control"><label>Label<input v-bind="fieldAttrs('global.' + index + '.label')" ref="filterLabels" :data-filter-field="filter.field" :value="filter.label" maxlength="60" :aria-label="'Label for global filter ' + (index + 1)" @input="update(index, { label: $event.target.value })" /></label><validation-message :id="errorId('global.' + index + '.label')" :message="errorFor('global.' + index + '.label')" /></div>
        <div class="validation-control"><label>Display as<select v-bind="fieldAttrs('global.' + index + '.display')" :value="filter.display" :aria-label="'Display for global filter ' + (index + 1)" @change="update(index, { display: $event.target.value })"><option value="buttons">Buttons</option><option value="dropdown">Dropdown</option></select></label><validation-message :id="errorId('global.' + index + '.display')" :message="errorFor('global.' + index + '.display')" /></div>
        <div class="filter-row-actions">
          <button type="button" :disabled="index === 0" :aria-label="'Move ' + filter.label + ' filter up'" @click="move(index, -1)">↑</button>
          <button type="button" :disabled="index === filters.length - 1" :aria-label="'Move ' + filter.label + ' filter down'" @click="move(index, 1)">↓</button>
          <button type="button" :aria-label="'Remove ' + filter.label + ' global filter'" @click="remove(index)">Remove</button>
        </div>
      </div>
      <p v-if="!filters.length">No global filters configured. Add a category to give users a filter control.</p>
    </fieldset>
    <p v-if="problem && !Object.keys(validationErrors).length" class="filter-settings-error" role="alert">{{ problem }}</p>
    <p class="filter-settings-note">Each control starts at All. A user's selections apply to every chart, table and summary card together with each item's own filters. Selections are personal to the current session.</p>
    <p class="filter-settings-note">Done closes this panel. Changes remain in your draft until you click Save Layout.</p>
    </div>
    <button v-if="problem && !panelOpen" type="button" class="filter-settings-error-link" :disabled="disabled" @click="open()">Review global filters: {{ problem }}</button>
  </section>
</template>

<script>
import ValidationMessage from './ValidationMessage.vue';
import { fieldValidation } from '../logic/editorValidation';
import { globalFilterError } from '../../portfolio-layout/globalFilters';

export default {
  mixins: [fieldValidation],
  components: { ValidationMessage },
  name: 'GlobalFilterSettings',
  props: { filters: { type: Array, required: true }, catalog: { type: Object, required: true }, disabled: Boolean, enabled: Boolean },
  emits: ['change', 'close'],
  data() { return { categoryToAdd: '', displayToAdd: 'dropdown', panelOpen: false, focusedField: '', returnFocus: null }; },
  computed: {
    unusedGroups() { return this.catalog.groups.filter(group => !this.filters.some(filter => filter.field === group.value)); },
    problem() { return globalFilterError(this.filters, this.catalog); }
  },
  methods: {
    open(field = '') {
      if (this.disabled) return;
      if (!this.panelOpen) this.returnFocus = this.$el?.ownerDocument?.activeElement || this.$refs.toggleButton;
      this.focusedField = field; this.panelOpen = true;
      this.$nextTick(() => this.focusField(field));
    },
    close() {
      if (!this.panelOpen) return;
      this.$emit('close'); this.panelOpen = false; this.focusedField = '';
      this.$nextTick(() => (this.returnFocus?.isConnected ? this.returnFocus : this.$refs.toggleButton)?.focus?.());
    },
    focusIssue(issue) {
      if (this.disabled) return;
      const field = this.filters[issue.index]?.field || '';
      this.open(field);
      this.$nextTick(() => {
        const target = this.$el?.querySelector?.(`[data-validation-field="${issue.field}"]`) || this.$refs.categoryPicker;
        target?.scrollIntoView?.({ block: 'center' }); target?.focus?.();
      });
    },
    focusField(field) {
      const row = this.$refs.filterRows?.find(node => node.getAttribute('data-filter-setting') === field);
      const input = this.$refs.filterLabels?.find(node => node.getAttribute('data-filter-field') === field);
      row?.scrollIntoView?.({ block: 'nearest' });
      (input || this.$refs.categoryPicker)?.focus?.();
    },
    emit(next) { if (!this.disabled && this.enabled) this.$emit('change', next); },
    groupsFor(filter) { return this.catalog.groups.filter(group => group.value === filter.field || !this.filters.some(item => item.field === group.value)); },
    add() {
      const group = this.unusedGroups.find(item => item.value === this.categoryToAdd);
      if (!group || this.filters.length >= 10) return;
      this.emit([...this.filters, { field: group.value, label: group.label, display: this.displayToAdd }]);
      this.categoryToAdd = '';
      this.focusedField = group.value; this.$nextTick(() => this.focusField(group.value));
    },
    update(index, patch) { this.emit(this.filters.map((filter, i) => i === index ? { ...filter, ...patch } : { ...filter })); },
    changeCategory(index, field) {
      const group = this.groupsFor(this.filters[index]).find(item => item.value === field);
      if (group) this.update(index, { field, label: group.label });
    },
    remove(index) { this.emit(this.filters.filter((filter, i) => i !== index)); },
    move(index, delta) {
      if (index + delta < 0 || index + delta >= this.filters.length) return;
      const next = this.filters.map(filter => ({ ...filter })), [filter] = next.splice(index, 1);
      next.splice(index + delta, 0, filter); this.emit(next);
    }
  }
};
</script>

<style scoped>
.global-filter-settings { margin: 12px 0; }
.filter-settings-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.filter-settings-toggle { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; }
.filter-settings-toggle[aria-expanded="true"] { background: #eaf2fd; border-color: #7fa9dd; }
.filter-settings-toggle svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; }
.filter-count { background: #e6edf6; color: #36557c; border-radius: 12px; padding: 1px 7px; font-size: 11px; }
.filter-setting-chips { display: flex; flex-wrap: wrap; gap: 6px; }
button.filter-setting-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; border-radius: 16px; background: #f6f9fd; border-color: #e0e7f0; max-width: 230px; overflow-wrap: anywhere; }
.filter-setting-chip span { color: #718399; }
.filter-settings-empty { font-size: 12px; color: #536378; }
.filter-settings-panel { border: 1px solid #d9e3ef; border-radius: 10px; padding: 18px; margin-top: 10px; background: white; }
.filter-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
h3 { margin: 0 0 6px; color: #243e60; }
p { color: #536378; font-size: 13px; line-height: 1.5; margin: 6px 0 12px; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
.filter-add-row, .filter-setting-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
.filter-add-row { padding: 12px; background: #f6f9fd; border-radius: 8px; margin-bottom: 8px; }
.filter-setting-row { padding: 12px 0; border-bottom: 1px solid #e7edf5; }
.filter-setting-row.focused { background: #f3f7fd; box-shadow: inset 3px 0 #1f5fa8; padding-left: 10px; padding-right: 10px; border-radius: 6px; }
label { display: flex; flex-direction: column; gap: 5px; color: #3b506a; font-size: 12px; min-width: 135px; flex: 1; }
select, input, button { font: inherit; font-size: 13px; border: 1px solid #c5d3e4; border-radius: 6px; padding: 8px 10px; color: #254669; background: white; min-width: 0; }
button { cursor: pointer; }
button:disabled { cursor: default; opacity: .5; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid #87baf2; outline-offset: 2px; }
.validation-control { flex: 1; min-width: 135px; }
.filter-row-actions { display: flex; gap: 6px; }
.filter-settings-note { margin-bottom: 0; font-size: 12px; }
.filter-settings-error { color: #a12622; }
.filter-settings-error-link { margin-top: 8px; color: #a12622; border-color: #e7bbb8; text-align: left; }
@media (max-width: 680px) { label { flex-basis: 100%; } }
</style>
