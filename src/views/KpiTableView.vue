<template>
  <div class="gui-container">
    <h2>Project KPI Dashboard</h2>

    <div class="table-wrapper" tabindex="0" aria-label="Project KPI table; scroll horizontally to see all columns">
      <table :style="{ width: tableWidth + 'px' }">
        <caption class="sr-only">Project identifiers, yearly savings, KPIs, and additional project fields</caption>
        <colgroup>
          <col :style="{ width: ID_COLUMN_WIDTH + 'px' }">
          <col :style="{ width: NAME_COLUMN_WIDTH + 'px' }">
          <col
            v-for="columnIndex in totalColumnCount - 2"
            :key="columnIndex"
            :style="{ width: DATA_COLUMN_WIDTH + 'px' }"
          >
        </colgroup>
        <thead>
          <tr>
            <th scope="col" class="sticky-col project-id-col">Project ID</th>
            <th scope="col" class="sticky-col project-name-col">Project Name</th>
            <th v-for="year in visibleYears" :key="'year-' + year" scope="col">{{ year }}</th>
            <th v-for="column in kpiColumns" :key="column.field" scope="col">{{ column.label }}</th>
            <th v-for="field in visibleProjectFields" :key="'custom-' + field.columnName" scope="col">
              {{ field.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(project, index) in props.projects" :key="project.projectId ?? 'row-' + index">
            <td class="sticky-col-data project-id-col"><strong>{{ formatValue(project.projectId) }}</strong></td>
            <td class="sticky-col-data project-name-col"><strong>{{ formatValue(project.projectName) }}</strong></td>
            <td v-for="year in visibleYears" :key="'year-' + year">
              {{ formatValue(project['year' + year]) }}
            </td>
            <td
              v-for="column in kpiColumns"
              :key="column.field"
              :class="{ 'text-left': column.type === 'text' }"
            >
              {{ formatValue(project[column.field], column.type) }}
            </td>
            <td
              v-for="field in visibleProjectFields"
              :key="'custom-' + field.columnName"
              :class="{ 'text-left': field.type !== 'number' }"
            >
              {{ formatValue(project.customFields?.[field.columnName], field.type) }}
            </td>
          </tr>
          <tr v-if="!props.projects.length">
            <td :colspan="totalColumnCount" class="empty-state">No project data available.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  projects: {
    type: Array,
    default: () => []
  },
  // Pass the definitions from GET /api/manager-project-fields when available.
  // Without definitions, columns are discovered from projects[].customFields.
  projectFields: {
    type: Array,
    default: () => []
  },
  years: {
    type: Array,
    default: () => [2025, 2026, 2027, 2028, 2029, 2030]
  }
});

const ID_COLUMN_WIDTH = 150;
const NAME_COLUMN_WIDTH = 260;
const DATA_COLUMN_WIDTH = 170;

const kpiColumns = [
  { field: 'comment', label: 'Comment', type: 'text' },
  { field: 'capacityGainValue', label: 'Capacity Gain Value', type: 'number' },
  { field: 'capacityGainPercent', label: 'Capacity Gain %', type: 'percent' },
  { field: 'dlValue', label: 'DL Value', type: 'number' },
  { field: 'dlEquivalent', label: 'DL Equivalent', type: 'number' },
  { field: 'idlValue', label: 'IDL Value', type: 'number' },
  { field: 'idlFte', label: 'IDL FTE', type: 'number' },
  { field: 'yieldValue', label: 'Yield Value', type: 'number' },
  { field: 'yieldPercentGain', label: 'Yield (%) Gain', type: 'percent' },
  { field: 'qualityValue', label: 'Quality Value', type: 'number' },
  { field: 'qualityCases', label: 'Quality Cases', type: 'number' }
];

const visibleYears = computed(() => [...new Set(
  props.years
    .filter(year => typeof year === 'number' || typeof year === 'string')
    .filter(year => String(year).trim() !== '')
    .map(Number)
    .filter(year => Number.isInteger(year) && year >= 1000 && year <= 9999)
)].sort((a, b) => a - b));

function validColumnName(name) {
  return typeof name === 'string'
    && /^[a-z][a-z0-9_]{0,63}$/.test(name)
    && !['constructor', 'prototype'].includes(name);
}

function labelFromColumnName(name) {
  return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

const visibleProjectFields = computed(() => {
  const fields = new Map();
  const unavailableFields = new Set(props.projectFields
    .filter(field => field && validColumnName(field.columnName) && field.state && field.state !== 'ready')
    .map(field => field.columnName));
  for (const field of props.projectFields) {
    if (!field || !validColumnName(field.columnName) || fields.has(field.columnName)) continue;
    // Admin registry rows can include incomplete definitions; only ready fields
    // should appear. The viewer-safe definitions endpoint omits state.
    if (unavailableFields.has(field.columnName)) continue;
    fields.set(field.columnName, {
      columnName: field.columnName,
      label: typeof field.label === 'string' && field.label.trim()
        ? field.label.trim() : labelFromColumnName(field.columnName),
      type: ['text', 'number', 'date', 'boolean'].includes(field.type) ? field.type : 'text'
    });
  }
  // Preserve compatibility with existing parents that pass only projects.
  // Values stay nested, so a custom "year2026" does not replace yearly savings.
  for (const project of props.projects) {
    const values = project.customFields;
    if (!values || typeof values !== 'object' || Array.isArray(values)) continue;
    for (const name of Object.keys(values)) {
      if (validColumnName(name) && !fields.has(name) && !unavailableFields.has(name)) {
        fields.set(name, { columnName: name, label: labelFromColumnName(name), type: 'text' });
      }
    }
  }
  return [...fields.values()];
});

const totalColumnCount = computed(() => 2 + visibleYears.value.length + kpiColumns.length + visibleProjectFields.value.length);
const tableWidth = computed(() => ID_COLUMN_WIDTH + NAME_COLUMN_WIDTH + (totalColumnCount.value - 2) * DATA_COLUMN_WIDTH);

function formatValue(value, type = 'text') {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) return '—';
  if (type === 'boolean' || typeof value === 'boolean') {
    if ([true, 1, '1', 'true'].includes(value)) return 'Yes';
    if ([false, 0, '0', 'false'].includes(value)) return 'No';
  }
  if (type === 'date') return String(value).slice(0, 10);
  if (type === 'percent') return String(value) + '%';
  // DECIMAL values are returned as strings. Avoid Number() here to retain
  // their precision, including all four decimal places in added number fields.
  return String(value);
}
</script>

<style scoped>
.gui-container {
  width: 100%;
  min-width: 0;
  margin: 0 auto;
  font-family: Arial, sans-serif;
}
h2 {
  color: #333;
  margin-bottom: 20px;
}
.table-wrapper {
  width: 100%;
  overflow-x: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
.table-wrapper:focus-visible {
  outline: 2px solid #0056b3;
  outline-offset: 3px;
}
table {
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  background-color: #fff;
}
th,
td {
  box-sizing: border-box;
  padding: 12px 15px;
  text-align: right;
  vertical-align: top;
  border-bottom: 1px solid #e0e0e0;
  overflow-wrap: anywhere;
}
th {
  background-color: #007bff;
  color: #fff;
  font-weight: bold;
  font-size: 14px;
}
.sticky-col,
.sticky-col-data {
  position: sticky;
  text-align: left;
}
.sticky-col {
  z-index: 2;
  background-color: #0056b3;
}
.sticky-col-data {
  z-index: 1;
  background-color: #f9f9f9;
}
.project-id-col {
  left: 0;
}
.project-name-col {
  left: 150px;
  box-shadow: 2px 0 3px rgba(0, 0, 0, 0.08);
}
.text-left {
  text-align: left;
  white-space: pre-wrap;
}
tbody tr:hover td {
  background-color: #f1f7ff;
}
tbody tr:hover .sticky-col-data {
  background-color: #e2eeff;
}
tbody tr:last-of-type td {
  border-bottom: none;
}
.empty-state {
  text-align: left;
  color: #666;
  padding: 24px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
