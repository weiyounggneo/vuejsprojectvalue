<template>
  <div class="chart-filter-controls" v-bind="fieldAttrs('filters')" tabindex="-1"><validation-message :id="errorId('filters')" :message="errorFor('filters')" />
    <h4>{{ isPreview ? 'Filter conditions' : 'Chart filters (optional)' }}</h4>
    <p class="help">{{ isPreview ? 'All conditions must match. Within one condition, any selected value can match.' : "Filters affect only this item. Different fields must all match; any selected value within a field can match. The page's preview filters also apply." }}</p>
    <p v-if="!rules.length" class="help">{{ isPreview ? 'No conditions. Apply to include all eligible projects.' : 'No additional filters — include all eligible projects.' }}</p>
    <article v-for="(rule, index) in rules" :key="rule.field" class="filter-rule" v-bind="fieldAttrs('filters.' + index + '.field')" tabindex="-1">
      <div class="filter-heading"><strong>{{ fieldLabel(rule.field) }}</strong><button type="button" @click="remove(index)" :aria-label="'Remove ' + fieldLabel(rule.field) + ' filter'">Remove filter</button></div>
      <validation-message :id="errorId('filters.' + index + '.field')" :message="errorFor('filters.' + index + '.field')" />
      <label v-if="isPreview">Filter by
        <select :value="rule.field" @change="setField(index, $event.target.value)">
          <option v-if="!fieldAvailable(rule.field)" :value="rule.field">Unavailable column — choose another</option>
          <option v-for="field in fieldsFor(index)" :key="field.value" :value="field.value">{{ field.label }}</option>
        </select>
      </label>
      <label>Match
        <select v-bind="fieldAttrs('filters.' + index + '.operator')" :value="rule.operator" @change="setOperator(index, $event.target.value)"><option value="in">Include selected values</option><option value="notIn">Exclude selected values</option></select>
      </label>
      <validation-message :id="errorId('filters.' + index + '.operator')" :message="errorFor('filters.' + index + '.operator')" />
      <div class="value-search"><label>Find a value<input :value="search[rule.field] || ''" @input="search[rule.field] = $event.target.value" placeholder="Search values…" /></label></div>
      <div v-if="isPreview" class="selection-actions">
        <button type="button" :disabled="!canSelectShown(index)" @click="selectShown(index)">Select shown</button>
        <button type="button" :disabled="!rule.values.length" @click="clearSelection(index)">Clear selection</button>
      </div>
      <div class="value-options" v-bind="fieldAttrs('filters.' + index + '.values')" tabindex="-1" role="group" :aria-label="'Values for ' + fieldLabel(rule.field)">
        <label v-for="option in choices(rule)" :key="option.value" class="value-option">
          <input type="checkbox" :checked="rule.values.includes(option.value)" @change="toggle(index, option.value, $event.target.checked)" />
          <span>{{ option.label }}</span>
        </label>
      </div>
      <validation-message :id="errorId('filters.' + index + '.values')" :message="errorFor('filters.' + index + '.values')" />
      <p v-if="!choices(rule).length" class="help">No matching values available in preview data.</p>
      <p class="help">{{ rule.values.length }} selected<template v-if="rule.field === 'currentPmoGate'"> · G2 also includes G2.5.</template><template v-if="rule.field === 'sites'"> · Shared ALL-site projects match any selected site.</template></p>
      <p v-if="!rule.values.length && !errorFor('filters.' + index + '.values')" :class="isPreview ? 'help' : 'filter-error'" role="status">Select at least one value, or remove this filter.</p>
      <p v-if="!fieldAvailable(rule.field) && !errorFor('filters.' + index + '.field')" class="filter-error" role="status">This column is unavailable. Remove this filter before saving.</p>
    </article>
    <div class="add-filter">
      <label>Add a filter for
        <select v-model="fieldToAdd"><option value="">Choose a category…</option><option v-for="field in availableFields" :key="field.value" :value="field.value">{{ field.label }}</option></select>
      </label>
      <button type="button" @click="add" :disabled="!fieldToAdd || rules.length >= 10">Add filter</button>
    </div>
    <button v-if="rules.length" type="button" @click="$emit('change', [])">{{ isPreview ? 'Remove all conditions' : 'Clear chart filters' }}</button>
  </div>
</template>

<script>
import ValidationMessage from './ValidationMessage.vue';
import { fieldValidation } from '../logic/editorValidation';
import { filterOptions } from '../../portfolio-layout/aggregation';

export default {
  mixins: [fieldValidation],
  components: { ValidationMessage },
  name: 'ChartFilterControls',
  props: ['widget', 'rows', 'catalog', 'scope', 'siteOptions'],
  emits: ['change'],
  data() { return { fieldToAdd: '', search: {} }; },
  computed: {
    isPreview() { return this.scope === 'preview'; },
    rules() { return this.widget.filters || []; },
    availableFields() { return (this.catalog.groups || []).filter(field => !this.rules.some(rule => rule.field === field.value)); }
  },
  methods: {
    fieldLabel(field) { return this.catalog.groups.find(group => group.value === field)?.label || field; },
    fieldAvailable(field) { return this.catalog.groups.some(group => group.value === field); },
    choices(rule) {
      const search = (this.search[rule.field] || '').trim().toLowerCase();
      let options = filterOptions(rule.field, this.rows, this.catalog, rule.values);
      if (rule.field === 'sites' && this.siteOptions) {
        const values = new Set(options.map(option => option.value));
        this.siteOptions.forEach(site => values.add(site));
        options = [...values].sort((a, b) => a.localeCompare(b)).map(value => ({ value, label: value || '(Unassigned)' }));
      }
      return options.filter(option => !search || option.label.toLowerCase().includes(search));
    },
    fieldsFor(index) { return this.catalog.groups.filter(field => !this.rules.some((rule, i) => i !== index && rule.field === field.value)); },
    setField(index, field) {
      if (!this.fieldsFor(index).some(option => option.value === field) || this.rules[index].field === field) return;
      this.search[field] = '';
      this.$emit('change', this.rules.map((rule, i) => i === index ? { field, operator: rule.operator, values: [] } : rule));
    },
    canSelectShown(index) {
      const rule = this.rules[index], values = this.choices(rule).map(option => option.value);
      return values.length > 0 && new Set([...rule.values, ...values]).size <= 100;
    },
    selectShown(index) {
      if (!this.canSelectShown(index)) return;
      const values = this.choices(this.rules[index]).map(option => option.value);
      this.$emit('change', this.rules.map((rule, i) => i === index ? { ...rule, values: [...new Set([...rule.values, ...values])] } : rule));
    },
    clearSelection(index) { this.$emit('change', this.rules.map((rule, i) => i === index ? { ...rule, values: [] } : rule)); },
    add() {
      if (!this.availableFields.some(field => field.value === this.fieldToAdd) || this.rules.length >= 10) return;
      this.$emit('change', [...this.rules, { field: this.fieldToAdd, operator: 'in', values: [] }]);
      this.fieldToAdd = '';
    },
    remove(index) { this.$emit('change', this.rules.filter((rule, i) => i !== index)); },
    setOperator(index, operator) { this.$emit('change', this.rules.map((rule, i) => i === index ? { ...rule, operator } : rule)); },
    toggle(index, value, checked) {
      this.$emit('change', this.rules.map((rule, i) => i === index ? { ...rule, values: checked ? [...new Set([...rule.values, value])] : rule.values.filter(v => v !== value) } : rule));
    }
  }
};
</script>

<style scoped>
.chart-filter-controls { min-width: 0; }
h4 { color: #05204a; margin: 16px 0 12px; }
.help { font-size: 12px; line-height: 1.5; color: #536378; }
label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; margin: 10px 0; }
select, input:not([type="checkbox"]) { width: 100%; min-width: 0; box-sizing: border-box; padding: 8px; border: 1px solid #b9c7d6; border-radius: 4px; background: #fff; color: #182c43; }
.filter-rule { border: 1px solid #dae2ec; padding: 12px; border-radius: 6px; margin-bottom: 12px; }
.filter-heading { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; }
.filter-heading strong { overflow-wrap: anywhere; min-width: 0; }
.value-options { max-height: 180px; overflow-y: auto; border: 1px solid #e2e8f0; padding: 5px 8px; border-radius: 4px; }
.value-option { display: flex; flex-direction: row; align-items: center; gap: 8px; margin: 6px 0; font-size: 12px; overflow-wrap: anywhere; }
.value-option input { flex-shrink: 0; }
.selection-actions { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
.filter-error { color: #a02626; font-size: 12px; line-height: 1.5; }
button { border: 1px solid #b9c7d6; border-radius: 4px; background: #fff; color: #05204a; padding: 6px 9px; font-size: 12px; cursor: pointer; }
button:disabled { opacity: 0.6; cursor: not-allowed; }
.add-filter { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.add-filter label { flex: 1; min-width: 130px; }
</style>
