<template>
  <div class="drill-backdrop" @click.stop="onBackdrop" @keydown.stop="onKeydown">
    <section ref="dialog" class="project-drilldown" role="dialog" aria-modal="true" aria-label="Contributing projects" tabindex="-1">
      <header><div><h3>Contributing projects</h3><p>{{ scope.label }} · {{ scope.year }} · {{ data.label }}</p></div><button ref="close" type="button" @click="$emit('close')">Close</button></header>
      <p v-if="data.target" role="status"><strong>{{ format(data.total) }}</strong> · This value comes from Site target records, not individual projects. There is no project-level target allocation.</p>
      <template v-else>
        <p><strong>{{ format(data.total) }}</strong> · {{ data.projects.length }} scoped projects<template v-if="data.missing"> · {{ data.missing }} blank/invalid numeric values</template></p>
        <p class="drill-note">Global filters, this item's filters, PMO gate and selected category are already applied. On-Hold and Cancelled projects are excluded.</p>
        <p v-if="data.operation !== 'sum' && data.operation !== 'count'" class="drill-note">The result is recalculated from these projects. {{ data.operation === 'distinct' ? 'Repeated numeric values count once.' : 'Project values are not added to produce an average, minimum or maximum.' }} Blank/invalid values are excluded; zero is included. Empty results display 0.</p>
        <p v-else-if="data.missing" class="drill-note">Blank/invalid values contribute zero to Sum.</p>
        <label>Find a project<input v-model="search" type="search" placeholder="Project ID, name or Site" /></label>
        <div class="drill-table"><table><thead><tr><th>Project ID</th><th>Project name</th><th>Site</th><th>Status</th><th class="number">{{ data.operation === 'count' ? 'Count' : 'Source value (unscaled)' }}</th></tr></thead>
          <tbody><tr v-for="(project, index) in visibleProjects" :key="index"><td>{{ project.row.projectId }}</td><td>{{ project.row.projectName }}</td><td>{{ project.row.sites }}</td><td>{{ project.row.projectStatus }}</td><td class="number">{{ project.value === null ? 'Blank / invalid' : format(project.value, true) }}</td></tr>
          <tr v-if="!visibleProjects.length"><td colspan="5">{{ filteredProjects.length ? 'No more projects.' : 'No projects match this selection.' }}</td></tr></tbody></table></div>
        <footer><span>{{ filteredProjects.length }} matches · page {{ page }} of {{ pages }}</span><button type="button" :disabled="page <= 1" @click="page--">Previous</button><button type="button" :disabled="page >= pages" @click="page++">Next</button></footer>
      </template>
    </section>
  </div>
</template>

<script>
import { breakdownData } from './drilldown';
import { formatValue } from './presentation';
export default {
  name: 'ProjectDrilldown', props: ['scope', 'catalog', 'formatSettings'], emits: ['close'],
  data() { return { search: '', page: 1 }; },
  computed: {
    data() { return breakdownData(this.scope, this.catalog); },
    filteredProjects() { const text = this.search.trim().toLowerCase(); return this.data.projects.filter(project =>
      [project.row.projectId, project.row.projectName, project.row.sites].some(value => String(value || '').toLowerCase().includes(text))); },
    pages() { return Math.max(1, Math.ceil(this.filteredProjects.length / 50)); },
    visibleProjects() { return this.filteredProjects.slice((this.page - 1) * 50, this.page * 50); }
  },
  watch: { search() { this.page = 1; } },
  mounted() { this._drillOpener = document.activeElement; this.$nextTick(() => this.$refs.close?.focus()); },
  beforeUnmount() { if (this.$refs.dialog?.contains?.(document.activeElement)) this._drillOpener?.focus?.(); },
  methods: {
    onBackdrop(event) { if (event.target === event.currentTarget) this.$emit('close'); },
    format(value, source = false) { return source ? Number(value).toLocaleString('en-US', { maximumFractionDigits: 20 }) : formatValue(value, this.data.unit, this.data.unit === 'count' ? { mode: 'number', decimals: 0 } : this.formatSettings); },
    onKeydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); this.$emit('close'); }
      if (event.key === 'Tab') {
        const nodes = [...(this.$refs.dialog?.querySelectorAll?.('button:not(:disabled), input, [tabindex="0"]') || [])];
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
  }
};
</script>

<style scoped>
.drill-backdrop { position: fixed; inset: 0; z-index: 5000; background: #10233f99; display: flex; align-items: center; justify-content: center; padding: 20px; }
.project-drilldown { background: white; color: #23344b; border-radius: 10px; padding: 20px; width: min(100%, 1000px); max-height: calc(100vh - 80px); overflow-y: auto; box-shadow: 0 16px 60px #10233f55; }
header, footer { display: flex; align-items: center; gap: 12px; justify-content: space-between; } h3 { margin: 0; color: #243e60; } p { line-height: 1.5; font-size: 13px; } .drill-note { color: #536378; }
button, input { font: inherit; border: 1px solid #bdccdc; border-radius: 5px; padding: 8px 12px; background: white; color: #243e60; } button { cursor: pointer; } button:disabled { opacity: .5; cursor: default; } button:focus-visible, input:focus-visible { outline: 3px solid #87baf2; outline-offset: 2px; }
label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; margin-bottom: 12px; } .drill-table { overflow-x: auto; } table { width: 100%; border-collapse: collapse; font-size: 13px; } th, td { padding: 9px; border-bottom: 1px solid #dce5ef; text-align: left; overflow-wrap: anywhere; } thead { background: #eef4fb; } .number { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; } footer { margin-top: 12px; font-size: 12px; flex-wrap: wrap; } footer span { margin-right: auto; }
@media (max-width: 650px) { .drill-backdrop { padding: 8px; } .project-drilldown { padding: 12px; max-height: calc(100vh - 40px); } }
</style>
