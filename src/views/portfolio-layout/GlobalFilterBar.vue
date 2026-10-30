<template>
  <section class="dashboard-filters" :class="{ 'inline-heading': !!$slots.heading }" aria-label="Global dashboard filters" @focusin.stop @focusout.stop>
    <slot name="heading" />
    <div v-for="filter in availableFilters" :key="filter.field" class="dashboard-filter" :data-global-filter="filter.field">
      <button v-if="editable" type="button" class="filter-label edit-filter" :disabled="disabled" :aria-label="'Edit ' + filter.label + ' filter settings'"
        @click="$emit('edit-filter', filter.field)">{{ filter.label }}<span aria-hidden="true">✎</span></button>
      <strong v-else class="filter-label">{{ filter.label }}</strong>
      <div v-if="filter.display === 'buttons'" class="filter-buttons" role="group" :aria-label="filter.label">
        <button type="button" :class="{ active: !hasValue(filter.field) }" :aria-pressed="!hasValue(filter.field)" :disabled="disabled" @click="choose(filter.field, null)">{{ allLabel(filter) }}</button>
        <button v-for="option in options(filter)" :key="option.value" type="button" :class="{ active: selected[filter.field] === option.value }"
          :aria-pressed="selected[filter.field] === option.value" :disabled="disabled" @click="choose(filter.field, option.value)">{{ option.label }}</button>
      </div>
      <select v-else :aria-label="filter.label" :value="selectedIndex(filter)" :disabled="disabled" @change="chooseIndex(filter, $event.target.value)">
        <option value="">{{ allLabel(filter) }}</option>
        <option v-for="(option, index) in options(filter)" :key="option.value" :value="String(index)">{{ option.label }}</option>
      </select>
    </div>
    <div class="filter-status">
      <span role="status">{{ projectCount }} projects</span>
      <button v-if="Object.keys(selected).length" type="button" :disabled="disabled" @click="$emit('change', {})">Reset filters</button>
    </div>
    <slot name="actions" />
    <p v-if="unavailableCount" class="filter-note" role="status">An unavailable filter category was skipped. An admin can update it in Visualisation Management.</p>
    <p v-if="hasTargetComparison && availableFilters.some(filter => filter.field !== 'sites')" class="filter-note">Category filters apply to project actuals. Only Site filters change site targets.</p>
  </section>
</template>

<script>
import { cleanGlobalValues, globalFilterOptions } from './globalFilters';

export default {
  name: 'GlobalFilterBar',
  props: { filters: { type: Array, default: () => [] }, values: { type: Object, default: () => ({}) },
    rows: { type: Array, default: () => [] }, catalog: { type: Object, required: true },
    siteTargets: { type: Array, default: () => [] }, masterSites: { type: Array, default: () => [] },
    projectCount: Number, disabled: Boolean, hasTargetComparison: Boolean, editable: Boolean },
  emits: ['change', 'edit-filter'],
  computed: {
    availableFilters() { return this.filters.filter(filter => this.catalog.groups.some(group => group.value === filter.field)); },
    unavailableCount() { return this.filters.length - this.availableFilters.length; },
    selected() { return cleanGlobalValues(this.filters, this.values, this.rows, this.catalog, this.siteTargets, this.masterSites); }
  },
  methods: {
    allLabel(filter) { return filter.field === 'sites' && filter.label === 'Site' ? 'All Sites' : `All ${filter.label}`; },
    options(filter) { return globalFilterOptions(filter, this.rows, this.catalog, this.siteTargets, this.masterSites); },
    hasValue(field) { return Object.hasOwn(this.selected, field); },
    selectedIndex(filter) { return this.hasValue(filter.field) ? String(this.options(filter).findIndex(option => option.value === this.selected[filter.field])) : ''; },
    chooseIndex(filter, index) { this.choose(filter.field, index === '' ? null : this.options(filter)[Number(index)]?.value); },
    choose(field, value) {
      const filter = this.availableFilters.find(item => item.field === field);
      if (this.disabled || !filter || (value !== null && !this.options(filter).some(option => option.value === value))) return;
      const next = { ...this.selected };
      if (value === null) delete next[field]; else next[field] = value;
      this.$emit('change', next);
    }
  }
};
</script>

<style scoped>
.dashboard-filters { display: flex; flex-direction: column; gap: 12px; background: #f6f9fd; border: 1px solid #d9e3ef; border-radius: 10px; padding: 16px; margin: 0 0 18px; }
.dashboard-filter { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; min-width: 0; }
.filter-label { color: #243e60; font-size: 13px; min-width: 100px; overflow-wrap: anywhere; }
button.edit-filter { display: inline-flex; align-items: center; gap: 6px; border: 0; padding: 4px 0; background: transparent; font-weight: 600; text-align: left; }
button.edit-filter:hover { color: #1f5fa8; text-decoration: underline; }
.edit-filter span { font-size: 12px; color: #718399; }
.filter-buttons { display: flex; flex-wrap: wrap; gap: 6px; }
button, select { font: inherit; font-size: 13px; border: 1px solid #c5d3e4; background: white; border-radius: 6px; color: #254669; padding: 7px 12px; }
button { cursor: pointer; max-width: 100%; overflow-wrap: anywhere; }
button.active { background: #1f5fa8; color: white; border-color: #1f5fa8; }
button:focus-visible, select:focus-visible { outline: 3px solid #87baf2; outline-offset: 2px; }
select { min-width: 170px; max-width: 100%; }
button:disabled, select:disabled { opacity: .6; cursor: default; }
.filter-status { display: flex; align-items: center; gap: 14px; color: #536378; font-size: 12px; }
.filter-note { color: #536378; font-size: 12px; line-height: 1.5; margin: 0; }
.dashboard-filters.inline-heading { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 10px 18px; padding: 10px 14px; margin-bottom: 0; background: white; }
.inline-heading .dashboard-filter { gap: 8px; }
.inline-heading .filter-label { min-width: 0; }
.inline-heading .filter-status { margin-left: auto; gap: 10px; }
.inline-heading .filter-note { flex-basis: 100%; }
@media (max-width: 680px) { .dashboard-filter { align-items: flex-start; flex-direction: column; } select { width: 100%; } }
</style>
