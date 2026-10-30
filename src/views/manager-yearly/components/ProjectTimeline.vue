<template>
  <div class="analytics-section">
    <div v-if="rows.length > 0" class="analytics-layout">


      <div class="analytics-shared-header">
        <h2 class="section-title">Project Timeline & Milestones</h2>
        <div class="global-filter-bar">
          <span class="sidebar-title">Site Filter:</span>
          <button
            class="site-btn"
            :class="{ active: timelineFilter.site === 'ALL' }"
            @click="$emit('site-change', 'ALL')"
          >
            All Sites
          </button>
          <button
            v-for="site in analyticsSiteOptions"
            :key="site"
            class="site-btn"
            :class="{ active: timelineFilter.site === site }"
            @click="$emit('site-change', site)"
          >
            {{ site }}
          </button>
        </div>
      </div>


      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">Proposed Phase Timelines</h3>
        </div>
        <div class="gantt-scroll-container">
          <apexchart
            type="rangeBar"
            :height="ganttChartHeight"
            :options="ganttChartOptions"
            :series="ganttChartSeries"
          ></apexchart>
        </div>
      </div>


      <div class="chart-card">
        <div class="chart-header" style="flex-direction: column; align-items: flex-start; gap: 8px;">
          <h3 class="chart-title">Milestone Tracking</h3>

          <div v-if="isEditor" class="inline-edit-hint" style="margin: 0; padding: 8px 12px; font-size: 0.85rem; width: 100%; box-sizing: border-box;">
            💡 <strong>Tip:</strong> Double-click a Target date to update it. Use Update Project Data to edit Actual dates.
          </div>
        </div>
        <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
          <table class="summary-table">
            <thead style="position: sticky; top: 0; z-index: 10;">
              <tr>
                <th>Project Name</th>
                <th>PMO Gate</th>

                <th>Target G1</th>
                <th>Actual G1</th>
                <th>Target G2</th>
                <th>Actual G2</th>
                <th>Target G3</th>
                <th>Actual G3</th>
                <th>Target Closed</th>
                <th>Actual Closed</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredTimelineRows" :key="item.projectId">
                <td><strong>{{ item.projectName }}</strong></td>
                <td><span class="badge">{{ item.currentPmoGate || '-' }}</span></td>


                <td>
                  <div v-if="editingCell.rowId === item.projectId && editingCell.field === 'targetG1Date'">
                    <input type="date" v-model="editingValue" @blur="$emit('save-edit', item)" @keyup.enter="$emit('save-edit', item)" @keyup.esc="$emit('cancel-edit', $event)" v-focus class="inline-input" />
                  </div>
                  <div v-else @dblclick.stop="$emit('start-edit', item, 'targetG1Date', item.targetG1Date)" class="editable-cell" :title="isEditor ? 'Double-click to edit' : ''">
                    {{ formatDate(item.targetG1Date) }}
                  </div>
                </td>


                <td :class="getRagClass(item.actualG1Date, item.targetG1Date)">
                  <div class="milestone-actual-value">
                    <strong>{{ item.actualG1Date ? formatDate(item.actualG1Date) : 'Pending' }}</strong>
                  </div>
                </td>


                <td>
                  <div v-if="editingCell.rowId === item.projectId && editingCell.field === 'targetG2Date'">
                    <input type="date" v-model="editingValue" @blur="$emit('save-edit', item)" @keyup.enter="$emit('save-edit', item)" @keyup.esc="$emit('cancel-edit', $event)" v-focus class="inline-input" />
                  </div>
                  <div v-else @dblclick.stop="$emit('start-edit', item, 'targetG2Date', item.targetG2Date)" class="editable-cell" :title="isEditor ? 'Double-click to edit' : ''">
                    {{ formatDate(item.targetG2Date) }}
                  </div>
                </td>


                <td :class="getRagClass(item.actualG2Date, item.targetG2Date)">
                  <div class="milestone-actual-value">
                    <strong>{{ item.actualG2Date ? formatDate(item.actualG2Date) : 'Pending' }}</strong>
                  </div>
                </td>


                <td>
                  <div v-if="editingCell.rowId === item.projectId && editingCell.field === 'targetG3Date'">
                    <input type="date" v-model="editingValue" @blur="$emit('save-edit', item)" @keyup.enter="$emit('save-edit', item)" @keyup.esc="$emit('cancel-edit', $event)" v-focus class="inline-input" />
                  </div>
                  <div v-else @dblclick.stop="$emit('start-edit', item, 'targetG3Date', item.targetG3Date)" class="editable-cell" :title="isEditor ? 'Double-click to edit' : ''">
                    {{ formatDate(item.targetG3Date) }}
                  </div>
                </td>


                <td :class="getRagClass(item.actualG3Date, item.targetG3Date)">
                  <div class="milestone-actual-value">
                    <strong>{{ item.actualG3Date ? formatDate(item.actualG3Date) : 'Pending' }}</strong>
                  </div>
                </td>


                <td>
                  <div v-if="editingCell.rowId === item.projectId && editingCell.field === 'targetClosedDate'">
                    <input type="date" v-model="editingValue" @blur="$emit('save-edit', item)" @keyup.enter="$emit('save-edit', item)" @keyup.esc="$emit('cancel-edit', $event)" v-focus class="inline-input" />
                  </div>
                  <div v-else @dblclick.stop="$emit('start-edit', item, 'targetClosedDate', item.targetClosedDate)" class="editable-cell" :title="isEditor ? 'Double-click to edit' : ''">
                    {{ formatDate(item.targetClosedDate) }}
                  </div>
                </td>


                <td :class="getRagClass(item.actualClosedDate, item.targetClosedDate)">
                  <div class="milestone-actual-value">
                    <strong>{{ item.actualClosedDate ? formatDate(item.actualClosedDate) : 'Pending' }}</strong>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredTimelineRows.length === 0">
                <td colspan="10" style="text-align: center; color: #666;">No projects found for the selected filters.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>


      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">Pipeline Velocity (Monthly Throughput)</h3>
        </div>
        <div class="table-responsive" style="max-height: 350px; overflow-y: auto;">
          <table class="summary-table">
            <thead style="position: sticky; top: 0; z-index: 10;">
              <tr>
                <th>Month</th>
                <th style="text-align: center;">Entered G1</th>
                <th style="text-align: center;">Entered G2</th>
                <th style="text-align: center;">Entered G3</th>
                <th style="text-align: center;">Total Transitions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in velocityData.slice(0, 6)" :key="index">
                <td><strong>{{ row.month }}</strong></td>
                <td style="text-align: center; color: #124076; font-weight: 600;">{{ row.g1 }}</td>
                <td style="text-align: center; color: #117A65; font-weight: 600;">{{ row.g2 }}</td>
                <td style="text-align: center; color: #6C3483; font-weight: 600;">{{ row.g3 }}</td>
                <td style="text-align: center; font-weight: 800; font-size: 1.05rem; background-color: #f8f9fb;">{{ row.total }}</td>
              </tr>
              <tr v-if="velocityData.length === 0">
                <td colspan="5" style="text-align: center; color: #666; padding: 30px;">
                  <em>No historical transitions found.</em>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <div v-else class="no-data-message" style="margin: 40px; text-align: center;">
      No project data available to display timeline. Please add data in the Grid tab.
    </div>
  </div>
</template>

<script>
import VueApexCharts from 'vue3-apexcharts';
import { methods as formatters } from '../logic/formatters';

export default {
  name: 'ProjectTimeline',
  components: { apexchart: VueApexCharts },
  props: [
    'analyticsSiteOptions',
    'editValue',
    'editingCell',
    'filteredTimelineRows',
    'ganttChartHeight',
    'ganttChartOptions',
    'ganttChartSeries',
    'isEditor',
    'rows',
    'timelineFilter',
    'velocityData'
  ],
  emits: [
    'cancel-edit',
    'save-edit',
    'site-change',
    'start-edit',
    'update:editValue'
  ],
  computed: {
    editingValue: { get() { return this.editValue; }, set(value) { this.$emit('update:editValue', value); } },
  },
  methods: {
    ...formatters,

  },
};
</script>

<style scoped src="../styles/dashboard.css"></style>
<style scoped src="../styles/grid.css"></style>
<style scoped src="../styles/table.css"></style>
<style scoped src="../styles/responsive.css"></style>
