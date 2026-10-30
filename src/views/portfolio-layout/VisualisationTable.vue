<template>
  <div class="visualisation-table-scroll" role="region" :aria-label="caption" tabindex="0">
    <table class="visualisation-table" :class="{ compact: density === 'compact', striped: striped !== false }">
      <caption>{{ caption }}</caption>
      <thead><tr><th v-for="column in columns" :key="column.key" scope="col" :class="{ numeric: column.numeric }">{{ column.label }}</th></tr></thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="index">
          <th scope="row">{{ row[columns[0].key] }}</th>
          <td v-for="column in columns.slice(1)" :key="column.key" :class="{ numeric: column.numeric }"><button v-if="drilldowns?.[index]?.[column.key]" type="button" class="value-drill" :aria-label="'View projects: ' + row[columns[0].key] + ', ' + column.label + ', ' + row[column.key]" @click.stop="$emit('drilldown', drilldowns[index][column.key])">{{ row[column.key] }}</button><template v-else>{{ row[column.key] }}</template></td>
        </tr>
        <tr v-if="!rows.length"><td :colspan="columns.length" class="empty-table">No data for this selection.</td></tr>
      </tbody>
      <tfoot v-if="footer"><tr>
        <th scope="row">{{ footer[columns[0].key] }}</th>
        <td v-for="column in columns.slice(1)" :key="column.key" :class="{ numeric: column.numeric }"><button v-if="footerDrilldowns?.[column.key]" type="button" class="value-drill" @click.stop="$emit('drilldown', footerDrilldowns[column.key])">{{ footer[column.key] }}</button><template v-else>{{ footer[column.key] }}</template></td>
      </tr></tfoot>
    </table>
  </div>
</template>

<script>
export default {
  name: 'VisualisationTable',
  props: ['columns', 'rows', 'footer', 'caption', 'density', 'striped', 'drilldowns', 'footerDrilldowns'],
  emits: ['drilldown']
};
</script>

<style scoped>
.visualisation-table-scroll { width: 100%; overflow-x: auto; }
.visualisation-table-scroll:focus-visible { outline: 2px solid #007fa3; outline-offset: 2px; }
.visualisation-table { width: 100%; border-collapse: collapse; font-size: 13px; color: #23344b; }
caption { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
th, td { padding: 11px 12px; border-bottom: 1px solid #dce5ef; text-align: left; overflow-wrap: anywhere; }
thead { color: #05204a; background: #eef4fb; }
tbody th { font-weight: 400; }
.striped tbody tr:nth-child(even) { background: #f8fafc; }
.compact th, .compact td { padding: 6px 9px; }
.numeric { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
tfoot { font-weight: 700; background: #eef4fb; border-top: 2px solid #c9d7e6; }
.empty-table { text-align: center; color: #536378; padding: 20px 12px; }
.value-drill { font: inherit; color: #1f5fa8; padding: 3px; min-height: 24px; background: transparent; border: 0; text-decoration: none; cursor: pointer; } .value-drill:focus-visible { outline: 3px solid #87baf2; outline-offset: 2px; }
</style>
