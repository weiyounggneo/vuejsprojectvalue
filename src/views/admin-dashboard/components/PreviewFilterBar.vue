<template>
  <section class="preview-filter-bar" aria-labelledby="preview-filters-title" @focusin.stop @focusout.stop @keydown.esc.stop.prevent="cancel">
    <div class="filter-toolbar">
      <div><h3 id="preview-filters-title">Preview filters <span v-if="filters.length">{{ filters.length }}</span></h3>
        <p class="help">Explore the whole dashboard. These filters do not change the saved layout.</p></div>
      <div class="filter-actions">
        <button ref="editButton" type="button" :disabled="disabled" :aria-expanded="editing" aria-controls="preview-filter-editor" @click="open">Edit filters</button>
        <button v-if="filters.length" type="button" :disabled="disabled" @click="reset">Reset filters</button>
      </div>
    </div>
    <div v-if="filters.length" class="active-filters" aria-label="Applied preview filters">
      <span v-for="rule in filters" :key="rule.field" class="filter-chip">
        <button type="button" class="chip-edit" :disabled="disabled" :title="description(rule)" @click="open">{{ description(rule) }}</button>
        <button type="button" class="chip-remove" :disabled="disabled" :aria-label="'Remove ' + fieldLabel(rule.field) + ' preview filter'" @click="remove(rule.field)">×</button>
      </span>
    </div>
    <p v-else class="all-projects">All sites and categories</p>
    <p class="result-count" role="status">Showing <strong>{{ projectCount }}</strong> of {{ totalCount }} eligible projects.</p>
    <p v-if="filters.some(rule => rule.field !== 'sites')" class="target-note">Targets are site-level. Only Site filters change targets; other conditions apply to actual project values.</p>
    <fieldset v-if="editing" id="preview-filter-editor" ref="editor" class="filter-editor" :disabled="disabled" aria-label="Edit preview filters">
      <legend>Edit preview filters</legend>
      <p class="help">Changes take effect when you click Apply filters. Cancel keeps your current selection.</p>
      <chart-filter-controls scope="preview" :widget="{ filters: draftFilters }" :rows="rows" :catalog="catalog" :site-options="siteOptions" @change="draftFilters = $event" />
      <p v-if="draftError" class="selection-help" role="status">{{ draftError }}</p>
      <p v-else class="match-preview" role="status"><strong>{{ proposedCount }}</strong> of {{ totalCount }} eligible projects match this selection.</p>
      <div class="filter-actions">
        <button type="button" class="primary" :disabled="disabled || !!draftError" @click="apply">Apply filters</button>
        <button type="button" :disabled="disabled" @click="cancel">Cancel</button>
      </div>
    </fieldset>
  </section>
</template>

<script>
import ChartFilterControls from './ChartFilterControls.vue';
import { filterDescription, filterError, widgetSelection } from '../../portfolio-layout/aggregation';

const clone = value => JSON.parse(JSON.stringify(value));

export default {
  name: 'PreviewFilterBar',
  components: { ChartFilterControls },
  props: ['filters', 'rows', 'catalog', 'siteOptions', 'projectCount', 'totalCount', 'disabled'],
  emits: ['change'],
  data() { return { editing: false, draftFilters: [] }; },
  computed: {
    draftError() { return filterError({ filters: this.draftFilters }, this.catalog); },
    proposedCount() { return widgetSelection({ filters: this.draftFilters }, this.rows, this.catalog).rows.length; }
  },
  methods: {
    fieldLabel(field) { return this.catalog.groups.find(group => group.value === field)?.label || field; },
    description(rule) {
      const short = { ...rule, values: rule.values.slice(0, 3) };
      return filterDescription({ filters: [short] }, this.catalog) + (rule.values.length > 3 ? ` +${rule.values.length - 3} more` : '');
    },
    open() {
      if (this.disabled) return;
      if (!this.editing) this.draftFilters = this.filters.length ? clone(this.filters)
        : this.catalog.groups.some(group => group.value === 'sites') ? [{ field: 'sites', operator: 'in', values: [] }] : [];
      this.editing = true;
      this.$nextTick(() => this.$refs.editor?.querySelector?.('select, input, button')?.focus());
    },
    close() { this.editing = false; this.$nextTick(() => this.$refs.editButton?.focus()); },
    cancel() { if (!this.disabled && this.editing) this.close(); },
    apply() {
      if (this.disabled || this.draftError) return;
      this.$emit('change', clone(this.draftFilters)); this.close();
    },
    reset() { if (!this.disabled) { this.$emit('change', []); this.close(); } },
    remove(field) {
      if (this.disabled) return;
      const filters = this.filters.filter(rule => rule.field !== field);
      this.$emit('change', clone(filters));
      if (this.editing) this.draftFilters = this.draftFilters.filter(rule => rule.field !== field);
    }
  }
};
</script>

<style scoped>
.preview-filter-bar { margin: 18px 0; padding: 16px; border: 1px solid #dce3ec; border-radius: 8px; background: #f8fafc; color: #23344b; }
.filter-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
h3 { margin: 0; color: #05204a; font-size: 16px; }
h3 span { display: inline-block; padding: 2px 7px; border-radius: 12px; background: #e3eef6; font-size: 12px; }
.help, .target-note, .selection-help { margin: 8px 0; font-size: 12px; line-height: 1.5; color: #536378; }
.filter-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
button { border: 1px solid #bdcad8; border-radius: 5px; background: #fff; color: #05204a; padding: 8px 11px; font: inherit; font-size: 13px; cursor: pointer; }
button:hover:not(:disabled) { background: #eef4fa; }
button:disabled { opacity: .5; cursor: default; }
button:focus-visible { outline: 2px solid #007fa3; outline-offset: 2px; }
.primary { background: #05204a; color: white; border-color: #05204a; }
.primary:hover:not(:disabled) { background: #164379; }
.active-filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 10px; }
.filter-chip { display: inline-flex; align-items: stretch; min-width: 0; max-width: 100%; border: 1px solid #c2d9e7; border-radius: 6px; background: #eef7fb; }
.filter-chip button { background: transparent; border: 0; border-radius: 0; font-size: 12px; padding: 6px 9px; }
.chip-edit { text-align: left; overflow-wrap: anywhere; min-width: 0; }
.filter-chip .chip-remove { border-left: 1px solid #c2d9e7; flex-shrink: 0; font-size: 17px; padding: 3px 9px; }
.all-projects, .result-count { margin: 10px 0 0; font-size: 13px; line-height: 1.5; }
.all-projects { color: #536378; }
.filter-editor { min-width: 0; max-width: 760px; margin: 16px 0 0; padding: 16px; border: 1px solid #cdd9e5; border-radius: 6px; background: #fff; }
legend { padding: 0 6px; color: #05204a; font-size: 14px; font-weight: 600; }
.match-preview { margin: 12px 0; color: #1d6555; font-size: 13px; line-height: 1.5; }
.selection-help { color: #75551d; }
@media (max-width: 650px) { .preview-filter-bar { padding: 12px; } .filter-editor { padding: 10px; } }
</style>
