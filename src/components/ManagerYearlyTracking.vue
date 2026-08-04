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
        <button class="spotfire-btn" @click="openSpotfire" :disabled="isProcessing || isPageLoading">Spotfire</button>
        <button class="logout-btn" @click="logout" :disabled="isProcessing || isPageLoading">Logout</button>
      </div>
    </header>

    <!-- NAVIGATION TABS -->
    <div class="tabs-container">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'grid' }"
        @click="activeTab = 'grid'"
      >
        Data Entry Grid
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'analytics' }"
        @click="activeTab = 'analytics'"
      >
        Analytics
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

      <!-- INLINE FILTERS BAR -->
      <div class="filters-bar">
        <div class="filter-group">
          <label>Filter by Project Name:</label>
          <select v-model="filters.projectName">
            <option value="">-- All Projects --</option>
            <option v-for="name in uniqueProjectNames" :key="name" :value="name">{{ name }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Filter by Pillar:</label>
          <select v-model="filters.pillar">
            <option value="">-- All Pillars --</option>
            <option v-for="pillar in uniquePillars" :key="pillar" :value="pillar">{{ pillar }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Filter by Site:</label>
          <select v-model="filters.site">
            <option value="">-- All Sites --</option>
            <option v-for="site in uniqueSites" :key="site" :value="site">{{ site }}</option>
          </select>
        </div>

        <button class="actions cancel" style="margin-top: 0; margin-bottom: 2px;" @click="clearFilters">
          Clear Filters
        </button>
      </div>

      <div class="table-section">
        <div class="inline-edit-hint">
          💡 <strong>Tip:</strong> Double-click any cell below to input or update its value directly. Use the preset view buttons below to quickly show or hide metadata.
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
              <span v-if="props.column.field === 'projectName'">
                <strong>{{ props.row.projectName }}</strong>
              </span>

              <span v-else>
                <!-- Editing Mode -->
                <span v-if="editingCell.rowId === props.row.projectId && editingCell.field === props.column.field">
                  <input
                    v-if="props.column.type === 'text'"
                    type="text"
                    v-model="editValue"
                    @blur="saveInlineEdit(props.row)"
                    @keyup.enter="saveInlineEdit(props.row)"
                    @keyup.esc="cancelInlineEdit"
                    v-focus
                    class="inline-input"
                    style="width: 100%; min-width: 150px;"
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
                    style="width: 100%; min-width: 80px;"
                  />
                </span>

                <!-- Viewing Mode -->
                <span
                  v-else
                  @dblclick.stop="startInlineEdit(props.row, props.column.field, props.row[props.column.field])"
                  class="editable-cell"
                  title="Double-click to edit"
                >
                  <template v-if="props.column.formatType === 'currency'">
                    {{ formatCurrency(props.row[props.column.field]) }}
                  </template>
                  <template v-else-if="props.column.formatType === 'percent'">
                    {{ formatPercent(props.row[props.column.field]) }}
                  </template>
                  <template v-else>
                    {{ props.row[props.column.field] ?? '-' }}
                  </template>
                </span>
              </span>
            </template>

            <template #emptystate>
              <div class="no-data-message">No project data available. Click 'Add' to begin.</div>
            </template>
          </vue-good-table>
        </div>
      </div>

      <!-- ACTION BUTTONS -->
      <div class="actions">
        <button class="primary-btn" @click="openAddForm" :disabled="isProcessing || isPageLoading">Add</button>
        <button class="primary-btn" @click="openUpdateForm" :disabled="isProcessing || isPageLoading || !selectedRow">
          Update
        </button>

        <div class="divider"></div>
        <button class="view-btn" @click="openHistoryModal" :disabled="isProcessing || isPageLoading || !selectedRow">
          View History
        </button>
        <button class="view-btn" v-if="isAdmin" @click="openGlobalHistoryModal" :disabled="isProcessing || isPageLoading">
          Global Audit Log
        </button>

        <div class="divider"></div>
        <button @click="setFinancialView" :disabled="isProcessing || isPageLoading" class="view-btn">
          Financial View
        </button>
        <button @click="setGlobalView" :disabled="isProcessing || isPageLoading" class="view-btn">
          Global View
        </button>
        <button @click="showColumnManager = true" :disabled="isProcessing || isPageLoading" class="view-btn">
          Custom Columns
        </button>

        <div class="divider"></div>
        <button @click="clearTableUI" :disabled="isProcessing || isPageLoading">Clear Selection</button>
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
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TAB 2: ANALYTICS                           -->
    <!-- ========================================== -->
    <div v-if="activeTab === 'analytics'" class="analytics-section">
      <div v-if="rows.length > 0" class="analytics-layout">
        
        <!-- HEADER (UNFILTERED) -->
        <div style="margin-bottom: 8px;">
          <h2 class="section-title">Executive Performance Overview</h2>
        </div>

        <!-- NEW: EXECUTIVE CARDS SECTION -->
        <div class="executive-cards-section">
          <div class="metric-card bg-overall">
            <h4>Overall</h4>
            <div class="metric-content">
              <span class="metric-value">{{ formatMillions(executiveCardsData.Overall.value) }}</span>
              <span class="metric-divider">|</span>
              <span class="metric-count">{{ executiveCardsData.Overall.count }} Projects</span>
            </div>
          </div>
          <div class="metric-card bg-g1">
            <h4>G1</h4>
            <div class="metric-content">
              <span class="metric-value">{{ formatMillions(executiveCardsData.G1.value) }}</span>
              <span class="metric-divider">|</span>
              <span class="metric-count">{{ executiveCardsData.G1.count }} Projects</span>
            </div>
          </div>
          <div class="metric-card bg-g2">
            <h4>G2</h4>
            <div class="metric-content">
              <span class="metric-value">{{ formatMillions(executiveCardsData.G2.value) }}</span>
              <span class="metric-divider">|</span>
              <span class="metric-count">{{ executiveCardsData.G2.count }} Projects</span>
            </div>
          </div>
          <div class="metric-card bg-g3">
            <h4>G3</h4>
            <div class="metric-content">
              <span class="metric-value">{{ formatMillions(executiveCardsData.G3.value) }}</span>
              <span class="metric-divider">|</span>
              <span class="metric-count">{{ executiveCardsData.G3.count }} Projects</span>
            </div>
          </div>
        </div>

        <!-- SUMMARY TABLES SECTION (Side-by-Side) -->
        <div class="summary-tables-section">
          <!-- TABLE 1: Pillar Summary -->
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Value by Pillar</h3>
            </div>
            <div class="table-responsive">
              <table class="summary-table">
                <thead>
                  <tr>
                    <th>Pillar</th>
                    <th style="text-align: center;">Count</th>
                    <th style="text-align: right;">Value</th>
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
            <div class="chart-header">
              <h3 class="chart-title">Yearly Summary ({{ currentYear }} - {{ currentYear + 2 }})</h3>
            </div>
            <div class="table-responsive">
              <table class="summary-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th style="text-align: right;">Actual</th>
                    <th style="text-align: right;">Target</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in yearlySummaryData" :key="item.year">
                    <td><strong>{{ item.year }}</strong></td>
                    <td style="text-align: right;">{{ formatMillions(item.actual) }}</td>
                    <td style="text-align: right; color: #d93025;">{{ formatMillions(item.target) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- FILTER BAR FOR LINE CHARTS ONLY -->
        <div class="analytics-shared-header" style="margin-top: 10px;">
          <h2 class="section-title" style="font-size: 1.1rem;">Site-Level Variance & Tracking</h2>
          <div class="chart-controls">
            <label style="font-weight: bold; color: #07254a;">Filter Site for Trends:</label>
            <select v-model="siteTrendConfig.selectedSite" class="control-select">
              <option value="ALL">All Sites (Combined)</option>
              <option v-for="site in analyticsSiteOptions" :key="site" :value="site">
                {{ site }}
              </option>
            </select>
          </div>
        </div>

        <!-- TREND CHARTS GRID (Side-by-Side) -->
        <div class="trend-charts-section">
          <!-- CHART 1: Actual vs Expected -->
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Actual vs Expected Value</h3>
            </div>
            <div class="chart-body">
              <apexchart
                type="line"
                height="360"
                :options="siteTrendOptions"
                :series="siteTrendSeries"
              ></apexchart>
            </div>
          </div>

          <!-- CHART 2: Variance vs Expected -->
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Variance vs Expected Value</h3>
            </div>
            <div class="chart-body">
              <apexchart
                type="line"
                height="360"
                :options="varianceTrendOptions"
                :series="varianceTrendSeries"
              ></apexchart>
            </div>
          </div>
        </div>

        <!-- 4 PIE CHARTS -->
        <div class="piecharts-section">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">DTIT Involved</h3>
            </div>
            <div class="chart-body">
              <apexchart
                type="pie"
                height="350"
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
                height="350"
                :options="foakPieOptions"
                :series="foakPieSeries"
              ></apexchart>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Pillars</h3>
            </div>
            <div class="chart-body">
              <apexchart
                type="pie"
                height="350"
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
                height="350"
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
              <input id="projectId" type="text" v-model="activeForm.projectId" :disabled="showUpdateForm || isProcessing" required />
            </div>

            <div class="form-group">
              <label for="projectName">Project Name <span style="color:red">*</span></label>
              <input id="projectName" type="text" v-model="activeForm.projectName" :disabled="isProcessing" required />
            </div>

            <div class="form-group">
              <label for="projectStatus">Project Status</label>
              <select id="projectStatus" v-model="activeForm.projectStatus" :disabled="isProcessing">
                <option value="">(Blank)</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Closed">Closed</option>
                <option value="G1">G1</option>
                <option value="G2">G2</option>
                <option value="G3">G3</option>
              </select>
            </div>

            <div class="form-group">
              <label for="pillars">Pillars</label>
              <select id="pillars" v-model="activeForm.pillars" :disabled="isProcessing">
                <option value="">(Blank)</option>
                <option value="Process & Equipment Intelligence">Process & Equipment Intelligence</option>
                <option value="Smart Decision Hub">Smart Decision Hub</option>
                <option value="Vision Intelligence">Vision Intelligence</option>
              </select>
            </div>

            <div class="form-group">
              <label for="sites">Sites</label>
              <select id="sites" v-model="activeForm.sites" :disabled="isProcessing">
                <option value="">(Blank)</option>
                <option value="ALL">ALL</option>
                <option value="BSK">BSK</option>
                <option value="KIR">KIR</option>
                <option value="MUA">MUA</option>
                <option value="STS">STS</option>
              </select>
            </div>

            <div class="form-group">
              <label for="currentPmoGate">Current PMO Gate</label>
              <input id="currentPmoGate" type="text" v-model="activeForm.currentPmoGate" :disabled="isProcessing" />
            </div>

            <div class="form-group">
              <label for="dtitInvolved">DTIT Involved</label>
              <select id="dtitInvolved" v-model="activeForm.dtitInvolved" :disabled="isProcessing">
                <option value="">(Blank)</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div class="form-group">
              <label for="aiAaAType">AI/AA/A type</label>
              <select id="aiAaAType" v-model="activeForm.aiAaAType" :disabled="isProcessing">
                <option value="">(Blank)</option>
                <option value="AI">AI</option>
                <option value="AA">AA</option>
                <option value="A">A</option>
              </select>
            </div>

            <div class="form-group">
              <label for="foakNoak">FOAK/NOAK</label>
              <select id="foakNoak" v-model="activeForm.foakNoak" :disabled="isProcessing">
                <option value="">(Blank)</option>
                <option value="FOAK">FOAK</option>
                <option value="NOAK">NOAK</option>
              </select>
            </div>
          </div>

          <!-- SECTION 2: YEARLY DATA -->
          <h4 class="section-heading">2. Yearly Data (Values)</h4>
          <div class="form-grid">
            <div class="form-group" v-for="year in trackingYears" :key="year">
              <label :for="'year' + year">{{ year }}</label>
              <input
                :id="'year' + year"
                type="number"
                step="any"
                v-model="activeForm['year' + year]"
                :disabled="isProcessing"
              />
            </div>
          </div>

          <!-- SECTION 3: KPIs -->
          <h4 class="section-heading">3. Key Performance Indicators</h4>
          <div class="form-grid">
            <div class="form-group full-width">
              <label for="comment">Comment</label>
              <input id="comment" type="text" v-model="activeForm.comment" :disabled="isProcessing" />
            </div>

            <div class="form-group">
              <label for="capacityGainValue">Capacity Gain Value</label>
              <input id="capacityGainValue" type="number" step="any" v-model="activeForm.capacityGainValue" :disabled="isProcessing" />
            </div>

            <div class="form-group">
              <label for="capacityGainPercent">Capacity Gain %</label>
              <input id="capacityGainPercent" type="number" step="any" v-model="activeForm.capacityGainPercent" :disabled="isProcessing" />
            </div>

            <div class="form-group">
              <label for="dlValue">DL Value</label>
              <input id="dlValue" type="number" step="any" v-model="activeForm.dlValue" :disabled="isProcessing" />
            </div>

            <div class="form-group">
              <label for="dlEquivalent">DL Equivalent</label>
              <input id="dlEquivalent" type="number" step="any" v-model="activeForm.dlEquivalent" :disabled="isProcessing" />
            </div>

            <div class="form-group">
              <label for="idlValue">IDL Value</label>
              <input id="idlValue" type="number" step="any" v-model="activeForm.idlValue" :disabled="isProcessing" />
            </div>

            <div class="form-group">
              <label for="idlFte">IDL FTE</label>
              <input id="idlFte" type="number" step="any" v-model="activeForm.idlFte" :disabled="isProcessing" />
            </div>

            <div class="form-group">
              <label for="yieldValue">Yield Value</label>
              <input id="yieldValue" type="number" step="any" v-model="activeForm.yieldValue" :disabled="isProcessing" />
            </div>

            <div class="form-group">
              <label for="yieldPercentGain">Yield (%) Gain</label>
              <input id="yieldPercentGain" type="number" step="any" v-model="activeForm.yieldPercentGain" :disabled="isProcessing" />
            </div>

            <div class="form-group">
              <label for="qualityValue">Quality Value</label>
              <input id="qualityValue" type="number" step="any" v-model="activeForm.qualityValue" :disabled="isProcessing" />
            </div>

            <div class="form-group">
              <label for="qualityCases">Quality Cases</label>
              <input id="qualityCases" type="number" step="any" v-model="activeForm.qualityCases" :disabled="isProcessing" />
            </div>
          </div>

          <div class="modal-actions">
            <button type="submit" class="actions primary-btn" :disabled="isProcessing">
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
                    <button
                      v-if="log.action_type !== 'CURRENT'"
                      class="restore-btn"
                      @click="restoreHistoricalRecord(log)"
                      title="Revert live record to this version"
                    >
                      Restore
                    </button>
                  </div>
                </td>
                <td>{{ log.project_status || '-' }}</td>
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
                  <button
                    v-if="props.row.action_type !== 'CURRENT'"
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
              :disabled="col.field === 'projectName'"
            />
            {{ col.label }}
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
    const currentYear = new Date().getFullYear();

    return {
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

      // Analytics site chart filter (Applies specifically to Line Charts)
      siteTrendConfig: {
        selectedSite: 'ALL'
      },

      // Global Page State
      activeTab: 'grid',
      isProcessing: false,
      isPageLoading: false,
      processingMessage: '',
      showSuccessDialog: false,
      successMessage: '',

      // UI State
      showAddForm: false,
      showUpdateForm: false,
      showColumnManager: false,

      // History UI State
      showHistoryModal: false,
      historyData: [],
      isFetchingHistory: false,

      showGlobalHistoryModal: false,
      globalHistoryData: [],
      isFetchingGlobalHistory: false,

      // Data State
      rows: [],
      selectedRow: null,

      // Columns / Table refresh control
      tableColumns: [],
      hiddenColumns: {},
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

      // Static chart colors
      pieColors: ['#1f5fa8', '#28a745', '#ffd600', '#d93025', '#17a2b8', '#6c757d', '#6f42c1', '#fd7e14']
    };
  },
  computed: {
    isAdmin() {
      return localStorage.getItem('access_right') === 'admin';
    },

    activeForm() {
      return this.showAddForm ? this.addForm : this.updateForm;
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

    globalHistoryColumns() {
      return [
        { label: 'Date Changed', field: 'changed_at', width: '160px' },
        { label: 'Changed By', field: 'changed_by', width: '120px' },
        { label: 'Action', field: 'action_type', width: '120px' },
        { label: 'Project ID', field: 'project_id', width: '100px' },
        { label: 'Project Name', field: 'project_name', width: '150px' },
        { label: 'Proj. Status', field: 'project_status', width: '110px' },
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
    uniquePillars() {
      return [...new Set(this.rows.map(r => r.pillars).filter(Boolean))].sort();
    },
    uniqueSites() {
      return [...new Set(this.rows.map(r => r.sites).filter(Boolean))].sort();
    },
    filteredRows() {
      return this.rows.filter(row => {
        const matchName = !this.filters.projectName || row.projectName === this.filters.projectName;
        const matchPillar = !this.filters.pillar || row.pillars === this.filters.pillar;
        const matchSite = !this.filters.site || row.sites === this.filters.site;
        return matchName && matchPillar && matchSite;
      });
    },

    // ==========================================
    // EXECUTIVE CARDS DATA (Unfiltered by Site)
    // ==========================================
    executiveCardsData() {
      const result = {
        Overall: { count: 0, value: 0 },
        G1: { count: 0, value: 0 },
        G2: { count: 0, value: 0 },
        G3: { count: 0, value: 0 }
      };

      this.rows.forEach(row => {
        // Calculate the project's value over the selected tracking timeline
        let projectValue = 0;
        this.trackingYears.forEach(year => {
          projectValue += Number(row[`year${year}`]) || 0;
        });

        // 1. Add to Overall metrics
        result.Overall.count += 1;
        result.Overall.value += projectValue;

        // 2. Add to specific Gates based on project status
        const status = String(row.projectStatus || '').trim().toUpperCase();
        if (status === 'G1') {
          result.G1.count += 1;
          result.G1.value += projectValue;
        } else if (status === 'G2') {
          result.G2.count += 1;
          result.G2.value += projectValue;
        } else if (status === 'G3') {
          result.G3.count += 1;
          result.G3.value += projectValue;
        }
      });

      return result;
    },

    // ==========================================
    // TREND CHARTS LOGIC (Filtered by Site)
    // ==========================================
    analyticsSiteOptions() {
      return [...new Set(this.rows.map(r => r.sites).filter(Boolean))].sort();
    },
    filteredSiteTrendRows() {
      if (this.siteTrendConfig.selectedSite === 'ALL') {
        return this.rows;
      }
      return this.rows.filter(r => r.sites === this.siteTrendConfig.selectedSite);
    },
    siteTrendData() {
      // Standardize x-axis to strings of the Year
      const labels = this.trackingYears.map(String);
      const rows = this.filteredSiteTrendRows;

      const actual = this.trackingYears.map(year => {
        const total = rows.reduce((sum, row) => sum + (Number(row[`year${year}`]) || 0), 0);
        return Number((total / 1000000).toFixed(3));
      });

      const expected = actual.map((value, index) => {
        const dummyFactor = 1.08 + (index * 0.02);
        return Number((value * dummyFactor).toFixed(3));
      });

      const variance = actual.map((val, idx) => {
        return Number((val - expected[idx]).toFixed(3));
      });

      return {
        labels,
        actual,
        expected,
        variance
      };
    },
    
    // Options and Series for CHART 1: Actual vs Expected
    siteTrendOptions() {
      return {
        chart: {
          fontFamily: 'Arial, sans-serif',
          toolbar: { show: false },
          animations: { enabled: false }
        },
        colors: ['#1f5fa8', '#d93025'], // Blue for Actual, Red for Expected
        xaxis: {
          categories: this.siteTrendData.labels,
          title: { text: 'Year' },
          labels: {
            style: {
              fontSize: '15px', // <--- ADD THIS (Adjust to your liking)
              fontWeight: 600   // Optional: You can also make it bold
            }
          }
        },
        yaxis: {
          title: { text: 'Value (Millions)' },
          labels: {
            formatter: value => `${Number(value).toFixed(1)}M`,
            style: {
              fontSize: '15px', // <--- ADD THIS
              fontWeight: 600   // Optional
            }
          }
        },
        stroke: {
          width: [0, 4],
          curve: 'smooth'
        },
        plotOptions: {
          bar: {
            columnWidth: '45%',
            borderRadius: 4
          }
        },
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
    siteTrendSeries() {
      return [
        { name: 'Actual Value', type: 'column', data: this.siteTrendData.actual },
        { name: 'Expected Value', type: 'line', data: this.siteTrendData.expected }
      ];
    },

    // Options and Series for CHART 2: Variance vs Expected
    varianceTrendOptions() {
      return {
        chart: {
          fontFamily: 'Arial, sans-serif',
          toolbar: { show: false },
          animations: { enabled: false }
        },
        colors: ['#17a2b8', '#d93025'], // Teal for Variance, Red for Expected
        xaxis: {
          categories: this.siteTrendData.labels,
          title: { text: 'Year' },
          labels: {
            style: {
              fontSize: '15px', // <--- ADD THIS (Adjust to your liking)
              fontWeight: 600   // Optional: You can also make it bold
            }
          }
        },
        yaxis: {
          title: { text: 'Value (Millions)' },
          labels: {
            formatter: value => `${Number(value).toFixed(1)}M`,
            style: {
              fontSize: '15px', // <--- ADD THIS
              fontWeight: 600   // Optional
            }
          }
        },
        stroke: {
          width: [0, 4],
          curve: 'smooth'
        },
        plotOptions: {
          bar: {
            columnWidth: '45%',
            borderRadius: 4
          }
        },
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
    varianceTrendSeries() {
      return [
        { name: 'Variance (Actual - Expected)', type: 'column', data: this.siteTrendData.variance },
        { name: 'Expected Value', type: 'line', data: this.siteTrendData.expected }
      ];
    },

    // ==========================================
    // SUMMARY TABLES DATA (Unfiltered by Site)
    // ==========================================
    pillarSummaryData() {
      const map = {};

      this.rows.forEach(row => {
        const pillar = row.pillars || 'Unassigned';
        if (!map[pillar]) {
          map[pillar] = { count: 0, value: 0 };
        }
        
        map[pillar].count += 1;
        
        // Sum timeline values across the currently visible tracking years
        let projectValue = 0;
        this.trackingYears.forEach(year => {
          projectValue += Number(row[`year${year}`]) || 0;
        });
        
        map[pillar].value += projectValue;
      });

      return Object.entries(map)
        .map(([pillar, data]) => ({ pillar, ...data }))
        .sort((a, b) => b.value - a.value); // Sort highest value first
    },

    yearlySummaryData() {
      // Requirement: Years N to N+2
      const years = [this.currentYear, this.currentYear + 1, this.currentYear + 2];
      
      return years.map(year => {
        // Actual Value for the year
        const actual = this.rows.reduce((sum, row) => sum + (Number(row[`year${year}`]) || 0), 0);
        
        // Expected Value Dummy Logic (matches the chart logic)
        const timelineIdx = this.trackingYears.indexOf(year);
        const dummyFactor = timelineIdx >= 0 ? 1.08 + (timelineIdx * 0.02) : 1.10;
        const target = actual * dummyFactor;

        return {
          year: year,
          actual: actual,
          target: target
        };
      });
    },

    // ==========================================
    // STATIC PIE CHARTS
    // ==========================================
    dtitPieData() {
      return this.buildCountPieData('dtitInvolved');
    },
    foakPieData() {
      return this.buildCountPieData('foakNoak');
    },
    pillarPieData() {
      return this.buildCountPieData('pillars');
    },
    kpiPieData() {
      return this.buildKpiPieData();
    },

    dtitPieOptions() {
      return this.buildPieOptions('DTIT Involved', this.dtitPieData.labels);
    },
    foakPieOptions() {
      return this.buildPieOptions('FOAK / NOAK', this.foakPieData.labels);
    },
    pillarPieOptions() {
      return this.buildPieOptions('Pillars', this.pillarPieData.labels);
    },
    kpiPieOptions() {
      return this.buildPieOptions('KPI Breakdown', this.kpiPieData.labels);
    },

    dtitPieSeries() {
      return this.dtitPieData.values;
    },
    foakPieSeries() {
      return this.foakPieData.values;
    },
    pillarPieSeries() {
      return this.pillarPieData.values;
    },
    kpiPieSeries() {
      return this.kpiPieData.values;
    }
  },
  created() {
    this.rebuildTableColumns();
    this.addForm = this.emptyForm();
    this.updateForm = this.emptyForm();
  },
  async mounted() {
    const token = localStorage.getItem('token');
    if (!token) return this.$router.push('/login');

    try {
      const response = await this.apiFetch(`${process.env.VUE_APP_API_URL}/api/check-auth`);
      if (!response.ok) throw new Error('Session expired');
    } catch {
      localStorage.removeItem('token');
      return this.$router.push('/login');
    }

    await this.fetchTable();
  },
  methods: {
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
      const form = { ...base };
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
      if (value === null || value === undefined || String(value).trim() === '') {
        return 'Unassigned';
      }
      return String(value).trim();
    },

    buildCountPieData(field) {
      const map = {};

      this.rows.forEach(row => {
        const key = this.normalizePieLabel(row[field]);
        map[key] = (map[key] || 0) + 1;
      });

      const sortedEntries = Object.entries(map).sort((a, b) => b[1] - a[1]);

      return {
        labels: sortedEntries.map(([label]) => label),
        values: sortedEntries.map(([, value]) => value)
      };
    },

    buildKpiPieData() {
      // Ensure we ONLY pull financial value metrics so the pie chart proportions make mathematical sense
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
          return this.rows.reduce((sum, row) => sum + (Number(row[m.field]) || 0), 0);
        })
      };
    },

    buildPieOptions(title, labels) {
      const isFinancial = title === 'KPI Breakdown';

      return {
        chart: {
          type: 'pie',
          fontFamily: 'Arial, sans-serif',
          toolbar: { show: false },
          animations: { enabled: false }
        },
        labels,
        colors: this.pieColors,
        legend: {
          show: true,
          position: 'bottom',
          horizontalAlign: 'center',
          fontSize: '16px',
          fontWeight: 500,
          markers: {
            width: 12,
            height: 12,
            radius: 12,
            offsetX: -4,
          },
          itemMargin: {
            horizontal: 10,
            vertical: 5
          },
          formatter: (seriesName, opts) => {
            const val = opts.w.globals.seriesTotals[opts.seriesIndex];
            const total = opts.w.globals.seriesTotals.reduce((a, b) => a + b, 0);
            const percent = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';

            if (isFinancial) {
              const millions = '$' + (Number(val) / 1000000).toFixed(2) + 'M';
              return `${seriesName}: ${millions} (${percent}%)`;
            }
            return `${seriesName}: ${val} (${percent}%)`;
          },
          onItemClick: {
            toggleDataSeries: false
          },
          onItemHover: {
            highlightDataSeries: false
          }
        },
        // Turn off internal slice labels so they are only displayed outside via the Legend
        dataLabels: {
          enabled: false
        },
        tooltip: {
          enabled: true,
          y: {
            formatter: (val, opts) => {
              // Safely calculate percentage
              const seriesArr = opts.series || [];
              const total = seriesArr.reduce((a, b) => a + b, 0);
              const percent = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
              
              if (isFinancial) {
                const millions = '$' + (Number(val) / 1000000).toFixed(2) + 'M';
                return `${millions} (${percent}%)`;
              }
              return `${val} (${percent}%)`;
            }
          }
        },
        stroke: {
          width: 1,
          colors: ['#ffffff']
        },
        plotOptions: {
          pie: {
            expandOnClick: false
          }
        },
        states: {
          hover: {
            filter: {
              type: 'none'
            }
          },
          active: {
            filter: {
              type: 'none'
            }
          }
        },
        noData: {
          text: `No data for ${title}`
        }
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
      if (response.status === 401) {
        alert('Session expired. Please log in again.');
        this.logout();
        throw new Error('Session expired');
      }
      return response;
    },

    // -------------------------------------------------
    // DATA FETCHING
    // -------------------------------------------------
    async fetchTable() {
      this.isPageLoading = true;
      try {
        const response = await this.apiFetch(`${process.env.VUE_APP_API_URL}/api/manager-yearly`);
        if (!response.ok) throw new Error('Failed to fetch data');

        const data = await response.json();
        
        // Ensure projectStatus maps correctly from backend project_status
        this.rows = data.map(row => ({
          ...row,
          projectStatus: row.projectStatus || row.project_status
        }));
      } catch (err) {
        console.error(err);
      } finally {
        this.isPageLoading = false;
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
    openSpotfire() {
      window.open(
        'https://spotfirecbeit.mua.st.com/spotfire/wp/OpenAnalysis?file=ac4fc7dd-24b0-4f94-922d-1184fedfca41',
        '_blank'
      );
    },
    logout() {
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

    allColumnDefs() {
      return [
        ...this.baseColumnDefs(),
        ...this.yearColumnDefs(),
        ...this.kpiColumnDefs()
      ];
    },

    isColumnHidden(field, defaultHidden = false) {
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
    async openHistoryModal() {
      if (!this.selectedRow || !this.selectedRow.projectId) {
        return alert('Please select a row first.');
      }

      this.showHistoryModal = true;
      this.isFetchingHistory = true;
      this.historyData = [];

      try {
        const response = await this.apiFetch(
          `${process.env.VUE_APP_API_URL}/api/manager-yearly/${this.selectedRow.projectId}/history`
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Backend Server returned ${response.status}`);
        }

        const historicalRecords = await response.json();

        const currentState = {
          history_id: 'current',
          project_id: this.selectedRow.projectId,
          changed_at: 'Current Status',
          changed_by: 'Active Record',
          action_type: 'CURRENT',
          project_name: this.selectedRow.projectName,
          project_status: this.selectedRow.projectStatus,
          capacity_gain_value: this.selectedRow.capacityGainValue,
          capacity_gain_pct: this.selectedRow.capacityGainPercent,
          dl_value: this.selectedRow.dlValue,
          dl_equivalent: this.selectedRow.dlEquivalent,
          idl_value: this.selectedRow.idlValue,
          idl_fte: this.selectedRow.idlFte,
          yield_value: this.selectedRow.yieldValue,
          yield_gain_pct: this.selectedRow.yieldPercentGain,
          quality_value: this.selectedRow.qualityValue,
          quality_cases: this.selectedRow.qualityCases,
          comment_text: this.selectedRow.comment
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
        const response = await this.apiFetch(`${process.env.VUE_APP_API_URL}/api/manager-yearly/history/all`);
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
      if (this.isProcessing || log.action_type === 'CURRENT') return;

      const confirmed = confirm(`Are you sure you want to revert to the values from ${log.changed_at}?`);
      if (!confirmed) return;

      this.isProcessing = true;
      this.processingMessage = 'Restoring record...';

      try {
        const payload = {
          projectName: log.project_name,
          projectStatus: log.project_status,
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

        const response = await this.apiFetch(`${process.env.VUE_APP_API_URL}/api/manager-yearly/${log.project_id}`, {
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
      this.editingCell = { rowId: row.projectId, field };
      this.editValue = currentValue;
    },
    cancelInlineEdit() {
      this.editingCell = { rowId: null, field: null };
      this.editValue = null;
    },
    async saveInlineEdit(row) {
      const field = this.editingCell.field;
      if (!field) return;

      let newValue = this.editValue;
      const stringFields = [
        'projectName',
        'projectId',
        'projectStatus',
        'pillars',
        'sites',
        'currentPmoGate',
        'dtitInvolved',
        'aiAaAType',
        'foakNoak',
        'comment'
      ];

      if (!stringFields.includes(field)) {
        newValue = newValue === '' || newValue === null ? null : Number(newValue);
      }

      const oldVal = row[field];
      row[field] = newValue;
      this.cancelInlineEdit();

      try {
        const response = await this.apiFetch(`${process.env.VUE_APP_API_URL}/api/manager-yearly/${row.projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row)
        });

        if (!response.ok) throw new Error('Failed to update via inline edit');
      } catch (err) {
        alert('Update failed, reverting change: ' + err.message);
        row[field] = oldVal;
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
        qualityCases: null
      };

      this.trackingYears.forEach(year => {
        form[`year${year}`] = null;
      });

      return form;
    },
    openAddForm() {
      this.addForm = this.emptyForm();
      this.showAddForm = true;
      this.showUpdateForm = false;
    },
    openUpdateForm() {
      if (!this.selectedRow) return alert('Please select a row to update.');

      this.updateForm = this.buildTimelineForm({ ...this.selectedRow }, false);
      this.showUpdateForm = true;
      this.showAddForm = false;
    },
    closeForm() {
      this.showAddForm = false;
      this.showUpdateForm = false;
    },
    async submitAddForm() {
      this.isProcessing = true;
      this.processingMessage = 'Creating Project Metadata...';
      try {
        const response = await this.apiFetch(`${process.env.VUE_APP_API_URL}/api/manager-yearly`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.addForm)
        });
        if (!response.ok) throw new Error('Failed to create project metadata.');

        this.processingMessage = 'Saving Financial Data & KPIs...';
        const updateResponse = await this.apiFetch(
          `${process.env.VUE_APP_API_URL}/api/manager-yearly/${this.addForm.projectId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.addForm)
          }
        );

        if (!updateResponse.ok) throw new Error('Project created, but failed to save financial data.');

        this.closeForm();
        await this.fetchTable();
      } catch (err) {
        alert(err.message);
      } finally {
        this.isProcessing = false;
        this.processingMessage = '';
      }
    },
    async submitUpdateForm() {
      this.isProcessing = true;
      this.processingMessage = 'Updating Project Data...';
      try {
        const response = await this.apiFetch(
          `${process.env.VUE_APP_API_URL}/api/manager-yearly/${this.updateForm.projectId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.updateForm)
          }
        );
        if (!response.ok) throw new Error('Failed to update project data.');

        this.closeForm();
        await this.fetchTable();
      } catch (err) {
        alert(err.message);
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
.spotfire-btn {
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
.spotfire-btn:hover {
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

/* Analytics Shared Header & Summary Tables */
.analytics-section {
  padding: 20px;
}
.analytics-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
}
.section-title {
  margin: 0;
  color: #07254a;
  font-size: 1.2rem;
}

/* Executive Cards CSS */
.executive-cards-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.metric-card {
  padding: 20px;
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
  margin: 0 0 12px 0;
  font-size: 1.1rem;
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
  font-size: 1.8rem;
  font-weight: 800;
}
.metric-divider {
  font-size: 1.5rem;
  opacity: 0.7;
}
.metric-count {
  font-size: 1.1rem;
  font-weight: 500;
  opacity: 0.95;
}
.bg-overall { background: linear-gradient(135deg, #1f5fa8, #3b7dc9); }
.bg-g1 { background: linear-gradient(135deg, #28a745, #4cd16a); }
.bg-g2 { background: linear-gradient(135deg, #fd7e14, #ff9e43); }
.bg-g3 { background: linear-gradient(135deg, #902f99, #902f99); }

/* Summary Tables CSS */
.summary-tables-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
.table-responsive {
  overflow-x: auto;
}
.summary-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}
.summary-table th, .summary-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e6ed;
  font-size: 1rem;
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

/* Charts CSS */
.trend-charts-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
.piecharts-section {
  display: grid;
  grid-template-columns: repeat(2, minmax(320px, 1fr));
  gap: 20px;
}
.chart-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e0e6ed;
}
.chart-header {
  border-bottom: 2px solid #eee;
  padding-bottom: 12px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chart-title {
  margin: 0;
  color: #07254a;
  font-size: 1.1rem;
}
.chart-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.control-select {
  padding: 6px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: #f8f9fb;
  color: #07254a;
  font-weight: 600;
}
.chart-body {
  min-height: 350px;
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

/* Buttons inside the Tab */
.actions {
  display: flex;
  gap: 12px;
  margin: 16px 20px;
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
  border-bottom: 1px dashed transparent;
  transition: border-color 0.2s, background-color 0.2s;
  display: inline-block;
  min-width: 50px;
  min-height: 20px;
}
.editable-cell:hover {
  border-bottom: 1px dashed #1f5fa8;
  background-color: #f0f4f8;
}
.inline-input {
  padding: 6px;
  border: 1px solid #1f5fa8;
  border-radius: 4px;
  outline: none;
  font-family: inherit;
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
  .piecharts-section {
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
