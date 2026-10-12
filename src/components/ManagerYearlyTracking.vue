<template>
  <div class="table-gui-page">
    <!-- Loading Overlays -->
    <div v-if="isPageLoading" class="loading-overlay">
      <div class="loading-box">
        <div class="spinner"></div>
        <div class="loading-text">Loading data, please wait...</div>
      </div>
    </div>

    <div v-if="isProcessing && !isPageLoading" class="loading-overlay">
      <div class="loading-box">
        <div class="loading-text">{{ processingMessage || 'Processing, please wait...' }}</div>
        <div class="loading-subtext">Please do not refresh or close the page.</div>
        <div class="loading-bar-wrapper">
          <div class="loading-bar-indeterminate"></div>
        </div>
      </div>
    </div>

    <!-- Top Bar -->
    <header class="top-bar">
      <div class="left">
        <img src="@/assets/st-logo.png" alt="ST Logo" class="logo" />
        <span class="title">
          Project Value Calculation <br />
          AI@BEM Project Tracking List
        </span>
      </div>

      <div class="topbar-actions">
        <button class="back-btn" @click="goBack" :disabled="isProcessing || isPageLoading">Back</button>
        <button class="home-btn" @click="goHome" :disabled="isProcessing || isPageLoading">Home</button>
        <button class="export-pdf-btn" @click="exportToPDF" :disabled="isProcessing || isPageLoading">Export PDF</button>
        <button class="logout-btn" @click="logout" :disabled="isProcessing || isPageLoading">Logout</button>
      </div>
    </header>

    <!-- NAVIGATION TABS -->
    <div class="tabs-container">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'grid' }"
        @click="activeTab = 'grid'"
        :disabled="isProcessing || isPageLoading"
      >
        Data Entry Grid
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'analytics' }"
        @click="activeTab = 'analytics'"
        :disabled="isProcessing || isPageLoading"
      >
        Portfolio Overview
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'timeline' }"
        @click="activeTab = 'timeline'"
        :disabled="isProcessing || isPageLoading"
      >
        Project Timeline
      </button>
    </div>

    <!-- ========================================== -->
    <!-- TAB 1: DATA ENTRY GRID                     -->
    <!-- ========================================== -->
    <div v-show="activeTab === 'grid'" class="grid-section">
      <!-- TIMELINE WINDOW -->
      <div class="timeline-window-card">
        <div class="timeline-window-header">
          <div>
            <h3 class="timeline-window-title">Timeline Window</h3>
            <p class="timeline-window-help">
              Adjust the visible timeline using the controls below.
            </p>
          </div>

          <div class="timeline-window-summary">
            <strong>{{ timelineWindowLabel }}</strong>
            <span>{{ trackingYears.length }} year(s) visible</span>
          </div>
        </div>

        <div class="timeline-window-controls">
          <div class="timeline-control">
            <div class="timeline-control-row">
              <label for="timelineStart">Start Year</label>
              <input
                id="timelineStart"
                type="number"
                :min="timelineConfig.minYear"
                :max="timelineConfig.maxYear"
                v-model.number="timelineConfig.startYear"
                @change="normalizeTimelineWindow('start')"
              />
            </div>
            <input
              type="range"
              :min="timelineConfig.minYear"
              :max="timelineConfig.maxYear"
              step="1"
              v-model.number="timelineConfig.startYear"
              @input="normalizeTimelineWindow('start')"
            />
          </div>

          <div class="timeline-control">
            <div class="timeline-control-row">
              <label for="timelineEnd">End Year</label>
              <input
                id="timelineEnd"
                type="number"
                :min="timelineConfig.minYear"
                :max="timelineConfig.maxYear"
                v-model.number="timelineConfig.endYear"
                @change="normalizeTimelineWindow('end')"
              />
            </div>
            <input
              type="range"
              :min="timelineConfig.minYear"
              :max="timelineConfig.maxYear"
              step="1"
              v-model.number="timelineConfig.endYear"
              @input="normalizeTimelineWindow('end')"
            />
          </div>

          <div class="timeline-shortcuts">
            <button
              type="button"
              class="timeline-shortcut-btn"
              @click="applyTimelineWindow(defaultTimelineStart, defaultTimelineEnd)"
            >
              Default (N-1 to N+3)
            </button>
            <button
              type="button"
              class="timeline-shortcut-btn"
              @click="applyTimelineWindow(currentYear, currentYear + 5)"
            >
              Current + 5
            </button>
            <button
              type="button"
              class="timeline-shortcut-btn"
              @click="applyTimelineWindow(timelineConfig.minYear, timelineConfig.maxYear)"
            >
              All Years
            </button>
          </div>
        </div>

        <div class="timeline-window-footer">
          Visible years:
          <span v-for="year in trackingYears" :key="year" class="year-chip">{{ year }}</span>
        </div>
      </div>

      <!-- ACTION BUTTONS (Moved above the table) -->
      <div class="actions" style="margin: 0 20px 16px 20px; background: white; padding: 16px 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); border: 1px solid #e0e6ed; justify-content: flex-start;">
        <!-- HIDE ADD/UPDATE FROM VIEWERS -->
        <button v-if="isEditor" class="primary-btn" @click="openAddForm" :disabled="isProcessing || isPageLoading || !!tableLoadError || !columnVisibilityLoaded || !!columnVisibilityError">Add</button>
        <button v-if="isEditor" class="primary-btn" @click="openUpdateForm" :disabled="isProcessing || isPageLoading || !selectedRow || !!tableLoadError || !columnVisibilityLoaded || !!columnVisibilityError">
          Update
        </button>

        <div v-if="isEditor" class="divider"></div>
        <button class="view-btn" @click="openHistoryModal" :disabled="isProcessing || isPageLoading || !selectedRow">
          View History
        </button>
        <button class="view-btn" v-if="isAdmin" @click="openGlobalHistoryModal" :disabled="isProcessing || isPageLoading">
          Global Audit Log
        </button>

        <!-- NEW: MANUAL SNAPSHOT OVERRIDE -->
        <div v-if="isAdmin" class="divider"></div>
        <div v-if="isAdmin" style="display: flex; align-items: center; gap: 8px; padding-left: 4px;">
          <label style="font-size: 0.85rem; font-weight: bold; color: #07254a; margin: 0;">Target Month:</label>
          <input 
            type="month" 
            v-model="manualSnapshotMonth" 
            class="inline-input" 
            style="min-height: unset; height: 36px; width: auto; padding: 4px 8px;" 
            :disabled="isProcessing || isPageLoading" 
          />
          <button 
            class="view-btn" 
            @click="forceSnapshot" 
            :disabled="isProcessing || isPageLoading || !manualSnapshotMonth" 
            style="background-color: #d93025 !important;"
          >
            Force Snapshot
          </button>
        </div>

        <div class="divider"></div>
        <button @click="setFinancialView" :disabled="isProcessing || isPageLoading" class="view-btn">
          Financial View
        </button>
        <button @click="setTimelineView" :disabled="isProcessing || isPageLoading" class="view-btn">
          Timeline View
        </button>
        <button @click="setGlobalView" :disabled="isProcessing || isPageLoading" class="view-btn">
          Global View
        </button>
        <button @click="showColumnManager = true" :disabled="isProcessing || isPageLoading" class="view-btn">
          Show / Hide Columns
        </button>
        <button @click="refreshProjectData" :disabled="isProcessing || isPageLoading" class="view-btn">
          Refresh Data & Columns
        </button>
      </div>

      <!-- INLINE FILTERS BAR -->
      <div class="filters-bar">
        
        <!-- SEARCHABLE DROPDOWN WITH AUTO-OPEN & ALIGNMENT -->
        <div class="filter-group custom-dropdown-wrapper">
          <label>Search Project Name:</label>
          <input 
            type="text" 
            v-model="filters.projectName" 
            placeholder="Type or select a project..." 
            @focus="showProjectDropdown = true"
            @input="showProjectDropdown = true"
            @blur="closeProjectDropdown"
            class="filter-input"
          />
          
          <!-- Dropdown popup menu -->
          <ul 
            v-if="showProjectDropdown && filteredProjectNames.length > 0" 
            class="custom-dropdown-menu"
          >
            <li 
              v-for="name in filteredProjectNames" 
              :key="name"
              @mousedown.prevent="selectProject(name)"
            >
              {{ name }}
            </li>
          </ul>
        </div>

        <div class="filter-group">
          <label>Filter by Pillar:</label>
          <select v-model="filters.pillar">
            <option value="">-- All Pillars --</option>
            <option v-for="pillar in uniquePillars" :key="pillar" :value="pillar">{{ pillar }}</option>
          </select>
        </div>

        <!-- SITE FILTER & CLEAR BUTTON GROUPED TOGETHER -->
        <div class="filter-group">
          <label>Filter by Site:</label>
          <div style="display: flex; gap: 8px;">
            <select v-model="filters.site" style="flex: 1;">
              <option value="">-- All Sites --</option>
              <option v-for="site in uniqueSites" :key="site" :value="site">{{ site }}</option>
            </select>
            <button class="cancel" style="padding: 8px 16px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; color: white;" @click="clearFilters">
              Clear Filters
            </button>
          </div>
        </div>

      </div>

      <div class="table-section">
        <div v-if="tableLoadError" class="project-data-error" role="alert">{{ tableLoadError }}</div>
        <div v-if="columnVisibilityError" class="project-data-error" role="alert">{{ columnVisibilityError }} Editing is paused until visibility loads. Use "Refresh Data &amp; Columns" to retry.</div>
        <div v-if="projectFieldsError" class="project-fields-notice" role="status">
          Added project fields could not be loaded: {{ projectFieldsError }} Use "Refresh Data & Columns" to retry.
        </div>
        <!-- HIDE EDIT HINT FROM VIEWERS -->
        <div v-if="isEditor" class="inline-edit-hint">
          💡 <strong>Tip:</strong> Double-click an editable cell to update its value. Use the data entry form to choose or clear actual milestone dates. For multiple sites, separate them with commas (e.g., BSK, MUA).
        </div>

        <div class="horizontal-scroll-wrapper">
          <vue-good-table
            :key="tableViewVersion"
            :columns="tableColumns"
            :rows="filteredRows"
            :pagination-options="{ enabled: true, perPage: 10 }"
            :line-numbers="true"
            @row-click="selectRow"
            :row-style-class="rowClassFn"
          >
            <template #table-row="props">
              <span>
                <!-- Editing Mode -->
                <div v-if="editingCell.rowId === props.row.projectId && editingCell.field === props.column.field" style="width: 100%;">
                  <select
                    v-if="props.column.customInputMode === 'dropdown'"
                    v-model="editValue"
                    @blur="saveInlineEdit(props.row)"
                    @keyup.enter="saveInlineEdit(props.row)"
                    @keyup.esc="cancelInlineEdit"
                    v-focus
                    class="inline-input"
                  >
                    <option :value="null">(Blank)</option>
                    <option v-if="editValue != null && !(props.column.customOptions || []).includes(editValue)" :value="editValue" disabled>{{ editValue }} (refresh options)</option>
                    <option v-for="option in props.column.customOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                  <select
                    v-else-if="props.column.customType === 'boolean'"
                    v-model="editValue"
                    @blur="saveInlineEdit(props.row)"
                    @keyup.enter="saveInlineEdit(props.row)"
                    @keyup.esc="cancelInlineEdit"
                    v-focus
                    class="inline-input"
                  >
                    <option :value="null">(Blank)</option>
                    <option :value="true">Yes</option>
                    <option :value="false">No</option>
                  </select>
                  <input
                    v-else-if="props.column.customType === 'number'"
                    type="text"
                    inputmode="decimal"
                    v-model="editValue"
                    @blur="saveInlineEdit(props.row)"
                    @keyup.enter="saveInlineEdit(props.row)"
                    @keyup.esc="cancelInlineEdit"
                    v-focus
                    class="inline-input"
                  />
                  <input
                    v-else-if="props.column.formatType === 'date' || props.column.customType === 'date'"
                    type="date"
                    v-model="editValue"
                    :min="props.column.customType === 'date' ? '1000-01-01' : undefined"
                    :max="props.column.customType === 'date' ? '9999-12-31' : undefined"
                    @blur="saveInlineEdit(props.row)"
                    @keyup.enter="saveInlineEdit(props.row)"
                    @keyup.esc="cancelInlineEdit"
                    v-focus
                    class="inline-input"
                  />
                  <input
                    v-else-if="props.column.type === 'text'"
                    type="text"
                    v-model="editValue"
                    :maxlength="props.column.customType === 'text' ? 255 : undefined"
                    @blur="saveInlineEdit(props.row)"
                    @keyup.enter="saveInlineEdit(props.row)"
                    @keyup.esc="cancelInlineEdit"
                    v-focus
                    class="inline-input"
                  />
                  <input
                    v-else
                    type="number"
                    step="any"
                    v-model="editValue"
                    @blur="saveInlineEdit(props.row)"
                    @keyup.enter="saveInlineEdit(props.row)"
                    @keyup.esc="cancelInlineEdit"
                    v-focus
                    class="inline-input"
                  />
                </div>

                <!-- Viewing Mode -->
                <div
                  v-else
                  @dblclick.stop="startInlineEdit(props.row, props.column.field, props.row[props.column.field])"
                  class="editable-cell"
                  :class="{ 'readonly-cell': !canEditField(props.column.field) }"
                  :title="canEditField(props.column.field) ? 'Double-click to edit' : ''"
                >
                  <template v-if="props.column.customColumn">
                    {{ formatCustomField(props.column.customColumn, props.row.customFields?.[props.column.customColumn]) }}
                  </template>
                  <template v-else-if="props.column.field === 'projectName'">
                    <strong>{{ props.row.projectName }}</strong>
                  </template>
                  <template v-else-if="props.column.formatType === 'currency'">
                    {{ formatCurrency(props.row[props.column.field]) }}
                  </template>
                  <template v-else-if="props.column.formatType === 'percent'">
                    {{ formatPercent(props.row[props.column.field]) }}
                  </template>
                  <template v-else-if="props.column.formatType === 'date'">
                    {{ formatDate(props.row[props.column.field]) }}
                  </template>
                  <template v-else>
                    {{ props.row[props.column.field] ?? '-' }}
                  </template>
                </div>
              </span>
            </template>

            <template #emptystate>
              <div class="no-data-message">No project data available. Click 'Add' to begin.</div>
            </template>
          </vue-good-table>
        </div>
      </div>

      <!-- SELECTED ROW INFO PANEL -->
      <div v-if="selectedRow" class="audit-panel">
        <h4>Selected Project Metadata</h4>
        <div class="audit-grid">
          <div><strong>Project ID:</strong> {{ selectedRow.projectId || '-' }}</div>
          <div><strong>Project Name:</strong> {{ selectedRow.projectName || '-' }}</div>
          <div><strong>Project Status:</strong> {{ selectedRow.projectStatus || '-' }}</div>
          <div><strong>Pillars:</strong> {{ selectedRow.pillars || '-' }}</div>
          <div><strong>Sites:</strong> {{ selectedRow.sites || '-' }}</div>
          <div><strong>Current PMO Gate:</strong> {{ selectedRow.currentPmoGate || '-' }}</div>
          <div><strong>DTIT Involved:</strong> {{ selectedRow.dtitInvolved || '-' }}</div>
          <div><strong>AI/AA/A Type:</strong> {{ selectedRow.aiAaAType || '-' }}</div>
          <div><strong>FOAK/NOAK:</strong> {{ selectedRow.foakNoak || '-' }}</div>
          <div v-for="field in projectFields" :key="field.columnName">
            <strong>{{ field.label }}:</strong> {{ formatCustomField(field.columnName, selectedRow.customFields?.[field.columnName]) }}
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TAB 2: PORTFOLIO OVERVIEW                  -->
    <!-- ========================================== -->
    <div v-if="activeTab === 'analytics'" class="analytics-section">
      <div v-if="rows.length > 0" class="analytics-layout">
        
        <!-- HEADER & GLOBAL FILTER -->
        <div class="analytics-shared-header">
          <h2 class="section-title">Executive Performance Overview</h2>
          <div class="global-filter-bar">
            <span class="sidebar-title">Site Filter:</span>
            <button
              class="site-btn"
              :class="{ active: dashboardFilter.selectedSite === 'ALL' }"
              @click="dashboardFilter.selectedSite = 'ALL'"
            >
              All Sites
            </button>
            <button
              v-for="site in analyticsSiteOptions"
              :key="site"
              class="site-btn"
              :class="{ active: dashboardFilter.selectedSite === site }"
              @click="dashboardFilter.selectedSite = site"
            >
              {{ site }}
            </button>
          </div>
        </div>

        <!-- EXECUTIVE CARDS SECTION (current year's cumulative figures) -->
        <div class="cards-year-bar">
          <span class="sidebar-title">Cards use the {{ cardsRangeLabel }} column (cumulative through {{ currentYear }})</span>
        </div>

        <div class="executive-cards-section">
          <div class="metric-card bg-overall">
            <h4>Overall</h4>
            <div class="metric-content">
              <span class="metric-value">{{ formatMillions(executiveCardsData.Overall.value) }}</span>
              <span class="metric-divider">|</span>
              <span class="metric-count">{{ executiveCardsData.Overall.count }} Proj</span>
            </div>
          </div>
          <div class="metric-card bg-g1">
            <h4>G1</h4>
            <div class="metric-content">
              <span class="metric-value">{{ formatMillions(executiveCardsData.G1.value) }}</span>
              <span class="metric-divider">|</span>
              <span class="metric-count">{{ executiveCardsData.G1.count }} Proj</span>
            </div>
          </div>
          <div class="metric-card bg-g2">
            <h4>G2</h4>
            <div class="metric-content">
              <span class="metric-value">{{ formatMillions(executiveCardsData.G2.value) }}</span>
              <span class="metric-divider">|</span>
              <span class="metric-count">{{ executiveCardsData.G2.count }} Proj</span>
            </div>
          </div>
          <div class="metric-card bg-g3">
            <h4>G3</h4>
            <div class="metric-content">
              <span class="metric-value">{{ formatMillions(executiveCardsData.G3.value) }}</span>
              <span class="metric-divider">|</span>
              <span class="metric-count">{{ executiveCardsData.G3.count }} Proj</span>
            </div>
          </div>
          <div class="metric-card bg-operationalised">
            <h4>Operationalised</h4>
            <div class="metric-content">
              <span class="metric-value">{{ formatMillions(executiveCardsData.Operationalised.value) }}</span>
              <span class="metric-divider">|</span>
              <span class="metric-count">{{ executiveCardsData.Operationalised.count }} Proj</span>
            </div>
          </div>
        </div>

        <!-- SUMMARY TABLES SECTION (Side-by-Side) -->
        <div class="summary-tables-section">
          <!-- TABLE 1: Pillar Summary -->
          <div class="chart-card">
            <div class="table-responsive">
              <table class="summary-table">
                <thead>
                  <tr>
                    <th>Pillar</th>
                    <th style="text-align: center;">Count</th>
                    <th style="text-align: right;">{{ currentYear }} Annual Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in pillarSummaryData" :key="item.pillar">
                    <td>{{ item.pillar }}</td>
                    <td style="text-align: center;">{{ item.count }}</td>
                    <td style="text-align: right; font-weight: bold;">{{ formatMillions(item.value) }}</td>
                  </tr>
                  <tr v-if="pillarSummaryData.length === 0">
                    <td colspan="3" style="text-align: center; color: #666;">No data available</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TABLE 2: Yearly Summary (N to N+2) -->
          <div class="chart-card">
            <div class="table-responsive">
              <table class="summary-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th style="text-align: right;">Cumulative Actual</th>
                    <th style="text-align: right;">Cumulative Target</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in yearlySummaryData" :key="item.year">
                    <td><strong>{{ item.year }}</strong></td>
                    <td style="text-align: right;">{{ formatMillions(item.actual) }}</td>
                    <td style="text-align: right; color: #28a745;">{{ formatMillions(item.target) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TREND CHARTS WRAPPER WITH SIDEBAR -->
        <div class="trends-wrapper">
          
          <!-- TREND CHARTS GRID (Side-by-Side) -->
          <div class="trend-charts-section" style="width: 100%;">
            <!-- CHART 1: Cumulative Values -->
            <div class="chart-card">
              <div class="chart-header">
                <h3 class="chart-title">Cumulative AI Values</h3>
              </div>
              <div class="chart-body">
                <apexchart
                  type="line"
                  height="260"
                  :options="cumulativeTrendOptions"
                  :series="cumulativeTrendSeries"
                ></apexchart>
              </div>
            </div>

            <!-- CHART 2: Annual increases derived from cumulative entries -->
            <div class="chart-card">
              <div class="chart-header">
                <h3 class="chart-title">Annual AI Value Increase</h3>
              </div>
              <div class="chart-body">
                <apexchart
                  type="line"
                  height="260"
                  :options="annualizedTrendOptions"
                  :series="annualizedTrendSeries"
                ></apexchart>
              </div>
            </div>
          </div>
        </div>

        <!-- 4 PIE CHARTS (Now all on 1 Row) -->
        <div class="piecharts-section">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">DTIT Involved</h3>
            </div>
            <div class="chart-body">
              <apexchart
                type="pie"
                height="240"
                :options="dtitPieOptions"
                :series="dtitPieSeries"
              ></apexchart>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">FOAK / NOAK</h3>
            </div>
            <div class="chart-body">
              <apexchart
                type="pie"
                height="240"
                :options="foakPieOptions"
                :series="foakPieSeries"
              ></apexchart>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Pillars ({{ currentYear }} Annual Value)</h3>
            </div>
            <div class="chart-body">
              <apexchart
                type="pie"
                height="240"
                :options="pillarPieOptions"
                :series="pillarPieSeries"
              ></apexchart>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">KPI Breakdown</h3>
            </div>
            <div class="chart-body">
              <apexchart
                type="pie"
                height="240"
                :options="kpiPieOptions"
                :series="kpiPieSeries"
              ></apexchart>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="no-data-message" style="margin: 40px; text-align: center;">
        No project data available to analyze. Please add data in the Grid tab.
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TAB 3: PROJECT TIMELINE                    -->
    <!-- ========================================== -->
    <div v-if="activeTab === 'timeline'" class="analytics-section">
      <div v-if="rows.length > 0" class="analytics-layout">
        
        <!-- HEADER & TIMELINE FILTERS -->
        <div class="analytics-shared-header">
          <h2 class="section-title">Project Timeline & Milestones</h2>
          <div class="global-filter-bar">
            <span class="sidebar-title">Site Filter:</span>
            <button
              class="site-btn"
              :class="{ active: timelineFilter.site === 'ALL' }"
              @click="timelineFilter.site = 'ALL'"
            >
              All Sites
            </button>
            <button
              v-for="site in analyticsSiteOptions"
              :key="site"
              class="site-btn"
              :class="{ active: timelineFilter.site === site }"
              @click="timelineFilter.site = site"
            >
              {{ site }}
            </button>
          </div>
        </div>

        <!-- 1. GANTT CHART SECTION (Top) -->
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

        <!-- 2. MILESTONE TRACKING TABLE (Middle with INLINE EDITING) -->
        <div class="chart-card">
          <div class="chart-header" style="flex-direction: column; align-items: flex-start; gap: 8px;">
            <h3 class="chart-title">Milestone Tracking</h3>
            <!-- HIDE EDIT HINT FROM VIEWERS -->
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
                  
                  <!-- Target G1 -->
                  <td>
                    <div v-if="editingCell.rowId === item.projectId && editingCell.field === 'targetG1Date'">
                      <input type="date" v-model="editValue" @blur="saveInlineEdit(item)" @keyup.enter="saveInlineEdit(item)" @keyup.esc="cancelInlineEdit" v-focus class="inline-input" />
                    </div>
                    <div v-else @dblclick.stop="startInlineEdit(item, 'targetG1Date', item.targetG1Date)" class="editable-cell" :title="isEditor ? 'Double-click to edit' : ''">
                      {{ formatDate(item.targetG1Date) }}
                    </div>
                  </td>

                  <!-- Actual G1 -->
                  <td :class="getRagClass(item.actualG1Date, item.targetG1Date)">
                    <div class="milestone-actual-value">
                      <strong>{{ item.actualG1Date ? formatDate(item.actualG1Date) : 'Pending' }}</strong>
                    </div>
                  </td>

                  <!-- Target G2 -->
                  <td>
                    <div v-if="editingCell.rowId === item.projectId && editingCell.field === 'targetG2Date'">
                      <input type="date" v-model="editValue" @blur="saveInlineEdit(item)" @keyup.enter="saveInlineEdit(item)" @keyup.esc="cancelInlineEdit" v-focus class="inline-input" />
                    </div>
                    <div v-else @dblclick.stop="startInlineEdit(item, 'targetG2Date', item.targetG2Date)" class="editable-cell" :title="isEditor ? 'Double-click to edit' : ''">
                      {{ formatDate(item.targetG2Date) }}
                    </div>
                  </td>

                  <!-- Actual G2 -->
                  <td :class="getRagClass(item.actualG2Date, item.targetG2Date)">
                    <div class="milestone-actual-value">
                      <strong>{{ item.actualG2Date ? formatDate(item.actualG2Date) : 'Pending' }}</strong>
                    </div>
                  </td>

                  <!-- Target G3 -->
                  <td>
                    <div v-if="editingCell.rowId === item.projectId && editingCell.field === 'targetG3Date'">
                      <input type="date" v-model="editValue" @blur="saveInlineEdit(item)" @keyup.enter="saveInlineEdit(item)" @keyup.esc="cancelInlineEdit" v-focus class="inline-input" />
                    </div>
                    <div v-else @dblclick.stop="startInlineEdit(item, 'targetG3Date', item.targetG3Date)" class="editable-cell" :title="isEditor ? 'Double-click to edit' : ''">
                      {{ formatDate(item.targetG3Date) }}
                    </div>
                  </td>

                  <!-- Actual G3 -->
                  <td :class="getRagClass(item.actualG3Date, item.targetG3Date)">
                    <div class="milestone-actual-value">
                      <strong>{{ item.actualG3Date ? formatDate(item.actualG3Date) : 'Pending' }}</strong>
                    </div>
                  </td>

                  <!-- Target Closed -->
                  <td>
                    <div v-if="editingCell.rowId === item.projectId && editingCell.field === 'targetClosedDate'">
                      <input type="date" v-model="editValue" @blur="saveInlineEdit(item)" @keyup.enter="saveInlineEdit(item)" @keyup.esc="cancelInlineEdit" v-focus class="inline-input" />
                    </div>
                    <div v-else @dblclick.stop="startInlineEdit(item, 'targetClosedDate', item.targetClosedDate)" class="editable-cell" :title="isEditor ? 'Double-click to edit' : ''">
                      {{ formatDate(item.targetClosedDate) }}
                    </div>
                  </td>

                  <!-- Actual Closed -->
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

        <!-- 3. PIPELINE VELOCITY TABLE (Bottom) -->
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

    <!-- ========================================== -->
    <!-- MODALS (Forms & Dialogs)                   -->
    <!-- ========================================== -->

    <!-- ADD / UPDATE MODAL -->
    <div v-if="showAddForm || showUpdateForm" class="modal-overlay">
      <div class="modal large-modal">
        <h3>{{ showAddForm ? 'Add New Project' : 'Update Project Data' }}</h3>

        <form @submit.prevent="showAddForm ? submitAddForm() : submitUpdateForm()">
          <!-- SECTION 1: METADATA -->
          <h4 class="section-heading">1. Project Details (Metadata)</h4>
          <div class="form-grid">
            <div class="form-group">
              <label for="projectId">Project ID <span style="color:red">*</span></label>
              <input id="projectId" type="text" v-model="activeForm.projectId" :disabled="showUpdateForm || isProcessing || !!addProjectCreatedId" required />
            </div>

            <div class="form-group">
              <label for="projectName">Project Name <span style="color:red">*</span></label>
              <input id="projectName" type="text" v-model="activeForm.projectName" :disabled="isProcessing" required />
            </div>

            <div class="form-group" v-if="isFieldShown('projectStatus')">
              <label for="projectStatus">Project Status</label>
              <select id="projectStatus" v-model="activeForm.projectStatus" :disabled="isProcessing">
                <option value="">(Blank)</option>
                <option v-for="status in configOptions.STATUS" :key="status" :value="status">{{ status }}</option>
              </select>
            </div>

            <div class="form-group" v-if="isFieldShown('pillars')">
              <label for="pillars">Pillars</label>
              <select id="pillars" v-model="activeForm.pillars" :disabled="isProcessing">
                <option value="">(Blank)</option>
                <option v-for="pillar in configOptions.PILLAR" :key="pillar" :value="pillar">{{ pillar }}</option>
              </select>
            </div>

            <div class="form-group" v-if="isFieldShown('sites')">
              <label>Sites (Select Multiple)</label>
              <div class="checkbox-group">
                <label><input type="checkbox" value="ALL" v-model="activeForm.sitesArray" :disabled="isProcessing"> ALL</label>
                <label v-for="site in configOptions.SITE" :key="site">
                  <input type="checkbox" :value="site" v-model="activeForm.sitesArray" :disabled="isProcessing"> {{ site }}
                </label>
              </div>
            </div>

            <div class="form-group" v-if="isFieldShown('currentPmoGate')">
              <label for="currentPmoGate">Current PMO Gate</label>
              <select id="currentPmoGate" v-model="activeForm.currentPmoGate" :disabled="isProcessing">
                <option value="">(Blank)</option>
                <option v-for="gate in configOptions.PMOGATE" :key="gate" :value="gate">{{ gate }}</option>
              </select>
            </div>

            <div class="form-group" v-if="isFieldShown('dtitInvolved')">
              <label for="dtitInvolved">DTIT Involved</label>
              <select id="dtitInvolved" v-model="activeForm.dtitInvolved" :disabled="isProcessing">
                <option value="">(Blank)</option>
                <option v-for="opt in configOptions.DTIT" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>

            <div class="form-group" v-if="isFieldShown('aiAaAType')">
              <label for="aiAaAType">AI/AA/A type</label>
              <select id="aiAaAType" v-model="activeForm.aiAaAType" :disabled="isProcessing">
                <option value="">(Blank)</option>
                <option v-for="opt in configOptions.AITYPE" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>

            <div class="form-group" v-if="isFieldShown('foakNoak')">
              <label for="foakNoak">FOAK/NOAK</label>
              <select id="foakNoak" v-model="activeForm.foakNoak" :disabled="isProcessing">
                <option value="">(Blank)</option>
                <option v-for="opt in configOptions.FOAKNOAK" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>
          </div>

          <template v-if="visibleProjectFields.length && !projectFieldsError">
            <h4 class="section-heading">Additional Project Fields</h4>
            <div class="form-grid">
              <div v-for="field in visibleProjectFields" :key="field.columnName" class="form-group">
                <label :for="'custom-form-' + field.columnName">{{ field.label }}</label>
                <select
                  v-if="field.inputMode === 'dropdown'"
                  :id="'custom-form-' + field.columnName"
                  v-model="activeForm.customFields[field.columnName]"
                  :disabled="isProcessing"
                >
                  <option :value="null">(Blank)</option>
                  <option v-if="activeForm.customFields[field.columnName] != null && !(field.options || []).includes(activeForm.customFields[field.columnName])" :value="activeForm.customFields[field.columnName]" disabled>{{ activeForm.customFields[field.columnName] }} (refresh options)</option>
                  <option v-for="option in field.options" :key="option" :value="option">{{ option }}</option>
                </select>
                <select
                  v-else-if="field.type === 'boolean'"
                  :id="'custom-form-' + field.columnName"
                  v-model="activeForm.customFields[field.columnName]"
                  :disabled="isProcessing"
                >
                  <option :value="null">(Blank)</option>
                  <option :value="true">Yes</option>
                  <option :value="false">No</option>
                </select>
                <input
                  v-else-if="field.type === 'number'"
                  :id="'custom-form-' + field.columnName"
                  type="text"
                  inputmode="decimal"
                  v-model="activeForm.customFields[field.columnName]"
                  :disabled="isProcessing"
                />
                <input
                  v-else-if="field.type === 'date'"
                  :id="'custom-form-' + field.columnName"
                  type="date"
                  min="1000-01-01"
                  max="9999-12-31"
                  v-model="activeForm.customFields[field.columnName]"
                  :disabled="isProcessing"
                />
                <input
                  v-else
                  :id="'custom-form-' + field.columnName"
                  type="text"
                  maxlength="255"
                  v-model="activeForm.customFields[field.columnName]"
                  :disabled="isProcessing"
                />
                <small class="project-field-help">{{ field.inputMode === 'dropdown' ? 'Options from Master Data Configuration: ' + field.configCategory + (field.options.length ? '' : '. No options yet; ask an admin to add them.') : customFieldHelp(field.type) }}</small>
              </div>
            </div>
          </template>
          <p v-if="projectFieldsError" class="project-fields-notice">Added fields are unavailable. Existing project details can still be saved.</p>

          <!-- SECTION 2: YEARLY DATA -->
          <h4 v-if="hasVisibleYearlyFields" class="section-heading">2. Yearly Data (Values)</h4>
          <div v-if="hasVisibleYearlyFields" class="form-grid">
            <div class="form-group" v-for="year in visibleTrackingYears" :key="year">
              <label :for="'year' + year">{{ year }}</label>
              <input
                :id="'year' + year"
                type="number"
                step="any"
                v-model="activeForm['year' + year]"
                :disabled="isProcessing"
              />
            </div>
            
            <div class="form-group full-width" v-if="isFieldShown('comment')">
              <label for="comment">Comment</label>
              <input id="comment" type="text" v-model="activeForm.comment" :disabled="isProcessing" />
            </div>
          </div>

          <!-- SECTION 3: KPIs -->
          <h4 v-if="hasVisibleKpiFields" class="section-heading">3. Key Performance Indicators</h4>
          <div v-if="hasVisibleKpiFields" class="form-grid">
            <div class="form-group" v-if="isFieldShown('capacityGainValue')">
              <label for="capacityGainValue">Capacity Gain Value</label>
              <input id="capacityGainValue" type="number" step="any" v-model="activeForm.capacityGainValue" :disabled="isProcessing" />
            </div>

            <div class="form-group" v-if="isFieldShown('capacityGainPercent')">
              <label for="capacityGainPercent">Capacity Gain %</label>
              <input id="capacityGainPercent" type="number" step="any" v-model="activeForm.capacityGainPercent" :disabled="isProcessing" />
            </div>

            <div class="form-group" v-if="isFieldShown('dlValue')">
              <label for="dlValue">DL Value</label>
              <input id="dlValue" type="number" step="any" v-model="activeForm.dlValue" :disabled="isProcessing" />
            </div>

            <div class="form-group" v-if="isFieldShown('dlEquivalent')">
              <label for="dlEquivalent">DL Equivalent</label>
              <input id="dlEquivalent" type="number" step="any" v-model="activeForm.dlEquivalent" :disabled="isProcessing" />
            </div>

            <div class="form-group" v-if="isFieldShown('idlValue')">
              <label for="idlValue">IDL Value</label>
              <input id="idlValue" type="number" step="any" v-model="activeForm.idlValue" :disabled="isProcessing" />
            </div>

            <div class="form-group" v-if="isFieldShown('idlFte')">
              <label for="idlFte">IDL FTE</label>
              <input id="idlFte" type="number" step="any" v-model="activeForm.idlFte" :disabled="isProcessing" />
            </div>

            <div class="form-group" v-if="isFieldShown('yieldValue')">
              <label for="yieldValue">Yield Value</label>
              <input id="yieldValue" type="number" step="any" v-model="activeForm.yieldValue" :disabled="isProcessing" />
            </div>

            <div class="form-group" v-if="isFieldShown('yieldPercentGain')">
              <label for="yieldPercentGain">Yield (%) Gain</label>
              <input id="yieldPercentGain" type="number" step="any" v-model="activeForm.yieldPercentGain" :disabled="isProcessing" />
            </div>

            <div class="form-group" v-if="isFieldShown('qualityValue')">
              <label for="qualityValue">Quality Value</label>
              <input id="qualityValue" type="number" step="any" v-model="activeForm.qualityValue" :disabled="isProcessing" />
            </div>

            <div class="form-group" v-if="isFieldShown('qualityCases')">
              <label for="qualityCases">Quality Cases</label>
              <input id="qualityCases" type="number" step="any" v-model="activeForm.qualityCases" :disabled="isProcessing" />
            </div>
          </div>

          <!-- SECTION 4: TIMELINE TARGETS & ACTUALS -->
          <h4 v-if="hasVisibleMilestoneFields" class="section-heading">4. Timeline Milestones (Targets & Actuals)</h4>
          <p v-if="hasVisibleMilestoneFields" class="project-field-help">Choose or clear actual milestone dates below. Dates you leave unchanged keep their current automatic behavior.</p>
          <div v-if="hasVisibleMilestoneFields" class="form-grid">
            <div class="form-group" v-if="isFieldShown('targetG1Date')">
              <label for="targetG1Date">Target G1 Date</label>
              <input id="targetG1Date" type="date" v-model="activeForm.targetG1Date" :disabled="isProcessing" />
            </div>
            <div class="form-group" v-if="isFieldShown('actualG1Date')">
              <label for="actualG1Date" style="color: #1f5fa8;">Actual G1 Date</label>
              <input id="actualG1Date" type="date" v-model="activeForm.actualG1Date" min="1000-01-01" max="9999-12-31" :disabled="isProcessing || !isEditor" />
            </div>

            <div class="form-group" v-if="isFieldShown('targetG2Date')">
              <label for="targetG2Date">Target G2 Date</label>
              <input id="targetG2Date" type="date" v-model="activeForm.targetG2Date" :disabled="isProcessing" />
            </div>
            <div class="form-group" v-if="isFieldShown('actualG2Date')">
              <label for="actualG2Date" style="color: #1f5fa8;">Actual G2 Date</label>
              <input id="actualG2Date" type="date" v-model="activeForm.actualG2Date" min="1000-01-01" max="9999-12-31" :disabled="isProcessing || !isEditor" />
            </div>

            <div class="form-group" v-if="isFieldShown('targetG3Date')">
              <label for="targetG3Date">Target G3 Date</label>
              <input id="targetG3Date" type="date" v-model="activeForm.targetG3Date" :disabled="isProcessing" />
            </div>
            <div class="form-group" v-if="isFieldShown('actualG3Date')">
              <label for="actualG3Date" style="color: #1f5fa8;">Actual G3 Date</label>
              <input id="actualG3Date" type="date" v-model="activeForm.actualG3Date" min="1000-01-01" max="9999-12-31" :disabled="isProcessing || !isEditor" />
            </div>

            <div class="form-group" v-if="isFieldShown('targetClosedDate')">
              <label for="targetClosedDate">Target Closed Date</label>
              <input id="targetClosedDate" type="date" v-model="activeForm.targetClosedDate" :disabled="isProcessing" />
            </div>
            <div class="form-group" v-if="isFieldShown('actualClosedDate')">
              <label for="actualClosedDate" style="color: #1f5fa8;">Actual Closed Date</label>
              <input id="actualClosedDate" type="date" v-model="activeForm.actualClosedDate" min="1000-01-01" max="9999-12-31" :disabled="isProcessing || !isEditor" />
            </div>
          </div>

          <p v-if="showAddForm && addProjectCreatedId" class="project-fields-notice">
            Project {{ addProjectCreatedId }} has already been created. Saving again finishes the remaining project values.
          </p>
          <p v-if="columnVisibilityError" class="project-data-error" role="alert">{{ columnVisibilityError }}</p>
          <p v-if="formError" class="project-data-error" role="alert">{{ formError }}</p>
          <div class="modal-actions">
            <button type="submit" class="actions primary-btn" :disabled="isProcessing || !columnVisibilityLoaded || !!columnVisibilityError">
              {{ isProcessing ? 'Saving...' : 'Save Record' }}
            </button>
            <button type="button" class="actions cancel" @click="closeForm" :disabled="isProcessing">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ROW-LEVEL HISTORY MODAL -->
    <div v-if="showHistoryModal" class="modal-overlay">
      <div class="modal x-large-modal">
        <h3>Version History: {{ selectedRow?.projectName }}</h3>

        <div v-if="isFetchingHistory" style="text-align: center; padding: 20px;">
          <div class="spinner" style="width: 24px; height: 24px; border-width: 3px;"></div>
          <p>Loading historical data...</p>
        </div>

        <div v-else class="history-table-container">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date Changed</th>
                <th>Changed By</th>
                <th>Status (Action)</th>
                <th>Proj. Status</th>
                <th>PMO Gate</th>
                <th>Comment</th>
                <th>Cap. Gain Val</th>
                <th>Cap. Gain %</th>
                <th>DL Val</th>
                <th>DL Eq.</th>
                <th>IDL Val</th>
                <th>IDL FTE</th>
                <th>Yield Val</th>
                <th>Yield %</th>
                <th>Quality Val</th>
                <th>Quality Cases</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="log in historyData"
                :key="log.history_id"
                :class="{ 'current-row': log.action_type === 'CURRENT' }"
              >
                <td>{{ log.changed_at }}</td>
                <td><strong>{{ log.changed_by }}</strong></td>
                <td>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="badge" :class="{ 'badge-current': log.action_type === 'CURRENT' }">
                      {{ log.action_type === 'UPDATE' ? 'PREVIOUS' : log.action_type }}
                    </span>
                    <!-- REQUIRE isEditor TO SEE RESTORE BUTTON -->
                    <button
                      v-if="isEditor && log.action_type !== 'CURRENT'"
                      class="restore-btn"
                      @click="restoreHistoricalRecord(log)"
                      title="Revert live record to this version"
                    >
                      Restore
                    </button>
                  </div>
                </td>
                <td>{{ log.project_status || '-' }}</td>
                <td>{{ log.current_pmo_gate || '-' }}</td>
                <td>{{ log.comment_text }}</td>
                <td>{{ formatCurrency(log.capacity_gain_value) }}</td>
                <td>{{ formatPercent(log.capacity_gain_pct) }}</td>
                <td>{{ formatCurrency(log.dl_value) }}</td>
                <td>{{ log.dl_equivalent }}</td>
                <td>{{ formatCurrency(log.idl_value) }}</td>
                <td>{{ log.idl_fte }}</td>
                <td>{{ formatCurrency(log.yield_value) }}</td>
                <td>{{ formatPercent(log.yield_gain_pct) }}</td>
                <td>{{ formatCurrency(log.quality_value) }}</td>
                <td>{{ log.quality_cases }}</td>
              </tr>
            </tbody>
          </table>

          <p v-if="historyData.length === 1" style="text-align: center; padding: 16px; color: #666; font-size: 0.9rem;">
            No previous edits found for this record. The current version is the original.
          </p>
        </div>

        <h4 class="section-heading">Additional Fields & Actual Date History</h4>
        <p class="project-field-help">The latest 100 additional-field and actual-date edits are shown below. The Restore buttons above use the recorded project details and KPIs.</p>
        <p v-if="customFieldHistoryError" class="project-fields-notice">{{ customFieldHistoryError }}</p>
        <div v-else-if="isFetchingCustomFieldHistory" class="project-field-help">Loading field and actual-date history...</div>
        <div v-else class="history-table-container">
          <table class="history-table">
            <thead><tr><th>Date Changed</th><th>Changed By</th><th>Field</th><th>Before</th><th>After</th></tr></thead>
            <tbody>
              <tr v-for="change in customFieldHistoryRows" :key="change.key">
                <td>{{ change.changedAt }}</td><td>{{ change.changedBy }}</td><td>{{ change.label }}</td>
                <td>{{ formatCustomField(change.columnName, change.before) }}</td>
                <td>{{ formatCustomField(change.columnName, change.after) }}</td>
              </tr>
              <tr v-if="!customFieldHistoryRows.length"><td colspan="5">No additional-field or actual-date edits have been recorded.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="modal-actions">
          <button type="button" class="actions cancel" @click="showHistoryModal = false">Close</button>
        </div>
      </div>
    </div>

    <!-- GLOBAL AUDIT LOG MODAL -->
    <div v-if="showGlobalHistoryModal" class="modal-overlay">
      <div class="modal x-large-modal" style="max-width: 98%;">
        <h3>Global Audit Log: Manager Dashboard</h3>

        <div v-if="isFetchingGlobalHistory" style="text-align: center; padding: 20px;">
          <div class="spinner" style="width: 24px; height: 24px; border-width: 3px;"></div>
          <p>Loading global audit data...</p>
        </div>

        <div v-else class="global-history-table-container" style="margin-top: 16px;">
          <vue-good-table
            :key="tableViewVersion + 1000"
            :columns="globalHistoryColumns"
            :rows="globalHistoryData"
            :pagination-options="{ enabled: true, perPage: 10 }"
            :search-options="{ enabled: true, placeholder: 'Search entire audit log...' }"
            :row-style-class="globalRowClassFn"
          >
            <template #table-row="props">
              <span v-if="props.column.field === 'action_type'">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge" :class="{ 'badge-current': props.row.action_type === 'CURRENT' }">
                    {{ props.row.action_type === 'UPDATE' ? 'PREVIOUS' : props.row.action_type }}
                  </span>
                  <!-- REQUIRE isEditor TO SEE RESTORE BUTTON -->
                  <button
                    v-if="isEditor && props.row.action_type !== 'CURRENT'"
                    class="restore-btn"
                    @click="restoreHistoricalRecord(props.row)"
                    title="Revert live record to this version"
                  >
                    Restore
                  </button>
                </div>
              </span>
              <span v-else>
                {{ props.formattedRow[props.column.field] }}
              </span>
            </template>

            <template #emptystate>
              <div class="no-data-message">No audit logs found.</div>
            </template>
          </vue-good-table>
        </div>

        <div class="modal-actions" style="margin-top: 20px;">
          <button type="button" class="actions cancel" @click="showGlobalHistoryModal = false">Close</button>
        </div>
      </div>
    </div>

    <!-- MANAGE COLUMNS MODAL -->
    <div v-if="showColumnManager" class="modal-overlay">
      <div class="modal">
        <h3>Show / Hide Columns</h3>
        <p style="margin-bottom: 16px; color: #666; font-size: 0.9rem;">
          Select the columns you want to view in the table.
        </p>

        <div class="column-manager-grid">
          <label v-for="col in tableColumns" :key="col.field" class="column-toggle-label">
            <input
              type="checkbox"
              :checked="!col.hidden"
              @change="toggleColumnVisibility(col)"
              :disabled="col.field === 'projectName' || !isFieldShown(col.field)"
            />
            {{ col.label }}
            <small v-if="!isFieldShown(col.field)"> (Hidden by admin)</small>
          </label>
        </div>

        <div class="modal-actions">
          <button type="button" class="actions cancel" @click="showColumnManager = false">Close</button>
        </div>
      </div>
    </div>

    <!-- SUCCESS DIALOG -->
    <div v-if="showSuccessDialog" class="modal-overlay">
      <div class="confirmationmessage">
        <h3>Successful!</h3>
        <p>{{ successMessage }}</p>
        <div class="modal-actions">
          <button class="actions formButton" @click="showSuccessDialog = false" :disabled="isProcessing">OK</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { VueGoodTable } from 'vue-good-table-next';
import VueApexCharts from 'vue3-apexcharts';
import 'vue-good-table-next/dist/vue-good-table-next.css';
import html2pdf from 'html2pdf.js';

const MASTER_FIELDS = [
  'projectId', 'projectName', 'projectStatus', 'pillars', 'sites',
  'currentPmoGate', 'dtitInvolved', 'aiAaAType', 'foakNoak',
  'targetG1Date', 'targetG2Date', 'targetG3Date', 'targetClosedDate'
];
const METRIC_FIELDS = [
  'capacityGainValue', 'capacityGainPercent', 'dlValue', 'dlEquivalent',
  'idlValue', 'idlFte', 'yieldValue', 'yieldPercentGain', 'qualityValue', 'qualityCases'
];
const ACTUAL_DATE_FIELDS = ['actualG1Date', 'actualG2Date', 'actualG3Date', 'actualClosedDate'];
const ACTUAL_DATE_LABELS = {
  actualG1Date: 'Actual G1 Date', actualG2Date: 'Actual G2 Date',
  actualG3Date: 'Actual G3 Date', actualClosedDate: 'Actual Closed Date'
};

export default {
  name: 'ManagerYearlyTracking',
  components: {
    VueGoodTable,
    apexchart: VueApexCharts
  },
  directives: {
    focus: {
      mounted(el) {
        el.focus();
      }
    }
  },
  data() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthString = `${currentYear}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    return {
      // NEW: Dynamic Configuration Options from Backend
      configOptions: {
        SITE: [],
        PILLAR: [],
        STATUS: ['Ongoing', 'Cancelled', 'Closed', 'On-Hold'],
        PMOGATE: ['G1', 'G2', 'G2.5', 'G3', 'Closure'],
        DTIT: ['Yes', 'No'],
        AITYPE: ['AI', 'AA', 'A'],
        FOAKNOAK: ['FOAK', 'NOAK']
      },

      // Timeline Window: Default to N-1 to N+3
      currentYear,
      defaultTimelineStart: currentYear - 1,
      defaultTimelineEnd: currentYear + 3,
      timelineConfig: {
        minYear: currentYear - 10,
        maxYear: currentYear + 20,
        startYear: currentYear - 1,
        endYear: currentYear + 3
      },

      // First savings year, used as the baseline when accumulating annual site targets.
      cardsStartYear: 2025,

      // Analytics global chart filter
      dashboardFilter: {
        selectedSite: 'ALL'
      },

      // Project Timeline specific filters
      timelineFilter: {
        site: 'ALL'
      },

      // Global Page State
      activeTab: 'grid',
      accessRight: localStorage.getItem('access_right') || '',
      isProcessing: false,
      isPageLoading: false,
      processingMessage: '',
      showSuccessDialog: false,
      successMessage: '',

      // Dropdown UI state
      showProjectDropdown: false,

      // UI State
      showAddForm: false,
      showUpdateForm: false,
      showColumnManager: false,
      
      // NEW: Manual Snapshot Month Value
      manualSnapshotMonth: currentMonthString,

      // History UI State
      showHistoryModal: false,
      historyData: [],
      isFetchingHistory: false,

      showGlobalHistoryModal: false,
      globalHistoryData: [],
      isFetchingGlobalHistory: false,

      // Data State
      rows: [],
      tableLoadError: '',
      projectFields: [],
      projectFieldsLoaded: false,
      projectFieldsError: '',
      customFieldHistory: [],
      customFieldHistoryError: '',
      isFetchingCustomFieldHistory: false,
      formError: '',
      addProjectCreatedId: null,
      sessionEnded: false,
      siteTargets: [], 
      velocityData: [], 
      selectedRow: null,

      // Columns / Table refresh control
      tableColumns: [],
      hiddenColumns: {},
      adminHiddenFields: [],
      columnVisibilityLoaded: false,
      columnVisibilityError: '',
      tableViewVersion: 0,

      // Inline Filters
      filters: {
        projectName: '',
        pillar: '',
        site: ''
      },

      // Inline Editing State
      editingCell: { rowId: null, field: null },
      editValue: null,

      // Form State
      addForm: {},
      updateForm: {},
      actualDateFormBaseline: {},

      // Static chart colors
      pieColors: ['#1f5fa8', '#28a745', '#ffd600', '#d93025', '#17a2b8', '#6c757d', '#6f42c1', '#fd7e14']
    };
  },
  computed: {
    apiBaseUrl() {
      return (process.env.VUE_APP_API_URL || '').trim().replace(/\/+$/, '');
    },
    customFieldHistoryRows() {
      return this.customFieldHistory.flatMap(log => {
        const before = log.before_values || {};
        const after = log.after_values || {};
        return [...new Set([...Object.keys(before), ...Object.keys(after)])].map(columnName => ({
          key: `${log.audit_id}:${columnName}`,
          columnName,
          label: ACTUAL_DATE_LABELS[columnName] || this.projectFields.find(field => field.columnName === columnName)?.label || columnName,
          before: before[columnName] ?? null,
          after: after[columnName] ?? null,
          changedAt: log.changed_at,
          changedBy: log.changed_by
        }));
      });
    },
    isAdmin() {
      return this.accessRight === 'admin';
    },
    // Check if the user is allowed to edit data
    isEditor() {
      return this.accessRight === 'admin' || this.accessRight === 'user';
    },

    activeForm() {
      return this.showAddForm ? this.addForm : this.updateForm;
    },
    visibleProjectFields() {
      return this.projectFields.filter(field => this.isFieldShown(this.customFieldKey(field.columnName)));
    },
    visibleTrackingYears() {
      return this.trackingYears.filter(year => this.isFieldShown(`year${year}`));
    },
    hasVisibleYearlyFields() {
      return this.visibleTrackingYears.length > 0 || this.isFieldShown('comment');
    },
    hasVisibleKpiFields() {
      return METRIC_FIELDS.some(field => this.isFieldShown(field));
    },
    hasVisibleMilestoneFields() {
      return [...ACTUAL_DATE_FIELDS, 'targetG1Date', 'targetG2Date', 'targetG3Date', 'targetClosedDate'].some(field => this.isFieldShown(field));
    },

    trackingYears() {
      const start = Number(this.timelineConfig.startYear);
      const end = Number(this.timelineConfig.endYear);

      const safeStart = Number.isFinite(start) ? start : this.timelineConfig.minYear;
      const safeEnd = Number.isFinite(end) ? end : this.timelineConfig.maxYear;

      const lower = Math.max(this.timelineConfig.minYear, Math.min(safeStart, safeEnd));
      const upper = Math.min(this.timelineConfig.maxYear, Math.max(safeStart, safeEnd));

      return Array.from({ length: upper - lower + 1 }, (_, i) => lower + i);
    },

    timelineWindowLabel() {
      return `${this.timelineConfig.startYear} - ${this.timelineConfig.endYear}`;
    },

    // Each year column already includes all previous years. Cards use one column only.
    cardYears() {
      return [this.currentYear];
    },
    cardsRangeLabel() {
      return String(this.currentYear);
    },

    globalHistoryColumns() {
      return [
        { label: 'Date Changed', field: 'changed_at', width: '160px' },
        { label: 'Changed By', field: 'changed_by', width: '120px' },
        { label: 'Action', field: 'action_type', width: '120px' },
        { label: 'Project ID', field: 'project_id', width: '100px' },
        { label: 'Project Name', field: 'project_name', width: '150px' },
        { label: 'Proj. Status', field: 'project_status', width: '110px' },
        { label: 'PMO Gate', field: 'current_pmo_gate', width: '100px' },
        { label: 'Comment', field: 'comment_text', width: '200px' },
        { label: 'Cap. Gain Val', field: 'capacity_gain_value', formatFn: this.formatCurrency, width: '120px' },
        { label: 'Cap. Gain %', field: 'capacity_gain_pct', formatFn: this.formatPercent, width: '100px' },
        { label: 'DL Value', field: 'dl_value', formatFn: this.formatCurrency, width: '120px' },
        { label: 'DL Eq.', field: 'dl_equivalent', width: '90px' },
        { label: 'IDL Value', field: 'idl_value', formatFn: this.formatCurrency, width: '120px' },
        { label: 'IDL FTE', field: 'idl_fte', width: '90px' },
        { label: 'Yield Value', field: 'yield_value', formatFn: this.formatCurrency, width: '120px' },
        { label: 'Yield %', field: 'yield_gain_pct', formatFn: this.formatPercent, width: '90px' },
        { label: 'Quality Value', field: 'quality_value', formatFn: this.formatCurrency, width: '120px' },
        { label: 'Quality Cases', field: 'quality_cases', width: '110px' }
      ];
    },

    // ==========================================
    // INLINE FILTERING LOGIC
    // ==========================================
    uniqueProjectNames() {
      return [...new Set(this.rows.map(r => r.projectName).filter(Boolean))].sort();
    },
    filteredProjectNames() {
      const query = (this.filters.projectName || '').toLowerCase().trim();
      if (!query) {
        return this.uniqueProjectNames;
      }
      return this.uniqueProjectNames.filter(name =>
        name.toLowerCase().includes(query)
      );
    },
    uniquePillars() {
      return [...new Set(this.rows.map(r => r.pillars).filter(Boolean))].sort();
    },
    uniqueSites() {
      const allSites = new Set();
      this.rows.forEach(r => {
        if (r.sites) {
          String(r.sites).split(',').forEach(s => {
            const clean = s.trim();
            if (clean && clean.toUpperCase() !== 'ALL') allSites.add(clean);
          });
        }
      });
      return Array.from(allSites).sort();
    },
    filteredRows() {
      return this.rows.filter(row => {
        const matchName = !this.filters.projectName || 
          (row.projectName && row.projectName.toLowerCase().includes(this.filters.projectName.toLowerCase()));
          
        const matchPillar = !this.filters.pillar || row.pillars === this.filters.pillar;
        
        let matchSite = true;
        if (this.filters.site) {
          matchSite = row.sites && (row.sites.includes(this.filters.site) || row.sites.includes('ALL'));
        }

        return matchName && matchPillar && matchSite;
      });
    },

    // ==========================================
    // GLOBAL DASHBOARD FILTER LOGIC
    // ==========================================
    filteredDashboardRows() {
      if (this.dashboardFilter.selectedSite === 'ALL') {
        return this.rows;
      }
      return this.rows.filter(r => 
        r.sites && (String(r.sites).includes(this.dashboardFilter.selectedSite) || String(r.sites).includes('ALL'))
      );
    },

    // ==========================================
    // EXECUTIVE CARDS DATA (Site-filtered, CURRENT YEAR ONLY)
    // ==========================================
    executiveCardsData() {
      const result = {
        Overall: { count: 0, value: 0 },
        G1: { count: 0, value: 0 },
        G2: { count: 0, value: 0 },
        G3: { count: 0, value: 0 },
        Operationalised: { count: 0, value: 0 }
      };

      this.filteredDashboardRows.forEach(row => {
        const projectValue = this.projectSavingsValue(row, this.currentYear);

        result.Overall.count += 1;
        result.Overall.value += projectValue;

        // Target the PMO Gate instead of Project Status
        const gate = String(row.currentPmoGate || '').trim().toUpperCase();
        if (gate === 'G1') {
          result.G1.count += 1;
          result.G1.value += projectValue;
        } else if (gate === 'G2' || gate === 'G2.5') { // Included G2.5 in G2 bucket, adjust if needed
          result.G2.count += 1;
          result.G2.value += projectValue;
        } else if (gate === 'G3') {
          result.G3.count += 1;
          result.G3.value += projectValue;
        } else if (gate === 'CLOSURE') {
          result.Operationalised.count += 1;
          result.Operationalised.value += projectValue;
        }
      });

      return result;
    },

    // ==========================================
    // TREND CHARTS LOGIC (Filtered)
    // ==========================================
    analyticsSiteOptions() {
      const allSites = new Set();
      this.rows.forEach(r => {
        if (r.sites) {
          r.sites.split(',').forEach(s => {
            const clean = s.trim().toUpperCase();
            if (clean && clean !== 'ALL') allSites.add(clean);
          });
        }
      });
      return Array.from(allSites).sort();
    },
    siteTrendData() {
      const labels = this.trackingYears.map(String);
      // Stored entries are cumulative already; never run a second cumulative sum.
      const cumulativeActual = this.trackingYears.map(year => this.portfolioSavingsValue(year) / 1000000);
      const cumulativeExpected = this.trackingYears.map(year => this.siteTargetValue(year, true) / 1000000);

      // Annual increases use the preceding calendar year's entry, even when it is
      // outside the visible timeline window. Keep full precision before formatting.
      const actual = this.trackingYears.map(year => {
        const total = this.filteredDashboardRows.reduce((sum, row) => sum + this.annualSavingsValue(row, year), 0);
        return total / 1000000;
      });
      const expected = this.trackingYears.map(year => this.siteTargetValue(year) / 1000000);

      return { labels, actual, expected, cumulativeActual, cumulativeExpected };
    },
    
    cumulativeTrendOptions() {
      return {
        chart: { fontFamily: 'Arial, sans-serif', toolbar: { show: false }, animations: { enabled: false } },
        colors: ['#05204a', '#037d50'], 
        xaxis: {
          categories: this.siteTrendData.labels,
          title: { text: 'Year' },
          labels: { style: { fontSize: '13px', fontWeight: 600 } }
        },
        yaxis: {
          title: { text: 'Cumulative Value (Millions)' },
          labels: {
            formatter: value => `${Number(value).toFixed(1)}M`,
            style: { fontSize: '13px', fontWeight: 600 }
          }
        },
        stroke: { width: [0, 4], curve: 'smooth' },
        plotOptions: { bar: { columnWidth: '45%', borderRadius: 4 } },
        dataLabels: { enabled: false },
        legend: { position: 'top' },
        tooltip: {
          shared: true,
          intersect: false,
          y: { formatter: value => `${Number(value).toFixed(1)}M` }
        },
        noData: { text: 'No site data available' }
      };
    },
    cumulativeTrendSeries() {
      return [
        { name: 'Cumulative Actual', type: 'column', data: this.siteTrendData.cumulativeActual },
        { name: 'Cumulative Expected', type: 'line', data: this.siteTrendData.cumulativeExpected }
      ];
    },

    annualizedTrendOptions() {
      return {
        chart: { fontFamily: 'Arial, sans-serif', toolbar: { show: false }, animations: { enabled: false } },
        colors: ['#05204a', '#037d50'], 
        xaxis: {
          categories: this.siteTrendData.labels,
          title: { text: 'Year' },
          labels: { style: { fontSize: '13px', fontWeight: 600 } }
        },
        yaxis: {
          title: { text: 'Annual Increase (Millions)' },
          labels: {
            formatter: value => `${Number(value).toFixed(1)}M`,
            style: { fontSize: '13px', fontWeight: 600 }
          }
        },
        stroke: { width: [0, 4], curve: 'smooth' },
        plotOptions: { bar: { columnWidth: '45%', borderRadius: 4 } },
        dataLabels: { enabled: false },
        legend: { position: 'top' },
        tooltip: {
          shared: true,
          intersect: false,
          y: { formatter: value => `${Number(value).toFixed(1)}M` }
        },
        noData: { text: 'No site data available' }
      };
    },
    annualizedTrendSeries() {
      return [
        { name: 'Annual Actual Increase', type: 'column', data: this.siteTrendData.actual },
        { name: 'Annual Expected', type: 'line', data: this.siteTrendData.expected }
      ];
    },

    // ==========================================
    // SUMMARY TABLES DATA (Filtered)
    // ==========================================
    pillarSummaryData() {
      const map = Object.create(null);

      this.filteredDashboardRows.forEach(row => {
        const pillar = row.pillars || 'Unassigned';
        if (!map[pillar]) {
          map[pillar] = { count: 0, value: 0 };
        }
        
        map[pillar].count += 1;
        
        // Pillars show the current year's contribution, not the cumulative balance.
        map[pillar].value += this.annualSavingsValue(row, this.currentYear);
      });

      return Object.entries(map)
        .map(([pillar, data]) => ({ pillar, ...data }))
        .sort((a, b) => b.value - a.value); 
    },

    yearlySummaryData() {
      const displayYears = [this.currentYear, this.currentYear + 1, this.currentYear + 2];
      
      return displayYears.map(year => ({
        year,
        actual: this.portfolioSavingsValue(year),
        target: this.siteTargetValue(year, true)
      }));
    },

    // ==========================================
    // PROJECT TIMELINE (GANTT) LOGIC
    // ==========================================
    filteredTimelineRows() {
      return this.rows.filter(row => {
        if (this.timelineFilter.site === 'ALL') return true;
        return row.sites && (String(row.sites).includes(this.timelineFilter.site) || String(row.sites).includes('ALL'));
      }); 
    },

    ganttChartHeight() {
      const projectCount = this.filteredTimelineRows.length;
      const baseHeight = 100; 
      const dynamicHeight = baseHeight + (projectCount * 28); 
      return projectCount === 0 ? 150 : Math.min(dynamicHeight, 450); 
    },

    ganttChartSeries() {
      const g1Solid = []; const g2Solid = []; const g3Solid = [];
      const g1Past = [];  const g2Past = [];  const g3Past = [];
      const now = new Date().getTime(); 

      const processPhase = (projName, start, end, solidArr, pastArr) => {
        if (!start || !end || start >= end) return;
        
        if (end <= now) {
          pastArr.push({ x: projName, y: [start, end] });
        } else if (start >= now) {
          solidArr.push({ x: projName, y: [start, end] });
        } else {
          pastArr.push({ x: projName, y: [start, now] });
          solidArr.push({ x: projName, y: [now, end] });
        }
      };

      this.filteredTimelineRows.forEach(row => {
        const tG1 = row.targetG1Date ? new Date(row.targetG1Date).getTime() : null;
        const tG2 = row.targetG2Date ? new Date(row.targetG2Date).getTime() : null;
        const tG3 = row.targetG3Date ? new Date(row.targetG3Date).getTime() : null;
        const tClosed = row.targetClosedDate ? new Date(row.targetClosedDate).getTime() : null;

        processPhase(row.projectName, tG1, tG2, g1Solid, g1Past);
        processPhase(row.projectName, tG2, tG3, g2Solid, g2Past);
        processPhase(row.projectName, tG3, tClosed, g3Solid, g3Past);
      });

      return [
        { name: 'G1 (Active/Future)', data: g1Solid },
        { name: 'G2 (Active/Future)', data: g2Solid },
        { name: 'G3 (Active/Future)', data: g3Solid },
        { name: 'G1 (Past)', data: g1Past },
        { name: 'G2 (Past)', data: g2Past },
        { name: 'G3 (Past)', data: g3Past }
      ];
    },

    ganttChartOptions() {
      return {
        chart: {
          type: 'rangeBar',
          fontFamily: 'Arial, sans-serif',
          toolbar: { show: true },
          animations: { enabled: false }
        },
        annotations: {
        xaxis: [
          {
            x: new Date().getTime(),
            strokeDashArray: 4,
            borderColor: '#000000',
            label: {
              borderColor: '#000000',
              position: 'bottom',
              textAnchor: 'middle',
              orientation: 'horizontal', 
              offsetX: 0,           
              offsetY: -6,          
              style: { color: '#fff', background: '#000000', fontWeight: 600, fontSize: '11px' },
              text: 'Today'
            }
          }
        ]
      },
        plotOptions: {
          bar: { horizontal: true, barHeight: '60%', rangeBarGroupRows: true }
        },
        colors: [
          '#124076', '#6C3483', '#4F46E5', 
          '#a3b8d7', '#c9a1d6', '#a9a4f8'  
        ],
        fill: { type: 'solid', opacity: 1 },
        xaxis: {
          type: 'datetime',
          position: 'bottom', 
          labels: { format: 'MMM yyyy', datetimeUTC: false, style: { fontSize: '12px' } }
        },
        yaxis: { labels: { style: { fontSize: '13px', fontWeight: 600 } } },
        legend: { position: 'top', horizontalAlign: 'left' },
        tooltip: { x: { format: 'MM-yyyy' } },
        noData: { text: 'No timeline data available for selected filters.' }
      };
    },

    // ==========================================
    // STATIC PIE CHARTS (Filtered)
    // ==========================================
    dtitPieData() { return this.buildCountPieData('dtitInvolved'); },
    foakPieData() { return this.buildCountPieData('foakNoak'); },
    pillarPieData() {
      const summary = this.pillarSummaryData;
      return { labels: summary.map(item => item.pillar), values: summary.map(item => item.value) };
    },
    kpiPieData() { return this.buildKpiPieData(); },

    dtitPieOptions() { return this.buildPieOptions('DTIT Involved', this.dtitPieData.labels); },
    foakPieOptions() { return this.buildPieOptions('FOAK / NOAK', this.foakPieData.labels); },
    pillarPieOptions() { return this.buildPieOptions('Pillars', this.pillarPieData.labels); },
    kpiPieOptions() { return this.buildPieOptions('KPI Breakdown', this.kpiPieData.labels); },

    dtitPieSeries() { return this.dtitPieData.values; },
    foakPieSeries() { return this.foakPieData.values; },
    pillarPieSeries() { return this.pillarPieData.values; },
    kpiPieSeries() { return this.kpiPieData.values; }
  },
  created() {
    this.rebuildTableColumns();
    this.addForm = this.emptyForm();
    this.updateForm = this.emptyForm();
  },
  async mounted() {
    const token = localStorage.getItem('token');
    if (!token) return this.$router.push('/login');
    this.isPageLoading = true;
    try {
      const response = await this.apiFetch(`${this.apiBaseUrl}/api/check-auth`);
      if (!response.ok) throw new Error('Session expired');
      const auth = await response.json();
      const role = auth.user?.access_right;
      if (!['viewer', 'user', 'admin'].includes(role)) throw new Error('Your account is pending approval.');
      this.accessRight = role;
      localStorage.setItem('access_right', role);
      await Promise.allSettled([
        this.fetchTable({ manageLoading: false }),
        this.fetchConfigOptions()
      ]);
    } catch (err) {
      if (!err.isUnauthorized) this.logout();
    } finally {
      this.isPageLoading = false;
    }
  },
  methods: {
    // Shared admin choices affect both the table and the data entry forms.
    isFieldShown(field) {
      return ['projectId', 'projectName'].includes(field) || !this.adminHiddenFields.includes(field);
    },
    async fetchColumnVisibility() {
      try {
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/manager-column-visibility`);
        if (response.status === 404) throw new Error('The backend needs the column visibility update. Replace server.js and run 004_column_visibility.sql.');
        const data = await this.readApiJson(response, 'Could not load column visibility.');
        if (!Array.isArray(data.hiddenFields) || data.hiddenFields.some(field => typeof field !== 'string') || !Number.isSafeInteger(data.revision) || data.revision < 0) throw new Error('The server returned invalid column visibility settings.');
        this.adminHiddenFields = [...new Set(data.hiddenFields)].filter(field => !['projectId', 'projectName'].includes(field));
        this.columnVisibilityLoaded = true;
        this.columnVisibilityError = '';
        if (this.editingCell.field && !this.isFieldShown(this.editingCell.field)) this.cancelInlineEdit();
        this.rebuildTableColumns();
        return true;
      } catch (err) {
        this.columnVisibilityLoaded = false;
        this.columnVisibilityError = err.message || 'Could not load column visibility.';
        return false;
      }
    },
    // -------------------------------------------------
    // PORTFOLIO VALUES (year columns store cumulative savings)
    // -------------------------------------------------
    projectSavingsValue(row, year) {
      const value = Number(row[`year${year}`]);
      return Number.isFinite(value) ? value : 0;
    },

    portfolioSavingsValue(year) {
      return this.filteredDashboardRows.reduce((sum, row) => sum + this.projectSavingsValue(row, year), 0);
    },

    annualSavingsValue(row, year) {
      const entry = row[`year${year}`];
      // An unentered year contributes nothing; it is not a recorded loss of
      // the previous year's savings. An explicit zero can still show a decrease.
      if (entry === null || entry === undefined || String(entry).trim() === '' || !Number.isFinite(Number(entry))) {
        return 0;
      }
      // Before a project's first entered year, the baseline is zero.
      return this.projectSavingsValue(row, year) - this.projectSavingsValue(row, year - 1);
    },

    siteTargetValue(year, cumulative = false) {
      // Site targets remain annual amounts. Accumulate them from the savings
      // baseline only for cumulative comparisons, independently of the window.
      return this.siteTargets.reduce((sum, target) => {
        const targetYear = Number(target.target_year);
        const matchesYear = cumulative
          ? targetYear >= this.cardsStartYear && targetYear <= year
          : targetYear === year;
        const matchesSite = this.dashboardFilter.selectedSite === 'ALL' || target.site === this.dashboardFilter.selectedSite;
        const value = Number(target.expected_value);
        return matchesYear && matchesSite && Number.isFinite(value) ? sum + value : sum;
      }, 0);
    },

    // -------------------------------------------------
    // DROPDOWN METHODS
    // -------------------------------------------------
    selectProject(name) {
      this.filters.projectName = name;
      this.showProjectDropdown = false;
    },
    closeProjectDropdown() {
      // Small timeout allows click events on list items to register first
      setTimeout(() => {
        this.showProjectDropdown = false;
      }, 150);
    },

    // -------------------------------------------------
    // NEW: FETCH MASTER DATA OPTIONS
    // -------------------------------------------------
    async fetchConfigOptions() {
      try {
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/config/options`);
        if (response.ok) {
          const data = await response.json();
          // Map the exact database category names (e.g. data.SITE) to the Vue state
          this.configOptions.SITE = data.SITE || ['BSK', 'CAL', 'CLB', 'KIR', 'MAL', 'MUA', 'STS'];
          this.configOptions.PILLAR = data.PILLAR || ['Process & Equipment Intelligence', 'Smart Decision Hub', 'Vision Intelligence'];
          this.configOptions.STATUS = data.PROJECT_STATUS || ['Ongoing', 'Cancelled', 'Closed', 'On-Hold'];
          this.configOptions.PMOGATE = data.PMOGATE || ['G1', 'G2', 'G2.5', 'G3', 'Closure'];
          this.configOptions.DTIT = data.DTIT_INVOLVED || ['Yes', 'No'];
          this.configOptions.AITYPE = data.AI_AA_A_TYPE || ['AI', 'AA', 'A'];
          this.configOptions.FOAKNOAK = data.FOAK_NOAK || ['FOAK', 'NOAK'];
        }
      } catch (err) {
        console.error("Failed to load config options. Using safe default fallbacks.", err);
        this.configOptions.SITE = ['BSK', 'CAL', 'CLB', 'KIR', 'MAL', 'MUA', 'STS'];
        this.configOptions.PILLAR = ['Process & Equipment Intelligence', 'Smart Decision Hub', 'Vision Intelligence'];
        this.configOptions.STATUS = ['Ongoing', 'Cancelled', 'Closed', 'On-Hold'];
        this.configOptions.PMOGATE = ['G1', 'G2', 'G2.5', 'G3', 'Closure'];
        this.configOptions.DTIT = ['Yes', 'No'];
        this.configOptions.AITYPE = ['AI', 'AA', 'A'];
        this.configOptions.FOAKNOAK = ['FOAK', 'NOAK'];
      }
    },

    // -------------------------------------------------
    // PDF EXPORT
    // -------------------------------------------------
    async exportToPDF() {
      if (this.activeTab !== 'analytics' && this.activeTab !== 'timeline') {
        alert('Please switch to the Portfolio Overview or Project Timeline tab to export the dashboard.');
        return;
      }

      this.isProcessing = true;
      this.processingMessage = 'Generating single-page PDF... This may take a few seconds.';

      try {
        const element = document.querySelector('.analytics-section');
        const dashboardWidth = element.scrollWidth;
        const dashboardHeight = element.scrollHeight;
        
        const opt = {
          margin:       0,
          filename:     this.activeTab === 'analytics' ? 'Portfolio_Overview_Dashboard.pdf' : 'Project_Timeline_Dashboard.pdf',
          image:        { type: 'jpeg', quality: 1 },
          html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#f4f6f9',
            windowWidth: dashboardWidth,
            width: dashboardWidth,
            height: dashboardHeight
          },
          jsPDF: { 
            unit: 'px', 
            format: [dashboardWidth, dashboardHeight], 
            orientation: dashboardWidth > dashboardHeight ? 'landscape' : 'portrait' 
          } 
        };

        await html2pdf().set(opt).from(element).save();
      } catch (err) {
        alert('Error generating PDF: ' + err.message);
      } finally {
        this.isProcessing = false;
        this.processingMessage = '';
      }
    },

    // -------------------------------------------------
    // TIMELINE WINDOW UTILITIES
    // -------------------------------------------------
    normalizeTimelineWindow(changedField = 'start') {
      let start = Number(this.timelineConfig.startYear);
      let end = Number(this.timelineConfig.endYear);

      if (!Number.isFinite(start)) start = this.timelineConfig.minYear;
      if (!Number.isFinite(end)) end = this.timelineConfig.minYear;

      start = Math.min(Math.max(start, this.timelineConfig.minYear), this.timelineConfig.maxYear);
      end = Math.min(Math.max(end, this.timelineConfig.minYear), this.timelineConfig.maxYear);

      if (start > end) {
        if (changedField === 'start') {
          end = start;
        } else {
          start = end;
        }
      }

      this.timelineConfig.startYear = start;
      this.timelineConfig.endYear = end;
      this.syncTimelineDependentState();
    },

    applyTimelineWindow(startYear, endYear) {
      this.timelineConfig.startYear = startYear;
      this.timelineConfig.endYear = endYear;
      this.normalizeTimelineWindow('end');
    },

    syncTimelineDependentState() {
      this.rebuildTableColumns();

      if (this.showAddForm) {
        this.addForm = this.buildTimelineForm(this.addForm, true);
      }

      if (this.showUpdateForm) {
        this.updateForm = this.buildTimelineForm(this.updateForm, false);
      }

      this.cancelInlineEdit();
    },

    buildTimelineForm(base = {}, pruneOldYears = false) {
      const form = { 
        sitesArray: [], 
        ...base,
        customFields: this.customFieldFormValues(base.customFields)
      };
      const selectedYearKeys = new Set(this.trackingYears.map(year => `year${year}`));

      if (pruneOldYears) {
        Object.keys(form).forEach(key => {
          if (key.startsWith('year') && !selectedYearKeys.has(key)) {
            delete form[key];
          }
        });
      }

      this.trackingYears.forEach(year => {
        const key = `year${year}`;
        if (!(key in form)) {
          form[key] = null;
        }
      });

      return form;
    },

    // -------------------------------------------------
    // STATIC PIE CHART HELPERS
    // -------------------------------------------------
    normalizePieLabel(value) {
      if (value === null || value === undefined || String(value).trim() === '') return 'Unassigned';
      return String(value).trim();
    },

    buildCountPieData(field) {
      const map = {};
      this.filteredDashboardRows.forEach(row => {
        const key = this.normalizePieLabel(row[field]);
        map[key] = (map[key] || 0) + 1;
      });
      const sortedEntries = Object.entries(map).sort((a, b) => b[1] - a[1]);
      return { labels: sortedEntries.map(([label]) => label), values: sortedEntries.map(([, value]) => value) };
    },

    buildKpiPieData() {
      const metrics = [
        { label: 'Capacity Gain ($)', field: 'capacityGainValue' },
        { label: 'DL Value ($)', field: 'dlValue' },
        { label: 'IDL Value ($)', field: 'idlValue' },
        { label: 'Yield Value ($)', field: 'yieldValue' },
        { label: 'Quality Value ($)', field: 'qualityValue' }
      ];

      return {
        labels: metrics.map(m => m.label),
        values: metrics.map(m => {
          return this.filteredDashboardRows.reduce((sum, row) => sum + (Number(row[m.field]) || 0), 0);
        })
      };
    },

    buildPieOptions(title, labels) {
      const isFinancial = title === 'KPI Breakdown' || title === 'Pillars';

      return {
        chart: { type: 'pie', fontFamily: 'Arial, sans-serif', toolbar: { show: false }, animations: { enabled: false } },
        labels,
        colors: this.pieColors,
        legend: {
          show: true,
          position: 'bottom',
          horizontalAlign: 'center',
          fontSize: '12px',
          fontWeight: 500,
          markers: { width: 10, height: 10, radius: 10, offsetX: -2 },
          itemMargin: { horizontal: 8, vertical: 2 },
          formatter: (seriesName, opts) => {
            const val = opts.w.globals.seriesTotals[opts.seriesIndex];
            const total = opts.w.globals.seriesTotals.reduce((a, b) => a + b, 0);
            const percent = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';

            if (isFinancial) {
              const millions = '$' + (Number(val) / 1000000).toFixed(1) + 'M';
              return `${seriesName}: ${millions} (${percent}%)`;
            }
            return `${seriesName}: ${val} (${percent}%)`;
          },
          onItemClick: { toggleDataSeries: false },
          onItemHover: { highlightDataSeries: false }
        },
        dataLabels: { enabled: false },
        tooltip: {
          enabled: true,
          y: {
            formatter: (val, opts) => {
              const seriesArr = opts.series || [];
              const total = seriesArr.reduce((a, b) => a + b, 0);
              const percent = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
              
              if (isFinancial) {
                const millions = '$' + (Number(val) / 1000000).toFixed(1) + 'M';
                return `${millions} (${percent}%)`;
              }
              return `${val} (${percent}%)`;
            }
          }
        },
        stroke: { width: 1, colors: ['#ffffff'] },
        plotOptions: { pie: { expandOnClick: false } },
        states: { hover: { filter: { type: 'none' } }, active: { filter: { type: 'none' } } },
        noData: { text: `No data for ${title}` }
      };
    },

    // -------------------------------------------------
    // API UTILITY
    // -------------------------------------------------
    async apiFetch(url, options = {}) {
      const token = localStorage.getItem('token');
      if (!options.headers) options.headers = {};
      options.headers['Authorization'] = 'Bearer ' + token;

      const response = await fetch(url, options);
      if (response.status === 401 || response.status === 403) {
        if (!this.sessionEnded) {
          this.sessionEnded = true;
          alert('Session expired or access denied. Please log in again.');
          this.logout();
        }
        const error = new Error('Session expired or access denied.');
        error.isUnauthorized = true;
        throw error;
      }
      return response;
    },

    // -------------------------------------------------
    // ADDED PROJECT FIELDS
    // -------------------------------------------------
    async readApiJson(response, fallback) {
      let data;
      try { data = await response.json(); } catch { throw new Error(fallback); }
      if (!response.ok) throw new Error(data?.message || fallback);
      return data;
    },
    customFieldKey(columnName) {
      return `customFields.${columnName}`;
    },
    customFieldForGrid(field) {
      return this.projectFields.find(item => this.customFieldKey(item.columnName) === field);
    },
    customColumnDefs() {
      return this.projectFields.map(field => ({
        label: field.label,
        field: this.customFieldKey(field.columnName),
        // Keep DECIMAL data as strings; format and sort without rounding.
        type: 'text',
        customColumn: field.columnName,
        customType: field.type,
        customInputMode: field.inputMode || 'free',
        customOptions: field.options || [],
        formatFn: value => this.formatCustomField(field.columnName, value),
        ...(field.type === 'number' ? { sortFn: this.compareCustomDecimals } : {}),
        width: '160px',
        hidden: false
      }));
    },
    compareCustomDecimals(a, b) {
      const empty = value => value == null || value === '';
      if (empty(a) || empty(b)) return empty(a) ? (empty(b) ? 0 : -1) : 1;
      const parts = value => {
        const match = /^(-?)(\d+)(?:\.(\d{1,4}))?$/.exec(String(value));
        if (!match) return null;
        const integer = match[2].replace(/^0+(?=\d)/, '');
        const fraction = (match[3] || '').padEnd(4, '0');
        return { negative: !!match[1] && !(integer === '0' && fraction === '0000'), integer, fraction };
      };
      const x = parts(a), y = parts(b);
      if (!x || !y) return String(a).localeCompare(String(b));
      if (x.negative !== y.negative) return x.negative ? -1 : 1;
      let result = x.integer.length === y.integer.length
        ? (x.integer < y.integer ? -1 : x.integer > y.integer ? 1 : 0)
        : x.integer.length < y.integer.length ? -1 : 1;
      if (!result) result = x.fraction < y.fraction ? -1 : x.fraction > y.fraction ? 1 : 0;
      return x.negative ? -result : result;
    },
    customFieldHelp(type) {
      return {
        text: 'Optional text, up to 255 characters.',
        number: 'Optional number: up to 14 integer digits and 4 decimal places.',
        date: 'Optional calendar date.',
        boolean: 'Yes, No, or Blank.'
      }[type] || '';
    },
    formatCustomField(columnName, value) {
      if (value == null || value === '') return '—';
      const field = this.projectFields.find(item => item.columnName === columnName);
      if (field?.type === 'boolean' || typeof value === 'boolean') {
        if ([true, 1, '1', 'true'].includes(value)) return 'Yes';
        if ([false, 0, '0', 'false'].includes(value)) return 'No';
      }
      return field?.type === 'date' ? String(value).slice(0, 10) : String(value);
    },
    customFieldFormValues(source = {}) {
      const values = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
      return Object.fromEntries(this.projectFields.map(field => {
        let value = values[field.columnName] ?? null;
        if (field.type === 'boolean' && (value === 0 || value === 1)) value = value === 1;
        return [field.columnName, value];
      }));
    },
    normalizeCustomField(field, value) {
      if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
      if (field.type === 'text') {
        if (typeof value !== 'string' || Array.from(value).length > 255) throw new Error(`${field.label} must be text with at most 255 characters.`);
        const text = value.trim();
        if (field.inputMode === 'dropdown' && !(field.options || []).includes(text)) throw new Error(`${field.label}: choose an option from ${field.configCategory}, or leave it blank. Use Refresh Data & Columns to load new options.`);
        return text;
      }
      if (field.type === 'number') {
        if (!['number', 'string'].includes(typeof value) || !/^-?\d{1,14}(?:\.\d{1,4})?$/.test(String(value).trim())) {
          throw new Error(`${field.label} must have at most 14 integer digits and 4 decimal places.`);
        }
        return String(value).trim();
      }
      if (field.type === 'boolean') {
        if (![true, false, 0, 1].includes(value)) throw new Error(`${field.label} must be Yes, No, or Blank.`);
        return value === true || value === 1;
      }
      if (field.type === 'date') {
        if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field.label} must be a valid YYYY-MM-DD date.`);
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error(`${field.label} is not a valid calendar date.`);
        return value;
      }
      throw new Error(`Unsupported field type for ${field.label}.`);
    },
    buildCustomFieldPayload(values = {}) {
      return Object.fromEntries(this.visibleProjectFields.map(field => [field.columnName, this.normalizeCustomField(field, values[field.columnName])]));
    },
    normalizeActualDate(field, value) {
      return this.normalizeCustomField({ type: 'date', label: ACTUAL_DATE_LABELS[field] }, value);
    },
    actualDateFormValues(record = {}) {
      return Object.fromEntries(ACTUAL_DATE_FIELDS.map(field => [field, this.normalizeActualDate(field, record[field] ?? null)]));
    },
    addActualDateChanges(payload, form) {
      for (const field of ACTUAL_DATE_FIELDS.filter(field => this.isFieldShown(field))) {
        const value = this.normalizeActualDate(field, form[field] ?? null);
        const original = this.normalizeActualDate(field, this.actualDateFormBaseline[field] ?? null);
        // Omitted dates retain phase-derived defaults. Explicit null clears one.
        if (value !== original) payload[field] = value;
      }
      return payload;
    },
    buildProjectPayload(record, { includeCustomFields = true } = {}) {
      if (!this.columnVisibilityLoaded || this.columnVisibilityError) throw new Error('Refresh Data & Columns to load column visibility before saving.');
      const payload = Object.fromEntries(MASTER_FIELDS.filter(field => this.isFieldShown(field)).map(field => [field, record[field] ?? null]));
      payload.projectId = String(record.projectId || '').trim();
      payload.projectName = String(record.projectName || '').trim();
      if (!payload.projectId || !payload.projectName) throw new Error('Project ID and Project Name are required.');
      if (this.isFieldShown('comment')) payload.comment = record.comment ?? null;
      for (const field of [...METRIC_FIELDS, ...Object.keys(record).filter(key => /^year\d{4}$/.test(key))]) {
        if (!this.isFieldShown(field)) continue;
        const value = record[field];
        if (value == null || String(value).trim() === '') payload[field] = null;
        else {
          if (!['number', 'string'].includes(typeof value) || !Number.isFinite(Number(value))) throw new Error(`${field} must be a finite number or Blank.`);
          payload[field] = value;
        }
      }
      if (includeCustomFields && this.projectFieldsLoaded && !this.projectFieldsError) payload.customFields = this.buildCustomFieldPayload(record.customFields || {});
      return payload;
    },
    hydrateProjectRow(row) {
      const source = row.customFields && typeof row.customFields === 'object' && !Array.isArray(row.customFields) ? row.customFields : {};
      return { ...row, projectStatus: row.projectStatus ?? row.project_status ?? null, customFields: { ...source, ...this.customFieldFormValues(source) } };
    },
    async fetchProjectFields() {
      try {
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/manager-project-fields`);
        if (response.status === 404) throw new Error('The server has not enabled project field definitions yet.');
        const fields = await this.readApiJson(response, 'Failed to load added project fields.');
        if (!Array.isArray(fields)) throw new Error('The server returned an invalid field definition list.');
        const seen = new Set();
        for (const field of fields) {
          if (!field || typeof field.columnName !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(field.columnName)
            || ['constructor', 'prototype'].includes(field.columnName) || seen.has(field.columnName)
            || typeof field.label !== 'string' || !field.label.trim() || !['text', 'number', 'date', 'boolean'].includes(field.type)) {
            throw new Error('The server returned an invalid or duplicate project field definition.');
          }
          if (field.inputMode === undefined) field.inputMode = 'free';
          if (!['free', 'dropdown'].includes(field.inputMode) || (field.inputMode === 'dropdown' && (field.type !== 'text' || typeof field.configCategory !== 'string' || !field.configCategory || !Array.isArray(field.options) || field.options.some(option => typeof option !== 'string')))) throw new Error('The server returned invalid dropdown settings.');
          if (!Array.isArray(field.options)) field.options = [];
          seen.add(field.columnName);
        }
        this.projectFields = fields;
        this.projectFieldsLoaded = true;
        this.projectFieldsError = '';
        this.rebuildTableColumns();
        if (this.showAddForm) this.addForm.customFields = this.customFieldFormValues(this.addForm.customFields);
        if (this.showUpdateForm) this.updateForm.customFields = this.customFieldFormValues(this.updateForm.customFields);
        return true;
      } catch (err) {
        this.projectFieldsError = err.message || 'Failed to load added project fields.';
        return false;
      }
    },
    canEditField(field) {
      if (!this.isEditor || this.isProcessing || this.isPageLoading || this.tableLoadError || !this.columnVisibilityLoaded || this.columnVisibilityError || !this.isFieldShown(field) || ACTUAL_DATE_FIELDS.includes(field)) return false;
      if (field === 'projectId' && !this.isAdmin) return false;
      if (this.customFieldForGrid(field)) return this.projectFieldsLoaded && !this.projectFieldsError;
      return this.allColumnDefs().some(column => column.field === field);
    },
    async refreshProjectData() {
      if (this.isProcessing || this.isPageLoading) return;
      this.cancelInlineEdit();
      await this.fetchTable();
    },
    async fetchCustomFieldHistory(projectId) {
      this.isFetchingCustomFieldHistory = true;
      this.customFieldHistory = [];
      this.customFieldHistoryError = '';
      try {
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly/${encodeURIComponent(projectId)}/custom-fields/history`);
        const data = await this.readApiJson(response, 'Added-field history is unavailable.');
        if (!Array.isArray(data)) throw new Error('The server returned an invalid added-field history.');
        this.customFieldHistory = data;
      } catch (err) {
        this.customFieldHistoryError = err.message || 'Added-field history is unavailable.';
      } finally {
        this.isFetchingCustomFieldHistory = false;
      }
    },

    // -------------------------------------------------
    // DATA FETCHING
    // -------------------------------------------------
    async fetchTable({ manageLoading = true, selectedProjectId } = {}) {
      if (manageLoading) this.isPageLoading = true;
      this.tableLoadError = '';
      const selectedId = selectedProjectId ?? this.selectedRow?.projectId;
      try {
        const [projectsRes, targetsRes, velocityRes] = await Promise.all([
          this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly`),
          this.apiFetch(`${this.apiBaseUrl}/api/manager-site-targets`),
          this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly/pipeline-velocity`),
          this.fetchProjectFields(),
          this.fetchColumnVisibility()
        ]);
        const [data, targetsData, velocityData] = await Promise.all([
          this.readApiJson(projectsRes, 'Failed to fetch project data.'),
          this.readApiJson(targetsRes, 'Failed to fetch site targets.'),
          this.readApiJson(velocityRes, 'Failed to fetch pipeline velocity.')
        ]);
        if (![data, targetsData, velocityData].every(Array.isArray)) throw new Error('The server returned an invalid project data list.');
        this.rows = data.map(row => this.hydrateProjectRow(row));
        this.siteTargets = targetsData;
        this.velocityData = velocityData;
        this.selectedRow = selectedId == null ? null : this.rows.find(row => row.projectId === selectedId) || null;
        return true;
      } catch (err) {
        if (!err.isUnauthorized) this.tableLoadError = err.message || 'Failed to load project data. Use Refresh to retry.';
        return false;
      } finally {
        if (manageLoading) this.isPageLoading = false;
      }
    },

    // -------------------------------------------------
    // TOP BAR ACTIONS
    // -------------------------------------------------
    goHome() {
      this.$router.push('/landing');
    },
    goBack() {
      this.$router.push('/landing');
    },
    logout() {
      this.accessRight = '';
      localStorage.removeItem('token');
      localStorage.removeItem('access_right');
      this.$router.push('/login');
    },

    // -------------------------------------------------
    // COLUMN DEFINITIONS
    // -------------------------------------------------
    baseColumnDefs() {
      return [
        { label: 'Project Name', field: 'projectName', type: 'text', fixed: true, width: '180px', hidden: false },
        { label: 'Project ID', field: 'projectId', type: 'text', width: '120px', hidden: true },
        { label: 'Project Status', field: 'projectStatus', type: 'text', width: '130px', hidden: true },
        { label: 'Pillars', field: 'pillars', type: 'text', width: '150px', hidden: true },
        { label: 'Sites', field: 'sites', type: 'text', width: '150px', hidden: true },
        { label: 'PMO Gate', field: 'currentPmoGate', type: 'text', width: '120px', hidden: true },
        { label: 'DTIT Involved', field: 'dtitInvolved', type: 'text', width: '120px', hidden: true },
        { label: 'AI/AA/A Type', field: 'aiAaAType', type: 'text', width: '120px', hidden: true },
        { label: 'FOAK/NOAK', field: 'foakNoak', type: 'text', width: '120px', hidden: true }
      ];
    },

    yearColumnDefs() {
      return this.trackingYears.map(year => ({
        label: String(year),
        field: 'year' + year,
        type: 'number',
        formatType: 'currency',
        width: '120px',
        hidden: false
      }));
    },

    kpiColumnDefs() {
      return [
        { label: 'Comment', field: 'comment', type: 'text', width: '200px', hidden: false },
        { label: 'Capacity Gain Val', field: 'capacityGainValue', type: 'number', formatType: 'currency', width: '140px', hidden: false },
        { label: 'Capacity Gain %', field: 'capacityGainPercent', type: 'number', formatType: 'percent', width: '130px', hidden: false },
        { label: 'DL Value', field: 'dlValue', type: 'number', formatType: 'currency', width: '120px', hidden: false },
        { label: 'DL Equivalent', field: 'dlEquivalent', type: 'number', width: '120px', hidden: false },
        { label: 'IDL Value', field: 'idlValue', type: 'number', formatType: 'currency', width: '120px', hidden: false },
        { label: 'IDL FTE', field: 'idlFte', type: 'number', width: '100px', hidden: false },
        { label: 'Yield Value', field: 'yieldValue', type: 'number', formatType: 'currency', width: '120px', hidden: false },
        { label: 'Yield (%) Gain', field: 'yieldPercentGain', type: 'number', formatType: 'percent', width: '120px', hidden: false },
        { label: 'Quality Value', field: 'qualityValue', type: 'number', formatType: 'currency', width: '120px', hidden: false },
        { label: 'Quality Cases', field: 'qualityCases', type: 'number', width: '120px', hidden: false }
      ];
    },

    timelineColumnDefs() {
      return [
        { label: 'Target G1 Date', field: 'targetG1Date', type: 'text', formatType: 'date', width: '130px', hidden: true },
        { label: 'Actual G1 Date', field: 'actualG1Date', type: 'text', formatType: 'date', width: '130px', hidden: true },
        { label: 'Target G2 Date', field: 'targetG2Date', type: 'text', formatType: 'date', width: '130px', hidden: true },
        { label: 'Actual G2 Date', field: 'actualG2Date', type: 'text', formatType: 'date', width: '130px', hidden: true },
        { label: 'Target G3 Date', field: 'targetG3Date', type: 'text', formatType: 'date', width: '130px', hidden: true },
        { label: 'Actual G3 Date', field: 'actualG3Date', type: 'text', formatType: 'date', width: '130px', hidden: true },
        { label: 'Target Closed Date', field: 'targetClosedDate', type: 'text', formatType: 'date', width: '150px', hidden: true },
        { label: 'Actual Closed Date', field: 'actualClosedDate', type: 'text', formatType: 'date', width: '150px', hidden: true }
      ];
    },

    allColumnDefs() {
      return [
        ...this.baseColumnDefs(),
        ...this.yearColumnDefs(),
        ...this.kpiColumnDefs(),
        ...this.timelineColumnDefs(),
        ...this.customColumnDefs()
      ];
    },

    isColumnHidden(field, defaultHidden = false) {
      if (!this.isFieldShown(field)) return true;
      return Object.prototype.hasOwnProperty.call(this.hiddenColumns, field)
        ? this.hiddenColumns[field]
        : defaultHidden;
    },

    rebuildTableColumns() {
      this.tableColumns = this.allColumnDefs().map(col => ({
        ...col,
        hidden: this.isColumnHidden(col.field, col.hidden || false)
      }));
      this.tableViewVersion++;
    },

    // -------------------------------------------------
    // PRESET VIEWS
    // -------------------------------------------------
    setFinancialView() {
      const yearFields = this.trackingYears.map(y => `year${y}`);
      const financialFields = new Set([
        'projectName',
        ...yearFields,
        'comment',
        'capacityGainValue',
        'capacityGainPercent',
        'dlValue',
        'dlEquivalent',
        'idlValue',
        'idlFte',
        'yieldValue',
        'yieldPercentGain',
        'qualityValue',
        'qualityCases'
      ]);

      this.hiddenColumns = {};
      this.allColumnDefs().forEach(col => {
        this.hiddenColumns[col.field] = !financialFields.has(col.field);
      });

      this.rebuildTableColumns();
    },

    setTimelineView() {
      const timelineFields = new Set([
        'projectName',
        'projectStatus',
        'currentPmoGate',
        'targetG1Date',
        'actualG1Date',
        'targetG2Date',
        'actualG2Date',
        'targetG3Date',
        'actualG3Date',
        'targetClosedDate',
        'actualClosedDate'
      ]);

      this.hiddenColumns = {};
      this.allColumnDefs().forEach(col => {
        this.hiddenColumns[col.field] = !timelineFields.has(col.field);
      });

      this.rebuildTableColumns();
    },

    setGlobalView() {
      this.hiddenColumns = {};
      this.allColumnDefs().forEach(col => {
        this.hiddenColumns[col.field] = false;
      });

      this.rebuildTableColumns();
    },

    // -------------------------------------------------
    // TABLE SELECTION
    // -------------------------------------------------
    selectRow({ row }) {
      this.selectedRow = row;
    },
    rowClassFn(row) {
      return this.selectedRow && this.selectedRow.projectId === row.projectId ? 'selected-row' : '';
    },
    clearTableUI() {
      this.selectedRow = null;
      this.cancelInlineEdit();
    },

    // -------------------------------------------------
    // COLUMN VISIBILITY
    // -------------------------------------------------
    toggleColumnVisibility(col) {
      if (!this.isFieldShown(col.field) || col.field === 'projectName') return;
      this.hiddenColumns[col.field] = !this.isColumnHidden(col.field, col.hidden || false);
      this.rebuildTableColumns();
    },

    // -------------------------------------------------
    // FORMATTERS
    // -------------------------------------------------
    formatCurrency(value) {
      if (value === null || value === undefined || value === '') return '';
      return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    },
    formatPercent(value) {
      if (value === null || value === undefined || value === '') return '';
      return `${value}%`;
    },
    formatMillions(value) {
      if (!value) return '$0.00M';
      return '$' + (Number(value) / 1000000).toFixed(2) + 'M';
    },
    formatDate(val) {
      if (!val) return '-';
      
      const dateObj = new Date(val);
      // Fallback if the date is invalid
      if (isNaN(dateObj.getTime())) return String(val).slice(0, 10); 
      
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yyyy = dateObj.getFullYear();
      
      return `${mm}-${yyyy}`;
    },
    getRagClass(actual, target) {
      if (!actual || !target) return 'pending-cell';
      const actualDate = new Date(actual);
      const targetDate = new Date(target);
      return actualDate > targetDate ? 'rag-red' : 'rag-green';
    },

    // -------------------------------------------------
    // SEARCH / FILTERS
    // -------------------------------------------------
    clearFilters() {
      this.filters = { projectName: '', pillar: '', site: '' };
      this.selectedRow = null;
      this.cancelInlineEdit();
    },

    // -------------------------------------------------
    // AUDIT AND HISTORY METHODS
    // -------------------------------------------------
    
    // NEW: MANUAL SNAPSHOT METHOD
    async forceSnapshot() {
      if (!this.manualSnapshotMonth) return alert('Please select a target month first.');

      const confirmed = confirm(`WARNING: Are you sure you want to manually trigger and overwrite the KPI snapshot for ${this.manualSnapshotMonth}?\n\nThis will take the current live values of all projects and permanently stamp them to this month in the database.`);
      
      if (!confirmed) return;

      this.isProcessing = true;
      this.processingMessage = `Capturing full portfolio snapshot for ${this.manualSnapshotMonth}...`;

      try {
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/admin/force-snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snapshotMonth: this.manualSnapshotMonth })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to capture snapshot.');
        }

        this.successMessage = result.message || `Manual snapshot for ${this.manualSnapshotMonth} synchronized successfully!`;
        this.showSuccessDialog = true;
      } catch (err) {
        alert('Snapshot override failed: ' + err.message);
      } finally {
        this.isProcessing = false;
        this.processingMessage = '';
      }
    },

    async openHistoryModal() {
      if (!this.selectedRow || !this.selectedRow.projectId) {
        return alert('Please select a row first.');
      }

      this.showHistoryModal = true;
      this.isFetchingHistory = true;
      this.historyData = [];
      const historyProject = this.selectedRow;

      try {
        const [response] = await Promise.all([
          this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly/${encodeURIComponent(historyProject.projectId)}/history`),
          this.fetchCustomFieldHistory(historyProject.projectId)
        ]);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Backend Server returned ${response.status}`);
        }

        const historicalRecords = await response.json();
        if (!Array.isArray(historicalRecords)) throw new Error('The server returned an invalid project history.');

        const currentState = {
          history_id: 'current',
          project_id: historyProject.projectId,
          changed_at: 'Current Status',
          changed_by: 'Active Record',
          action_type: 'CURRENT',
          project_name: historyProject.projectName,
          project_status: historyProject.projectStatus,
          current_pmo_gate: historyProject.currentPmoGate,
          capacity_gain_value: historyProject.capacityGainValue,
          capacity_gain_pct: historyProject.capacityGainPercent,
          dl_value: historyProject.dlValue,
          dl_equivalent: historyProject.dlEquivalent,
          idl_value: historyProject.idlValue,
          idl_fte: historyProject.idlFte,
          yield_value: historyProject.yieldValue,
          yield_gain_pct: historyProject.yieldPercentGain,
          quality_value: historyProject.qualityValue,
          quality_cases: historyProject.qualityCases,
          comment_text: historyProject.comment
        };

        this.historyData = [currentState, ...historicalRecords];
      } catch (err) {
        alert('Error loading history: ' + err.message);
        this.showHistoryModal = false;
      } finally {
        this.isFetchingHistory = false;
      }
    },

    async openGlobalHistoryModal() {
      this.showGlobalHistoryModal = true;
      this.isFetchingGlobalHistory = true;
      this.globalHistoryData = [];

      try {
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly/history/all`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Backend Server returned ${response.status}`);
        }

        const historicalRecords = await response.json();
        const metricsWithHistory = new Set(historicalRecords.map(log => log.project_id));

        const currentRecords = this.rows
          .filter(row => metricsWithHistory.has(row.projectId))
          .map(row => ({
            history_id: `current_${row.projectId}`,
            changed_at: 'Current Status',
            changed_by: 'Active Record',
            action_type: 'CURRENT',
            project_id: row.projectId,
            project_name: row.projectName,
            project_status: row.projectStatus,
            current_pmo_gate: row.currentPmoGate,
            capacity_gain_value: row.capacityGainValue,
            capacity_gain_pct: row.capacityGainPercent,
            dl_value: row.dlValue,
            dl_equivalent: row.dlEquivalent,
            idl_value: row.idlValue,
            idl_fte: row.idlFte,
            yield_value: row.yieldValue,
            yield_gain_pct: row.yieldPercentGain,
            quality_value: row.qualityValue,
            quality_cases: row.qualityCases,
            comment_text: row.comment
          }));

        const combined = [...currentRecords, ...historicalRecords];
        combined.sort((a, b) => {
          if (a.project_id !== b.project_id) {
            return b.project_id.localeCompare(a.project_id);
          }
          if (a.action_type === 'CURRENT' && b.action_type !== 'CURRENT') return -1;
          if (b.action_type === 'CURRENT' && a.action_type !== 'CURRENT') return 1;
          return new Date(b.changed_at) - new Date(a.changed_at);
        });

        this.globalHistoryData = combined;
      } catch (err) {
        alert('Error loading global history: ' + err.message);
        this.showGlobalHistoryModal = false;
      } finally {
        this.isFetchingGlobalHistory = false;
      }
    },

    globalRowClassFn(row) {
      return row.action_type === 'CURRENT' ? 'current-row-global' : '';
    },

    async restoreHistoricalRecord(log) {
      if (!this.isEditor || this.isProcessing || log.action_type === 'CURRENT') return;

      const confirmed = confirm(`Are you sure you want to revert to the values from ${log.changed_at}?`);
      if (!confirmed) return;

      this.isProcessing = true;
      this.processingMessage = 'Restoring record...';

      try {
        // These snapshots contain only selected fields. Read the current row so
        // unsnapshotted master data is retained by the existing whole-row PUT.
        const liveResponse = await this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly`);
        const liveRows = await this.readApiJson(liveResponse, 'Could not load the current project before restoring.');
        if (!Array.isArray(liveRows)) throw new Error('The server returned an invalid project list.');
        const liveRow = liveRows.find(row => row.projectId === log.project_id);
        if (!liveRow) throw new Error('This project no longer exists.');
        const restoredFields = {
          projectName: log.project_name,
          projectStatus: log.project_status,
          currentPmoGate: log.current_pmo_gate,
          comment: log.comment_text || log.comments,
          capacityGainValue: log.capacity_gain_value,
          capacityGainPercent: log.capacity_gain_pct,
          dlValue: log.dl_value,
          dlEquivalent: log.dl_equivalent,
          idlValue: log.idl_value,
          idlFte: log.idl_fte,
          yieldValue: log.yield_value,
          yieldPercentGain: log.yield_gain_pct,
          qualityValue: log.quality_value,
          qualityCases: log.quality_cases
        };
        const payload = this.buildProjectPayload({ ...liveRow, ...restoredFields }, { includeCustomFields: false });
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly/${encodeURIComponent(log.project_id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to restore record.');
        }

        this.successMessage = 'Record successfully reverted!';
        this.showSuccessDialog = true;

        await this.fetchTable();

        if (this.showHistoryModal) {
          this.selectedRow = this.rows.find(r => r.projectId === log.project_id);
          await this.openHistoryModal();
        } else if (this.showGlobalHistoryModal) {
          await this.openGlobalHistoryModal();
        }
      } catch (err) {
        alert('Restore failed: ' + err.message);
      } finally {
        this.isProcessing = false;
        this.processingMessage = '';
      }
    },

    // -------------------------------------------------
    // INLINE EDITING
    // -------------------------------------------------
    startInlineEdit(row, field, currentValue) {
      if (!this.canEditField(field)) return;
      this.editingCell = { rowId: row.projectId, field };
      const custom = this.customFieldForGrid(field);
      if (custom) {
        this.editValue = this.customFieldFormValues(row.customFields)[custom.columnName];
      } else if (['targetG1Date', 'targetG2Date', 'targetG3Date', 'targetClosedDate'].includes(field)) {
        this.editValue = currentValue ? String(currentValue).slice(0, 10) : '';
      } else {
        this.editValue = currentValue;
      }
    },
    cancelInlineEdit() {
      this.editingCell = { rowId: null, field: null };
      this.editValue = null;
    },
    async saveInlineEdit(row) {
      const field = this.editingCell.field;
      if (!field || this.editingCell.rowId !== row.projectId || !this.canEditField(field)) return;
      const original = this.rows.find(item => item.projectId === row.projectId) || row;
      const custom = this.customFieldForGrid(field);
      let payload, method, newValue, nextProjectId = original.projectId;
      try {
        if (custom) {
          newValue = this.normalizeCustomField(custom, this.editValue);
          const oldValue = this.normalizeCustomField(custom, original.customFields?.[custom.columnName]);
          const unchanged = custom.type === 'number' && newValue != null && oldValue != null
            ? this.compareCustomDecimals(newValue, oldValue) === 0 : newValue === oldValue;
          if (unchanged) return this.cancelInlineEdit();
          payload = { customFields: { [custom.columnName]: newValue } };
          method = 'PATCH';
        } else {
          newValue = this.editValue;
          if (!MASTER_FIELDS.includes(field) && field !== 'comment') {
            newValue = newValue === '' || newValue == null ? null : Number(newValue);
            if (newValue !== null && !Number.isFinite(newValue)) throw new Error('Enter a finite number or Blank.');
          }
          const draft = { ...original, [field]: newValue };
          if (field === 'projectId') {
            nextProjectId = String(newValue || '').trim();
            if (!nextProjectId) throw new Error('Project ID cannot be empty.');
            draft.projectId = original.projectId;
          }
          payload = this.buildProjectPayload(draft, { includeCustomFields: false });
          if (field === 'projectId') payload.newProjectId = nextProjectId;
          method = 'PUT';
        }
      } catch (err) {
        alert(err.message);
        return;
      }
      this.isProcessing = true;
      this.processingMessage = `Updating ${custom ? custom.label : field}...`;
      this.cancelInlineEdit();
      try {
        const suffix = custom ? '/custom-fields' : '';
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly/${encodeURIComponent(original.projectId)}${suffix}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        await this.readApiJson(response, 'Failed to update the project.');
        if (custom) {
          const updated = this.hydrateProjectRow({ ...original, customFields: { ...original.customFields, [custom.columnName]: newValue } });
          this.rows = this.rows.map(item => item.projectId === original.projectId ? updated : item);
          if (this.selectedRow?.projectId === original.projectId) this.selectedRow = updated;
        } else {
          // Reload phase-derived dates and any values the server normalized.
          const refreshed = await this.fetchTable({ selectedProjectId: nextProjectId });
          if (!refreshed && !this.sessionEnded) alert('Update saved, but the project list could not be refreshed. Use Refresh Data & Columns.');
        }
      } catch (err) {
        if (!err.isUnauthorized) alert('Update failed: ' + err.message);
      } finally {
        this.isProcessing = false;
        this.processingMessage = '';
      }
    },

    // -------------------------------------------------
    // FORMS & MODALS
    // -------------------------------------------------
    emptyForm() {
      const form = {
        projectId: '',
        projectName: '',
        projectStatus: '',
        pillars: '',
        sites: '', 
        sitesArray: [],
        currentPmoGate: '',
        dtitInvolved: '',
        aiAaAType: '',
        foakNoak: '',
        comment: '',
        capacityGainValue: null,
        capacityGainPercent: null,
        dlValue: null,
        dlEquivalent: null,
        idlValue: null,
        idlFte: null,
        yieldValue: null,
        yieldPercentGain: null,
        qualityValue: null,
        qualityCases: null,
        targetG1Date: null,
        actualG1Date: null,
        targetG2Date: null,
        actualG2Date: null,
        targetG3Date: null,
        actualG3Date: null,
        targetClosedDate: null,
        actualClosedDate: null
      };
      form.customFields = this.customFieldFormValues();

      this.trackingYears.forEach(year => {
        form[`year${year}`] = null;
      });

      return form;
    },
    openAddForm() {
      if (!this.isEditor || this.isProcessing || this.isPageLoading || this.tableLoadError || !this.columnVisibilityLoaded || this.columnVisibilityError) return;
      this.cancelInlineEdit();
      this.formError = '';
      this.addProjectCreatedId = null;
      this.addForm = this.emptyForm();
      this.actualDateFormBaseline = this.actualDateFormValues(this.addForm);
      this.showAddForm = true;
      this.showUpdateForm = false;
    },
    openUpdateForm() {
      if (!this.isEditor || this.isProcessing || this.isPageLoading || this.tableLoadError || !this.columnVisibilityLoaded || this.columnVisibilityError) return;
      if (!this.selectedRow) return alert('Please select a row to update.');
      this.cancelInlineEdit();
      this.formError = '';
      this.updateForm = this.buildTimelineForm({ ...this.selectedRow }, false);
      
      this.updateForm.sitesArray = this.selectedRow.sites 
        ? String(this.selectedRow.sites).split(',').map(s => s.trim()) 
        : [];

      this.updateForm.targetG1Date = this.selectedRow.targetG1Date ? String(this.selectedRow.targetG1Date).slice(0, 10) : null;
      this.updateForm.actualG1Date = this.selectedRow.actualG1Date ? String(this.selectedRow.actualG1Date).slice(0, 10) : null;
      
      this.updateForm.targetG2Date = this.selectedRow.targetG2Date ? String(this.selectedRow.targetG2Date).slice(0, 10) : null;
      this.updateForm.actualG2Date = this.selectedRow.actualG2Date ? String(this.selectedRow.actualG2Date).slice(0, 10) : null;
      
      this.updateForm.targetG3Date = this.selectedRow.targetG3Date ? String(this.selectedRow.targetG3Date).slice(0, 10) : null;
      this.updateForm.actualG3Date = this.selectedRow.actualG3Date ? String(this.selectedRow.actualG3Date).slice(0, 10) : null;
      
      this.updateForm.targetClosedDate = this.selectedRow.targetClosedDate ? String(this.selectedRow.targetClosedDate).slice(0, 10) : null;
      this.updateForm.actualClosedDate = this.selectedRow.actualClosedDate ? String(this.selectedRow.actualClosedDate).slice(0, 10) : null;
      this.actualDateFormBaseline = this.actualDateFormValues(this.updateForm);

      this.showUpdateForm = true;
      this.showAddForm = false;
    },
    closeForm() {
      this.showAddForm = false;
      this.showUpdateForm = false;
      this.formError = '';
      this.addProjectCreatedId = null;
      this.actualDateFormBaseline = {};
    },
    async submitAddForm() {
      if (!this.isEditor || this.isProcessing || this.isPageLoading) return;
      this.formError = '';
      let payload;
      try {
        const sites = Array.isArray(this.addForm.sitesArray) ? this.addForm.sitesArray.join(', ') : '';
        payload = this.addActualDateChanges(this.buildProjectPayload({ ...this.addForm, sites }), this.addForm);
        if (this.addProjectCreatedId && payload.projectId !== this.addProjectCreatedId) throw new Error('Keep the ID of the project that has already been created.');
      } catch (err) { this.formError = err.message; return; }
      this.isProcessing = true;
      this.processingMessage = 'Creating Project Metadata...';
      try {
        let createdNow = false;
        if (!this.addProjectCreatedId) {
          const response = await this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
          });
          const result = await this.readApiJson(response, 'Failed to create project metadata.');
          this.addProjectCreatedId = result?.project_id || payload.projectId;
          this.actualDateFormBaseline = this.actualDateFormValues(this.addForm);
          createdNow = true;
        }
        this.processingMessage = 'Saving Financial Data & KPIs...';
        const updatePayload = { ...payload };
        // The first POST already saved custom fields. A retry may include edits.
        if (createdNow) {
          delete updatePayload.customFields;
          ACTUAL_DATE_FIELDS.forEach(field => delete updatePayload[field]);
        }
        const updateResponse = await this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly/${encodeURIComponent(this.addProjectCreatedId)}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatePayload)
        });
        await this.readApiJson(updateResponse, 'Project created, but financial data could not be saved.');
        const projectId = this.addProjectCreatedId;
        this.closeForm();
        await this.fetchTable({ selectedProjectId: projectId });
      } catch (err) {
        if (!err.isUnauthorized) {
          this.formError = this.addProjectCreatedId
            ? `Project ${this.addProjectCreatedId} already exists. ${err.message} Save again to finish its remaining values.`
            : err.message;
          if (this.addProjectCreatedId) await this.fetchTable();
        }
      } finally {
        this.isProcessing = false;
        this.processingMessage = '';
      }
    },
    async submitUpdateForm() {
      if (!this.isEditor || this.isProcessing || this.isPageLoading) return;
      this.formError = '';
      let payload;
      try {
        const sites = Array.isArray(this.updateForm.sitesArray) ? this.updateForm.sitesArray.join(', ') : '';
        payload = this.addActualDateChanges(this.buildProjectPayload({ ...this.updateForm, sites }), this.updateForm);
      } catch (err) { this.formError = err.message; return; }
      this.isProcessing = true;
      this.processingMessage = 'Updating Project Data...';
      try {
        const response = await this.apiFetch(
          `${this.apiBaseUrl}/api/manager-yearly/${encodeURIComponent(payload.projectId)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );
        await this.readApiJson(response, 'Failed to update project data.');
        this.closeForm();
        await this.fetchTable();
      } catch (err) {
        if (!err.isUnauthorized) this.formError = err.message;
      } finally {
        this.isProcessing = false;
        this.processingMessage = '';
      }
    }
  }
};
</script>

<style scoped>
/* Global Page Settings */
.table-gui-page {
  padding-bottom: 50px;
  font-family: Arial, sans-serif;
  background-color: #f4f6f9;
  min-height: 100vh;
}

/* Top Bar Styling */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #07254a;
  padding: 10px 20px;
  color: white;
}
.left {
  display: flex;
  align-items: center;
}
.logo {
  height: 40px;
  margin-right: 15px;
}
.title {
  font-size: 1.2rem;
  font-weight: 600;
}
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.home-btn,
.logout-btn,
.back-btn,
.export-pdf-btn {
  background: none;
  color: #fff;
  border: 2px solid #fff;
  font-size: 1.1rem;
  cursor: pointer;
  font-weight: 500;
  border-radius: 8px;
  padding: 8px 24px;
  transition: background 0.2s, color 0.2s, border 0.2s;
}
.home-btn:hover,
.logout-btn:hover,
.back-btn:hover,
.export-pdf-btn:hover {
  background: #ffd600;
  color: #07254a;
  border-color: #ffd600;
}

/* Tabs Architecture */
.tabs-container {
  display: flex;
  background: white;
  border-bottom: 2px solid #e0e6ed;
  padding: 0 20px;
}
.tab-btn {
  background: none;
  border: none;
  padding: 16px 24px;
  font-size: 1.05rem;
  font-weight: bold;
  color: #6c757d;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}
.tab-btn:hover {
  color: #07254a;
}
.tab-btn.active {
  color: #07254a;
  border-bottom-color: #ffd600;
}

/* Timeline Window */
.timeline-window-card {
  margin: 16px 20px;
  background: white;
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e0e6ed;
}
.timeline-window-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}
.timeline-window-title {
  margin: 0;
  color: #07254a;
  font-size: 1.05rem;
}
.timeline-window-help {
  margin: 4px 0 0;
  color: #6c757d;
  font-size: 0.9rem;
}
.timeline-window-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  color: #07254a;
}
.timeline-window-controls {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 16px;
  margin-top: 16px;
  align-items: end;
}
.timeline-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.timeline-control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.timeline-control-row label {
  font-weight: 700;
  color: #07254a;
  font-size: 0.9rem;
}
.timeline-control-row input[type='number'] {
  width: 120px;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 0.95rem;
}
.timeline-control input[type='range'] {
  width: 100%;
  accent-color: #1f5fa8;
}
.timeline-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.timeline-shortcut-btn {
  background: #f8f9fb;
  color: #1f5fa8;
  border: 1px solid #c2d5ee;
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.timeline-shortcut-btn:hover {
  background: #e7edf5;
}
.timeline-window-footer {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  color: #6c757d;
  font-size: 0.9rem;
}
.year-chip {
  background: #e7edf5;
  color: #1f5fa8;
  padding: 4px 8px;
  border-radius: 999px;
  font-weight: 600;
}

/* Analytics & Timeline Shared Classes */
.analytics-section {
  padding: 16px 20px;
}
.analytics-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.analytics-shared-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e0e6ed;
  margin-bottom: 4px;
  flex-wrap: wrap;
  gap: 16px;
}
.section-title {
  margin: 0;
  color: #07254a;
  font-size: 1.15rem;
}

.global-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* Label above the executive cards */
.cards-year-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Timeline Specific Styles */
.timeline-select {
  padding: 8px 16px;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  font-size: 0.9rem;
  background-color: #fff;
  color: #333;
  font-weight: 600;
  outline: none;
  cursor: pointer;
}
.timeline-select:hover {
  border-color: #1f5fa8;
}
.gantt-scroll-container {
  max-height: 550px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
}
.pending-cell {
  color: #999;
  font-size: 0.85em;
  font-style: italic;
}
.rag-red {
  color: #d93025 !important;
}
.rag-green {
  color: #037d50 !important;
}

/* Executive Cards CSS */
.executive-cards-section {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}
.metric-card {
  padding: 16px;
  border-radius: 8px;
  color: white;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: transform 0.2s ease;
}
.metric-card:hover {
  transform: translateY(-3px);
}
.metric-card h4 {
  margin: 0 0 8px 0;
  font-size: 1.05rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.95;
}
.metric-content {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.metric-value {
  font-size: 1.6rem;
  font-weight: 800;
}
.metric-divider {
  font-size: 1.4rem;
  opacity: 0.7;
}
.metric-count {
  font-size: 1rem;
  font-weight: 500;
  opacity: 0.95;
}

.bg-overall { background: linear-gradient(135deg, #1E3A8A, #2563EB); }
.bg-g1 { background: linear-gradient(135deg, #0A2D55, #124076); } 
.bg-g2 { background: linear-gradient(135deg, #4A235A, #6C3483); } 
.bg-g3 { background: linear-gradient(135deg, #312E81, #4F46E5); }
.bg-operationalised { background: linear-gradient(135deg, #065F46, #059669); }

/* Summary Tables CSS */
.summary-tables-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.table-responsive {
  overflow-x: auto;
}
.summary-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 4px;
}
.summary-table th, .summary-table td {
  padding: 10px 14px;
  border-bottom: 1px solid #e0e6ed;
  font-size: 0.95rem;
}
.summary-table th {
  background-color: #f8f9fb;
  color: #07254a;
  font-weight: bold;
  text-align: left;
}
.summary-table tr:hover {
  background-color: #f0f4f8;
}

.sidebar-title {
  font-weight: 700;
  color: #07254a;
  font-size: 0.95rem;
}

.site-btn {
  padding: 8px 16px;
  background-color: white;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  color: #6c757d;
  text-align: center;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.site-btn:hover {
  border-color: #1f5fa8;
  color: #1f5fa8;
  background-color: #f0f4f8;
}
.site-btn.active {
  background-color: #1f5fa8;
  color: white;
  border-color: #1f5fa8;
  box-shadow: 0 4px 8px rgba(31, 95, 168, 0.2);
}

.trend-charts-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

/* Pie Charts CSS */
.piecharts-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.chart-card {
  background: white;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e0e6ed;
}
.chart-header {
  border-bottom: 2px solid #eee;
  padding-bottom: 8px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chart-title {
  margin: 0;
  color: #07254a;
  font-size: 1rem;
}

/* Layout Elements */
.grid-section {
  padding-top: 10px;
}
.table-section {
  padding: 0 20px;
}
.audit-panel {
  margin: 16px 20px;
  padding: 16px;
  border: 1px solid #d9d9d9;
  border-radius: 10px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.audit-panel h4 {
  margin-top: 0;
  margin-bottom: 12px;
  color: #1f3b64;
}
.audit-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(200px, 1fr));
  gap: 10px 20px;
  font-size: 0.95rem;
}

/* Inline Filters Bar */
.filters-bar {
  display: flex;
  gap: 20px;
  margin: 0 20px 16px 20px;
  background: white;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e0e6ed;
  align-items: flex-end;
  flex-wrap: wrap;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 220px;
}
.filter-group label {
  font-size: 0.85rem;
  font-weight: bold;
  color: #07254a;
}
.filter-group select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: #fff;
  color: #333;
}

/* Custom Searchable Dropdown Styling */
.custom-dropdown-wrapper {
  position: relative;
}

.filter-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: #fff;
  box-sizing: border-box;
}

.custom-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1050;
  background: #ffffff;
  border: 1px solid #c2d5ee;
  border-radius: 0 0 6px 6px;
  max-height: 220px;
  overflow-y: auto;
  margin: 2px 0 0 0;
  padding: 0;
  list-style: none;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
}

.custom-dropdown-menu li {
  padding: 8px 12px;
  font-size: 0.9rem;
  color: #333;
  cursor: pointer;
  border-bottom: 1px solid #f0f4f8;
  transition: background-color 0.15s, color 0.15s;
}

.custom-dropdown-menu li:last-child {
  border-bottom: none;
}

.custom-dropdown-menu li:hover {
  background-color: #e7edf5;
  color: #1f5fa8;
  font-weight: 600;
}

/* Buttons inside the Tab */
.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.actions button {
  padding: 10px 20px;
  border-radius: 4px;
  border: none;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
  color: #07254a;
}
.actions button:hover {
  opacity: 0.9;
}
.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.primary-btn {
  background-color: #ffd600 !important;
}
.formButton {
  background-color: #28a745 !important;
  color: white !important;
}
.cancel {
  background-color: #6c757d !important;
  color: white !important;
}
.view-btn {
  background-color: #17a2b8 !important;
  color: white !important;
}
.divider {
  width: 2px;
  height: 30px;
  background-color: #ccc;
  margin: 0 8px;
}

/* Modals */
.project-data-error,
.project-fields-notice {
  padding: 12px 16px;
  margin: 12px 0;
  border: 1px solid;
  border-radius: 6px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.project-data-error {
  color: #842029;
  background: #fff1f2;
  border-color: #f1b8bd;
}
.project-fields-notice {
  color: #664d03;
  background: #fff8e1;
  border-color: #e9d58d;
}
.project-field-help {
  display: block;
  color: #5b6776;
  margin: 6px 0;
  line-height: 1.4;
  font-size: 0.85rem;
}
.editable-cell.readonly-cell,
.editable-cell.readonly-cell:hover {
  cursor: default;
  background: transparent;
}
.milestone-actual-value {
  padding: 8px;
  color: #1f5fa8;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.large-modal {
  max-width: 1000px;
}
.x-large-modal {
  width: 98%;
  max-width: 1600px;
}
.modal h3 {
  margin-top: 0;
  color: #07254a;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
}
.section-heading {
  margin-top: 24px;
  margin-bottom: 16px;
  color: #1f3b64;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
  font-size: 1.1rem;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(250px, 1fr));
  gap: 16px;
}
.full-width {
  grid-column: 1 / -1;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: #1f3b64;
  font-size: 0.9rem;
}
.form-group input,
.form-group select {
  width: 100%;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
}
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f8f9fb;
}
.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  color: #333;
  margin-bottom: 0;
  cursor: pointer;
}
.checkbox-group input {
  width: auto;
  cursor: pointer;
}
.form-group input:disabled,
.form-group select:disabled {
  background-color: #f1f3f5;
  color: #6c757d;
  cursor: not-allowed;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  border-top: 2px solid #eee;
  padding-top: 16px;
}

/* History Table CSS */
.history-table-container {
  max-height: 400px;
  overflow-y: auto;
  overflow-x: auto;
  margin-top: 16px;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
}
.history-table {
  width: 100%;
  border-collapse: collapse;
}
.history-table th,
.history-table td {
  border-bottom: 1px solid #e0e6ed;
  padding: 10px 14px;
  text-align: left;
  font-size: 0.95rem;
  white-space: nowrap;
}
.history-table th {
  background-color: #f8f9fb;
  color: #07254a;
  font-weight: 600;
  position: sticky;
  top: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.badge {
  background-color: #e7edf5;
  color: #1f5fa8;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: bold;
}
.current-row {
  background-color: #f0fdf4;
}
.current-row td {
  border-bottom: 2px solid #28a745;
}
:deep(.current-row-global) {
  background-color: #f0fdf4 !important;
}
:deep(.current-row-global td) {
  border-bottom: 2px solid #28a745 !important;
  border-top: 4px solid #c2c9d1 !important;
}
.badge-current {
  background-color: #28a745;
  color: white;
}
.restore-btn {
  background-color: #f8f9fb;
  color: #1f5fa8;
  border: 1px solid #1f5fa8;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}
.restore-btn:hover {
  background-color: #1f5fa8;
  color: #fff;
}
.confirmationmessage {
  background: #fff;
  padding: 24px 32px;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
  min-width: 380px;
  text-align: center;
}

/* Column Manager Specifics */
.column-manager-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 16px;
  margin-bottom: 24px;
}
.column-toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  cursor: pointer;
  color: #333;
}
.column-toggle-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.column-toggle-label input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Table Elements */
.horizontal-scroll-wrapper {
  overflow-x: auto;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* ========================================================== */
/* NEW: CSS for expanding Inline Editable Cells completely    */
/* ========================================================== */

.inline-edit-hint {
  background-color: #e7edf5;
  color: #1f5fa8;
  padding: 10px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 0.95rem;
  border: 1px solid #c2d5ee;
}

.editable-cell {
  cursor: pointer;
  border: 1px dashed transparent;
  border-radius: 4px;
  transition: all 0.2s ease-in-out;
  display: flex;            /* Makes the hit box block-level */
  align-items: center;      /* Keeps the text vertically centered */
  width: 100%;              /* Forces the hit box to stretch */
  min-width: 50px;
  min-height: 30px;         /* Expands the physical clickable height */
  padding: 2px 6px;         /* Adds a comfortable padding inside the box */
  box-sizing: border-box;
}

.editable-cell:hover {
  border-color: #1f5fa8;
  background-color: #f0f4f8;
}

.inline-input {
  display: block;
  width: 100% !important;   /* Forces the input to overwrite everything and stretch */
  min-height: 32px;
  padding: 6px 8px;         /* Thicker padding for a better input experience */
  border: 2px solid #1f5fa8; /* Visually pops when active */
  border-radius: 4px;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  box-sizing: border-box;
  background-color: #fff;
  box-shadow: 0 0 5px rgba(31, 95, 168, 0.2);
}

/* Vue Good Table Overrides */
:deep(.vgt-table th) {
  white-space: nowrap;
  font-size: 0.85rem;
  background-color: #f8f9fb;
}
:deep(.vgt-table td) {
  white-space: nowrap;
  font-size: 0.9rem;
}
:deep(.selected-row) {
  background-color: #e0eaff !important;
}

/* Loaders */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.loading-box {
  text-align: center;
  background: #fff;
  padding: 24px 32px;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
  min-width: 380px;
}
.spinner {
  width: 42px;
  height: 42px;
  border: 4px solid #ddd;
  border-top: 4px solid #1f5fa8;
  border-radius: 50%;
  margin: 0 auto 12px;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.loading-subtext {
  margin-top: 8px;
  color: #6c757d;
  font-size: 0.9rem;
}
.loading-bar-wrapper {
  margin-top: 14px;
  width: 100%;
  height: 6px;
  background: #e9ecef;
  border-radius: 999px;
  overflow: hidden;
}
.loading-bar-indeterminate {
  width: 35%;
  height: 100%;
  background: linear-gradient(90deg, #1f5fa8, #ffd600);
  animation: slidebar 1.1s infinite ease-in-out;
}
@keyframes slidebar {
  0% {
    transform: translateX(-120%);
  }
  50% {
    transform: translateX(80%);
  }
  100% {
    transform: translateX(260%);
  }
}

/* Responsive Enhancements */
@media (max-width: 1400px) {
  .executive-cards-section {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .piecharts-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1100px) {
  .executive-cards-section {
    grid-template-columns: repeat(2, 1fr);
  }
  .trend-charts-section {
    grid-template-columns: 1fr;
  }
  .summary-tables-section {
    grid-template-columns: 1fr;
  }
  .timeline-window-controls {
    grid-template-columns: 1fr;
  }
  .audit-grid {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 700px) {
  .executive-cards-section {
    grid-template-columns: 1fr;
  }
  .piecharts-section {
    grid-template-columns: 1fr;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .column-manager-grid {
    grid-template-columns: 1fr;
  }
  .audit-grid {
    grid-template-columns: 1fr;
  }
  .timeline-control-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .timeline-control-row input[type='number'] {
    width: 100%;
  }
}
</style>
