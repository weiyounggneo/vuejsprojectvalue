<template>
  <section class="table-creator" aria-labelledby="table-creator-title">
    <div class="table-creator-heading"><div><h4 id="table-creator-title">Choose a table starting layout</h4><p>Start with the question the table should answer. You can customise every setting after creation.</p></div><button type="button" @click="reset">Start over</button></div>
    <div class="table-template-grid" role="radiogroup" aria-label="Table starting layout">
      <label v-for="template in templates" :key="template.value" class="table-template-card" :class="{ selected: draft.template === template.value }">
        <input type="radio" name="new-table-template" :value="template.value" :checked="draft.template === template.value" :disabled="disabled" @change="chooseTemplate(template.value)" />
        <span class="mini-table" :class="'mini-' + template.value" aria-hidden="true"><i v-for="cell in 6" :key="cell"></i></span>
        <strong>{{ template.label }}</strong><small>{{ template.hint }}</small><em>{{ template.sample }}</em>
      </label>
    </div>

    <div class="guided-questions">
      <h4>Set up this table</h4>
      <template v-if="draft.template === 'comparison'">
        <label>Which comparison?<select :value="draft.comparisonBasis" :disabled="disabled" @change="update('comparisonBasis', $event.target.value)"><option value="cumulative">Cumulative Actual and Target</option><option value="annual">Annual Increase and Target</option></select></label>
        <div class="question-row"><label>From year<input type="number" min="2000" max="2100" :value="draft.startYear" :disabled="disabled" @change="update('startYear', Number($event.target.value))" /></label><label>To year<input type="number" min="2000" max="2100" :value="draft.endYear" :disabled="disabled" @change="update('endYear', Number($event.target.value))" /></label></div>
      </template>
      <template v-else-if="draft.template === 'category'">
        <label>What should each row represent?<select :value="draft.category" :disabled="disabled" @change="update('category', $event.target.value)"><option v-for="group in catalog.groups" :key="group.value" :value="group.value">{{ group.label }}</option></select></label>
        <label>Which period?<select :value="draft.categoryYearMode" :disabled="disabled" @change="update('categoryYearMode', $event.target.value)"><option value="current">Current year (updates automatically)</option><option value="range">Choose one year</option></select></label>
        <label v-if="draft.categoryYearMode === 'range'">Value year<input type="number" min="2000" max="2100" :value="draft.categoryYear" :disabled="disabled" @change="update('categoryYear', Number($event.target.value))" /></label>
        <fieldset><legend>What values should be shown? <span>Choose 1 to 6</span></legend><label v-for="measure in categoryMeasures" :key="measure.value" class="check-option"><input type="checkbox" :checked="draft.categoryMeasures.includes(measure.value)" :disabled="disabled || valueDisabled('categoryMeasures', measure.value)" @change="toggleValue('categoryMeasures', measure.value)" />{{ displayMeasure(measure) }}</label></fieldset>
      </template>
      <template v-else-if="draft.template === 'years'">
        <label>What should each row represent?<select :value="draft.category" :disabled="disabled" @change="update('category', $event.target.value)"><option v-for="group in catalog.groups" :key="group.value" :value="group.value">{{ group.label }}</option></select></label>
        <label>Which value should be followed over time?<select :value="draft.trendMeasure" :disabled="disabled" @change="update('trendMeasure', $event.target.value)"><option v-for="measure in trendMeasures" :key="measure.value" :value="measure.value">{{ displayMeasure(measure) }}</option></select></label>
        <div class="question-row"><label>From year<input type="number" min="2000" max="2100" :value="draft.startYear" :disabled="disabled" @change="update('startYear', Number($event.target.value))" /></label><label>To year<input type="number" min="2000" max="2100" :value="draft.endYear" :disabled="disabled" @change="update('endYear', Number($event.target.value))" /></label></div>
      </template>
      <template v-else-if="draft.template === 'kpi'">
        <fieldset><legend>Which current project values should be shown? <span>Choose 1 to 6</span></legend><label v-for="measure in kpiMeasures" :key="measure.value" class="check-option"><input type="checkbox" :checked="draft.kpiMeasures.includes(measure.value)" :disabled="disabled || valueDisabled('kpiMeasures', measure.value)" @change="toggleValue('kpiMeasures', measure.value)" />{{ measure.label }}</label></fieldset>
      </template>
      <p v-else class="custom-help">A simple Project count table will be created. Open <strong>Advanced table setup</strong> afterward to choose its exact row and column axes.</p>
    </div>

    <div class="table-recipe" aria-live="polite"><strong>{{ suggestedTitle }}</strong><dl><div><dt>Rows</dt><dd>{{ recipe.rows }}</dd></div><div><dt>Columns</dt><dd>{{ recipe.columns }}</dd></div><div><dt>Period</dt><dd>{{ recipe.period }}</dd></div><div><dt>Values</dt><dd>{{ recipe.values }}</dd></div></dl><p>{{ recipe.explanation }}</p></div>
    <p v-if="error" class="creator-error" role="status">{{ error }}</p>
  </section>
</template>

<script>
import { TABLE_TEMPLATES, createTableCreationDraft, tableTemplateDraft, tableCreationError, tableRecipeFromCreation, tableTitleFromCreation } from '../logic/tableCreation';
export default {
  name: 'TableCreationControls',
  props: { draft: Object, catalog: Object, currentYear: Number, disabled: Boolean },
  emits: ['change'],
  data() { return { templates: TABLE_TEMPLATES }; },
  computed: {
    categoryMeasures() { return this.catalog.measures || []; },
    trendMeasures() { return (this.catalog.measures || []).filter(measure => ['cumulativeSavings', 'annualSavings'].includes(measure.value)); },
    kpiMeasures() { return (this.catalog.measures || []).filter(measure => measure.value.startsWith('field:')); },
    recipe() { return tableRecipeFromCreation(this.draft, this.currentYear, this.catalog); },
    suggestedTitle() { return tableTitleFromCreation(this.draft, this.currentYear, this.catalog); },
    error() { return tableCreationError(this.draft, this.currentYear, this.catalog); }
  },
  methods: {
    emit(value) { if (!this.disabled) this.$emit('change', value); },
    chooseTemplate(template) { this.emit(tableTemplateDraft(template, this.currentYear, this.catalog)); },
    reset() { this.emit(createTableCreationDraft(this.currentYear, this.catalog)); },
    update(key, value) { this.emit({ ...this.draft, [key]: value }); },
    toggleValue(key, value) {
      const values = [...this.draft[key]], index = values.indexOf(value);
      if (index >= 0) { if (values.length > 1) values.splice(index, 1); }
      else if (values.length < 6) values.push(value);
      this.emit({ ...this.draft, [key]: values });
    },
    valueDisabled(key, value) { const values = this.draft[key]; return values.includes(value) ? values.length === 1 : values.length >= 6; },
    displayMeasure(measure) { return measure.value === 'cumulativeSavings' ? 'Cumulative Actual' : measure.value === 'annualSavings' ? 'Annual Increase' : measure.label; }
  }
};
</script>

<style scoped>
.table-creator { border-top: 1px solid #dce3ec; margin-top: 16px; padding-top: 16px; }
.table-creator-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.table-creator h4 { color: #05204a; margin: 0 0 6px; font-size: 15px; }
.table-creator-heading p, .custom-help { color: #536378; font-size: 12px; line-height: 1.5; margin: 0 0 12px; }
button { border: 1px solid #cdd7e2; background: #fff; color: #05204a; padding: 8px 10px; border-radius: 5px; cursor: pointer; font: inherit; font-size: 12px; }
.table-template-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.table-template-card { display: grid; grid-template-columns: 18px 54px minmax(0, 1fr); gap: 4px 8px; align-items: start; padding: 10px; border: 1px solid #cbd5df; border-radius: 7px; background: #fff; cursor: pointer; min-width: 0; }
.table-template-card.selected { border-color: #007fa3; box-shadow: inset 0 0 0 1px #007fa3; background: #eef9fc; }
.table-template-card input { margin: 3px 0 0; }
.table-template-card strong, .table-template-card small, .table-template-card em { grid-column: 3; overflow-wrap: anywhere; }
.table-template-card strong { color: #23344b; font-size: 12px; }
.table-template-card small { color: #536378; font-size: 11px; line-height: 1.4; }
.table-template-card em { color: #1f5fa8; font-size: 10px; font-style: normal; }
.mini-table { grid-column: 2; grid-row: 1 / span 3; display: grid; grid-template-columns: repeat(3, 1fr); width: 50px; height: 38px; border: 1px solid #7d96ae; border-radius: 3px; overflow: hidden; }
.mini-table i { border-right: 1px solid #bdccda; border-bottom: 1px solid #bdccda; background: #fff; }
.mini-table i:nth-child(-n+3) { background: #dceaf5; }
.mini-category, .mini-years { grid-template-columns: 1.3fr repeat(2, 1fr); }
.mini-kpi { grid-template-columns: 1.5fr 1fr; }
.guided-questions { background: #fff; border: 1px solid #dce3ec; border-radius: 7px; padding: 12px; margin-top: 12px; }
.guided-questions label:not(.check-option) { display: flex; flex-direction: column; gap: 5px; margin: 10px 0; color: #23344b; font-size: 12px; font-weight: 600; }
select, input[type="number"] { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #bdccdc; border-radius: 5px; background: #fff; color: #23344b; font: inherit; }
.question-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
fieldset { border: 1px solid #dce3ec; border-radius: 6px; padding: 10px; margin: 12px 0 0; max-height: 210px; overflow-y: auto; }
legend { color: #23344b; font-size: 12px; font-weight: 600; } legend span { color: #607086; font-weight: 400; }
.check-option { display: flex; gap: 7px; align-items: flex-start; color: #23344b; font-size: 12px; margin: 7px 0; }
.check-option input { margin: 2px 0 0; }
.table-recipe { margin-top: 12px; padding: 12px; border-left: 3px solid #1f5fa8; background: #eef4fa; color: #243e60; }
.table-recipe > strong { font-size: 13px; }
.table-recipe dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 12px; margin: 10px 0; }
.table-recipe dl div { min-width: 0; } .table-recipe dt { font-size: 10px; text-transform: uppercase; color: #607086; } .table-recipe dd { margin: 2px 0 0; font-size: 12px; overflow-wrap: anywhere; }
.table-recipe p, .creator-error { margin: 8px 0 0; font-size: 11px; line-height: 1.5; }
.creator-error { color: #9b251d; }
@media (max-width: 650px) { .table-template-grid, .question-row, .table-recipe dl { grid-template-columns: 1fr; } }
</style>
