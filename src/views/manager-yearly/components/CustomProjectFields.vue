<template>
  <div v-for="field in fields" :key="field.columnName" class="form-group">
    <label :for="'custom-form-' + field.columnName">{{ field.label }}</label>
    <select v-if="field.inputMode === 'dropdown'" :id="'custom-form-' + field.columnName"
      :value="values[field.columnName] ?? ''" @change="changeValue(field, $event.target.value || null)" :disabled="isProcessing">
      <option value="">(Blank)</option>
      <option v-if="values[field.columnName] != null && !(field.options || []).includes(values[field.columnName])"
        :value="values[field.columnName]" disabled>{{ values[field.columnName] }} (refresh options)</option>
      <option v-for="option in field.options" :key="option" :value="option">{{ option }}</option>
    </select>
    <select v-else-if="field.type === 'boolean'" :id="'custom-form-' + field.columnName"
      :value="values[field.columnName] ?? ''" @change="changeValue(field, $event.target.value === '' ? null : $event.target.value === 'true')" :disabled="isProcessing">
      <option value="">(Blank)</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
    <input v-else-if="field.type === 'url'" :id="'custom-form-' + field.columnName"
      type="url" maxlength="2048" placeholder="https://..." :value="values[field.columnName]"
      @input="changeValue(field, $event.target.value)" :disabled="isProcessing" />
    <input v-else-if="field.type === 'date'" :id="'custom-form-' + field.columnName"
      type="date" min="1000-01-01" max="9999-12-31" :value="values[field.columnName]" @input="changeValue(field, $event.target.value)" :disabled="isProcessing" />
    <input v-else-if="field.type === 'number'" :id="'custom-form-' + field.columnName"
      type="text" inputmode="decimal" :value="values[field.columnName]" @input="changeValue(field, $event.target.value)" :disabled="isProcessing" />
    <input v-else :id="'custom-form-' + field.columnName" type="text" maxlength="255"
      :value="values[field.columnName]" @input="changeValue(field, $event.target.value)" :disabled="isProcessing" />
    <small v-if="field.inputMode === 'dropdown'" class="project-field-help">
      {{ field.options?.length ? 'Options from Master Data Configuration: ' + field.configCategory : 'No options yet; ask an admin to add them.' }}
    </small>
  </div>
</template>

<script>
export default {
  name: 'CustomProjectFields',
  props: ['fields', 'values', 'isProcessing'],
  emits: ['change-value'],
  methods: {
    changeValue(field, value) { this.$emit('change-value', field.columnName, value); }
  }
};
</script>

<style scoped src="../styles/dialogs.css"></style>
<style scoped src="../styles/grid.css"></style>
