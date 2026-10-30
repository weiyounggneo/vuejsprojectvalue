<template>
  <div class="configured-table">
    <p v-if="data.error" class="table-note" role="status">{{ data.error }}</p>
    <template v-else>
      <p class="table-note">{{ data.yearLabel }}</p>
      <visualisation-table :columns="data.columns" :rows="data.rows" :footer="data.footer" :caption="caption"
        :density="settings.density" :striped="settings.striped" :drilldowns="data.drilldowns" :footer-drilldowns="data.footerDrilldowns" @drilldown="scope = $event" />
      <p v-for="note in data.notes" :key="note" class="table-note">{{ note }}</p>
    </template>
    <project-drilldown v-if="scope" :scope="scope" :catalog="catalog" :format-settings="widget.format" @close="scope = null" />
  </div>
</template>

<script>
import VisualisationTable from './VisualisationTable.vue';
import ProjectDrilldown from './ProjectDrilldown.vue';
import { tableData } from './tableData';
import { tableSettings } from './tableSettings';
import { widgetTitle } from './aggregation';
export default {
  name: 'ConfiguredTable',
  components: { VisualisationTable, ProjectDrilldown },
  props: ['widget', 'rows', 'currentYear', 'catalog', 'source'],
  data() { return { scope: null }; },
  watch: { rows: { deep: true, handler() { this.scope = null; } }, currentYear() { this.scope = null; }, widget: { deep: true, handler() { this.scope = null; } } },
  computed: {
    data() { return tableData(this.widget, this.rows || [], this.currentYear, this.catalog, this.source); },
    settings() { return tableSettings(this.widget, this.currentYear); },
    caption() { return widgetTitle(this.widget, this.currentYear); }
  }
};
</script>

<style scoped>
.configured-table { min-width: 0; }
.table-note { color: #536378; font-size: 12px; line-height: 1.5; margin: 3px 0 10px; }
</style>
