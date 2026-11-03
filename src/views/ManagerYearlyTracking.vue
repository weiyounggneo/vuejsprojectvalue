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
          AI@BEM Portal <br />
          Project Tracking
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
        @click="openPortfolioOverview"
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

    <grid-section
      v-show="activeTab === 'grid'"
      v-bind="gridSectionProps"
      v-model:editValue="editValue"
      v-model:manualSnapshotMonth="manualSnapshotMonth"
      @year-change="changeTimelineYear"
      @apply-window="applyTimelineWindow"
      @filter-change="changeGridFilter"
      @open-project-dropdown="showProjectDropdown = true"
      @close-project-dropdown="closeProjectDropdown"
      @select-project="selectProject"
      @open-add="openAddForm"
      @open-update="openUpdateForm"
      @open-history="openHistoryModal"
      @open-global-history="openGlobalHistoryModal"
      @snapshot="forceSnapshot"
      @financial-view="setFinancialView"
      @timeline-view="setTimelineView"
      @global-view="setGlobalView"
      @open-column-manager="showColumnManager = true"
      @refresh="refreshProjectData"
      @clear-filters="clearFilters"
      @select-row="selectRow"
      @start-edit="startInlineEdit"
      @save-edit="saveInlineEdit"
      @cancel-edit="cancelInlineEdit"
    />

    <portfolio-overview
      v-if="activeTab === 'analytics'"
      v-bind="portfolioOverviewProps"
      @global-filter-change="setPortfolioGlobalValues"
      @refresh-layout="fetchPortfolioLayout"
    />

    <project-timeline
      v-if="activeTab === 'timeline'"
      v-bind="projectTimelineProps"
      v-model:editValue="editValue"
      @site-change="timelineFilter.site = $event"
      @start-edit="startInlineEdit"
      @save-edit="saveInlineEdit"
      @cancel-edit="cancelInlineEdit"
    />

    <project-form-dialog
      v-if="showAddForm || showUpdateForm"
      v-bind="projectFormDialogProps"
      @save="saveProjectDraft"
      @close="closeForm"
    />

    <project-history-dialog
      v-if="showHistoryModal"
      v-bind="projectHistoryDialogProps"
      @restore="restoreHistoricalRecord"
      @close="showHistoryModal = false"
    />

    <global-history-dialog
      v-if="showGlobalHistoryModal"
      v-bind="globalHistoryDialogProps"
      @restore="restoreHistoricalRecord"
      @close="showGlobalHistoryModal = false"
    />

    <column-manager-dialog
      v-if="showColumnManager"
      v-bind="columnManagerDialogProps"
      @toggle="toggleColumnVisibility"
      @close="showColumnManager = false"
    />


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
import GridSection from './manager-yearly/components/GridSection.vue';
import PortfolioOverview from './manager-yearly/components/PortfolioOverview.vue';
import ProjectTimeline from './manager-yearly/components/ProjectTimeline.vue';
import ProjectFormDialog from './manager-yearly/components/ProjectFormDialog.vue';
import ProjectHistoryDialog from './manager-yearly/components/ProjectHistoryDialog.vue';
import GlobalHistoryDialog from './manager-yearly/components/GlobalHistoryDialog.vue';
import ColumnManagerDialog from './manager-yearly/components/ColumnManagerDialog.vue';
import 'vue-good-table-next/dist/vue-good-table-next.css';
import { computed as viewBindingsComputed } from './manager-yearly/logic/viewBindings';
import { createTrackingState } from './manager-yearly/logic/state';
import { computed as apiComputed, methods as apiMethods } from './manager-yearly/logic/api';
import { computed as fieldsComputed, methods as fieldsMethods } from './manager-yearly/logic/fields';
import { computed as gridComputed, methods as gridMethods } from './manager-yearly/logic/grid';
import { computed as portfolioComputed, methods as portfolioMethods } from './manager-yearly/logic/portfolio';
import { computed as timelineComputed, methods as timelineMethods } from './manager-yearly/logic/timeline';
import { computed as historyComputed, methods as historyMethods } from './manager-yearly/logic/history';
import { computed as formsComputed, methods as formsMethods } from './manager-yearly/logic/forms';
import { methods as formattersMethods } from './manager-yearly/logic/formatters';
import { computed as pageComputed, methods as pageMethods } from './manager-yearly/logic/page';
import { methods as pdfMethods } from './manager-yearly/logic/pdf';
import { computed as visualisationsComputed, methods as visualisationsMethods } from './manager-yearly/logic/visualisations';
import { methods as columnPreferencesMethods } from './manager-yearly/logic/columnPreferences';

export default {
  name: 'ManagerYearlyTracking',
  components: { GridSection, PortfolioOverview, ProjectTimeline, ProjectFormDialog, ProjectHistoryDialog, GlobalHistoryDialog, ColumnManagerDialog },
  data: createTrackingState,
  computed: {
    ...apiComputed,
    ...fieldsComputed,
    ...gridComputed,
    ...portfolioComputed,
    ...timelineComputed,
    ...historyComputed,
    ...formsComputed,
    ...pageComputed,
    ...visualisationsComputed,
    ...viewBindingsComputed
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
      this.loadColumnPreferences(auth.user?.username);
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
    ...apiMethods,
    ...fieldsMethods,
    ...gridMethods,
    ...portfolioMethods,
    ...timelineMethods,
    ...historyMethods,
    ...formsMethods,
    ...formattersMethods,
    ...pageMethods,
    ...pdfMethods,
    ...visualisationsMethods,
    ...columnPreferencesMethods,
    changeGridFilter(field, value) {
      this.filters[field] = value;
    },
    changeTimelineYear({ field, value }) {
      const parsed = parseFloat(value);
      this.timelineConfig[`${field}Year`] = Number.isNaN(parsed) ? value : parsed;
      this.normalizeTimelineWindow(field);
    },
    saveProjectDraft(draft) {
      if (this.showAddForm) {
        this.addForm = draft;
        return this.submitAddForm();
      }
      this.updateForm = draft;
      return this.submitUpdateForm();
    }
  }
};
</script>

<style scoped src="./manager-yearly/styles/page.css"></style>
<style scoped src="./manager-yearly/styles/grid.css"></style>
<style scoped src="./manager-yearly/styles/dialogs.css"></style>

<style scoped src="./manager-yearly/styles/loading.css"></style>
