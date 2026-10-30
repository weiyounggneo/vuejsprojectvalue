<template>
  <div class="table-section" style="padding-top: 20px;">

    <div class="config-controls">
      <div class="form-group" style="max-width: 300px;">
        <label for="categorySelect">Select Master Data Category:</label>
        <select id="categorySelect" v-model="category" class="category-select" :disabled="availableCategories.length === 0">
          <option v-if="availableCategories.length === 0" value="">-- No Categories Exist --</option>
          <option v-for="cat in availableCategories" :key="cat" :value="cat">
            {{ formatCategoryName(cat) }}
          </option>
        </select>
      </div>

      <button class="primary-btn" @click="$emit('open-add')" :disabled="isProcessing">
        + Add New Option
      </button>
    </div>

    <div v-if="selectedCategory === 'SITE'" class="site-catalogue-note">
      <strong>Site catalogue</strong>
      <span>Configured Sites come from Master Data. Sites found in eligible projects or target records stay available in filters and are marked for repair when they are not configured.</span>
    </div>
    <p v-if="selectedCategory === 'SITE' && siteUsageLoading" class="site-usage-status" role="status">Checking Site usage in projects…</p>
    <p v-else-if="selectedCategory === 'SITE' && siteUsageError" class="site-usage-warning" role="status">{{ siteUsageError }}</p>

    <div class="config-grid">
      <div v-if="availableCategories.length === 0" class="no-data-message" style="margin-top: 20px;">
        No master data categories found in the database. Click "+ Add New Option" to create your first category.
      </div>

      <vue-good-table
        v-else
        :columns="configColumns"
        :rows="filteredConfigOptions"
        :pagination-options="{ enabled: true, perPage: 10 }"
        :line-numbers="true"
      >
        <template #table-row="props">
          <span v-if="props.column.field === 'status'" class="site-status" :class="props.row.needsConfiguration ? 'needs-configuration' : 'configured'">
            {{ props.row.status }}
          </span>
          <span v-else-if="props.column.field === 'filterAvailability'" class="site-status available">{{ props.row.filterAvailability }}</span>
          <button v-else-if="props.column.field === 'actions' && props.row.needsConfiguration" type="button" class="configure-site-btn"
            :disabled="isProcessing" @click="$emit('configure-site', props.row)">Configure Site</button>
          <span v-else-if="props.column.field === 'actions'">—</span>
          <span v-else>{{ props.formattedRow[props.column.field] }}</span>
        </template>
        <template #emptystate>
          <div class="no-data-message">No options exist for {{ formatCategoryName(selectedCategory) }}. Add one above.</div>
        </template>
      </vue-good-table>
    </div>
  </div>
</template>

<script>
import { VueGoodTable } from 'vue-good-table-next';
import { methods as formatters } from '../logic/formatters';

export default {
  name: 'MasterDataTab',
  components: { VueGoodTable },
  props: [
    'availableCategories',
    'configColumns',
    'filteredConfigOptions',
    'isProcessing',
    'selectedCategory',
    'siteUsageError',
    'siteUsageLoading'
  ],
  emits: [
    'open-add',
    'configure-site',
    'update:selectedCategory'
  ],
  computed: {
    category: { get() { return this.selectedCategory; }, set(value) { this.$emit('update:selectedCategory', value); } },
  },
  methods: {
    ...formatters,
  },
};
</script>

<style scoped src="../styles/tables.css"></style>
<style scoped src="../styles/controls.css"></style>
<style scoped src="../styles/dialogs.css"></style>
<style scoped src="../styles/columns.css"></style>
<style scoped>
.site-catalogue-note { display: flex; gap: 8px; align-items: baseline; margin: 0 0 12px; padding: 12px 14px; border: 1px solid #cfe0f2; border-radius: 7px; background: #f5f9fe; color: #304e70; line-height: 1.45; }
.site-catalogue-note strong { white-space: nowrap; }
.site-usage-status, .site-usage-warning { margin: 0 0 12px; padding: 10px 12px; border-radius: 6px; }
.site-usage-status { background: #f5f9fe; color: #405b78; }
.site-usage-warning { background: #fff8df; border: 1px solid #ead48a; color: #6b5311; }
.site-status { display: inline-flex; align-items: center; min-height: 24px; padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.site-status.configured, .site-status.available { background: #e2f5e9; color: #17623a; }
.site-status.needs-configuration { background: #fff1d6; color: #785308; }
.configure-site-btn { padding: 6px 10px; border: 1px solid #1f5fa8; border-radius: 5px; background: white; color: #1f5fa8; font-weight: 700; cursor: pointer; }
.configure-site-btn:hover { background: #edf5fe; }
.configure-site-btn:focus-visible { outline: 3px solid #87baf2; outline-offset: 2px; }
.configure-site-btn:disabled { opacity: .6; cursor: default; }
@media (max-width: 680px) { .site-catalogue-note { align-items: flex-start; flex-direction: column; } }
</style>
