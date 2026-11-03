<template>
  <div class="table-gui-page">
    <!-- Loading Overlay -->
    <div v-if="isPageLoading" class="loading-overlay">
      <div class="loading-box">
        <div class="spinner"></div>
        <div class="loading-text">Loading data, please wait...</div>
      </div>
    </div>

    <!-- Processing Overlay -->
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
          AI@BEM Portal<br />
          System Administration
        </span>
      </div>

      <div class="topbar-actions">
        <button class="back-btn" @click="goBack" :disabled="isProcessing || isPageLoading">Back</button>
        <button class="home-btn" @click="goHome" :disabled="isProcessing || isPageLoading">Home</button>
        <button class="logout-btn" @click="logout" :disabled="isProcessing || isPageLoading">Logout</button>
      </div>
    </header>

    <div class="banner">System Administration & Access Control</div>

    <!-- NAVIGATION TABS -->
    <div class="tabs-container">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'users' }"
        @click="activeTab = 'users'"
        :disabled="isProcessing || isPageLoading"
      >
        User Access Management
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'config' }"
        @click="activeTab = 'config'"
        :disabled="isProcessing || isPageLoading"
      >
        Master Data Configuration
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'targets' }"
        @click="activeTab = 'targets'"
        :disabled="isProcessing || isPageLoading"
      >
        Site Targets
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'columns' }"
        @click="activeTab = 'columns'"
        :disabled="isProcessing || isPageLoading"
      >
        Project Columns
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'visibility' }"
        @click="openColumnVisibilityTab"
        :disabled="isProcessing || isPageLoading"
      >
        Column Visibility
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'visualisations' }" @click="activeTab = 'visualisations'" :disabled="isProcessing || isPageLoading">
        Visualisation Management
      </button>
    </div>

    <user-access-tab
      v-show="activeTab === 'users'"
      v-bind="userAccessTabProps"
      v-model:editValue="editValue"
      @open-add="openAddUserModal"
      @start-edit="startInlineEdit"
      @save-role="saveUserRole"
      @cancel-edit="cancelInlineEdit"
    />

    <master-data-tab
      v-show="activeTab === 'config'"
      v-bind="masterDataTabProps"
      v-model:selectedCategory="selectedCategory"
      @open-add="openAddConfigModal"
      @configure-site="configureMissingSite"
    />

    <site-targets-tab
      v-show="activeTab === 'targets'"
      v-bind="siteTargetsTabProps"
      v-model:editValue="editValue"
      @open-add="openAddTargetModal"
      @start-edit="startInlineEdit"
      @save-target="saveSiteTarget"
      @cancel-edit="cancelInlineEdit"
    />

    <project-columns-tab
      v-show="activeTab === 'columns'"
      v-bind="projectColumnsTabProps"
      @refresh="fetchProjectColumns"
      @open-add="openAddProjectColumnModal"
      @retry-column="openRetryProjectColumnModal"
      @edit-column="openEditProjectColumnModal"
      @manage-options="manageProjectColumnOptions"
    />

    <column-visibility-tab
      v-show="activeTab === 'visibility'"
      v-bind="columnVisibilityTabProps"
      v-model:visibilitySearch="visibilitySearch"
      @refresh="fetchColumnVisibility"
      @save="saveColumnVisibility"
      @discard="discardColumnVisibilityChanges"
      @set-all="setAllColumnsVisible"
      @toggle-column="changeColumnVisibility"
    />

    <visualisation-management-tab
      v-show="activeTab === 'visualisations'"
      :active="activeTab === 'visualisations'"
      :api-base-url="apiBaseUrl"
      :api-fetch="apiFetch"
      :busy="isProcessing || isPageLoading"
    />

    <add-user-dialog
      v-if="showAddUserModal"
      v-bind="addUserDialogProps"
      @save="saveUserDraft"
      @close="showAddUserModal = false"
    />

    <add-config-dialog
      v-if="showAddConfigModal"
      v-bind="addConfigDialogProps"
      @save="saveConfigDraft"
      @close="showAddConfigModal = false"
    />

    <add-target-dialog
      v-if="showAddTargetModal"
      v-bind="addTargetDialogProps"
      @save="saveTargetDraft"
      @close="showAddTargetModal = false"
    />

    <project-column-dialog
      v-if="showProjectColumnModal"
      v-bind="projectColumnDialogProps"
      v-model:projectColumnNewCategory="projectColumnNewCategory"
      v-model:projectColumnCategoryName="projectColumnCategoryName"
      @save="submitProjectColumn"
      @close="closeProjectColumnModal"
      @change-field="changeProjectColumnField"
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
import UserAccessTab from './admin-dashboard/components/UserAccessTab.vue';
import MasterDataTab from './admin-dashboard/components/MasterDataTab.vue';
import SiteTargetsTab from './admin-dashboard/components/SiteTargetsTab.vue';
import ProjectColumnsTab from './admin-dashboard/components/ProjectColumnsTab.vue';
import ColumnVisibilityTab from './admin-dashboard/components/ColumnVisibilityTab.vue';
import VisualisationManagementTab from './admin-dashboard/components/VisualisationManagementTab.vue';
import AddUserDialog from './admin-dashboard/components/AddUserDialog.vue';
import AddConfigDialog from './admin-dashboard/components/AddConfigDialog.vue';
import AddTargetDialog from './admin-dashboard/components/AddTargetDialog.vue';
import ProjectColumnDialog from './admin-dashboard/components/ProjectColumnDialog.vue';
import 'vue-good-table-next/dist/vue-good-table-next.css';
import { createAdminState } from './admin-dashboard/logic/state';
import { computed as viewBindingsComputed } from './admin-dashboard/logic/viewBindings';
import { computed as apiComputed, methods as apiMethods } from './admin-dashboard/logic/api';
import { computed as pageComputed, methods as pageMethods } from './admin-dashboard/logic/page';
import { methods as editingMethods } from './admin-dashboard/logic/editing';
import { methods as formattersMethods } from './admin-dashboard/logic/formatters';
import { methods as usersMethods } from './admin-dashboard/logic/users';
import { computed as configComputed, methods as configMethods } from './admin-dashboard/logic/config';
import { methods as targetsMethods } from './admin-dashboard/logic/targets';
import { computed as columnsComputed, methods as columnsMethods } from './admin-dashboard/logic/columns';
import { computed as visibilityComputed, methods as visibilityMethods } from './admin-dashboard/logic/visibility';

export default {
  name: 'AdminDashboard',
  components: {
    UserAccessTab,
    MasterDataTab,
    SiteTargetsTab,
    ProjectColumnsTab,
    ColumnVisibilityTab,
    VisualisationManagementTab,
    AddUserDialog,
    AddConfigDialog,
    AddTargetDialog,
    ProjectColumnDialog
  },
  data: createAdminState,
  computed: {
    ...apiComputed,
    ...pageComputed,
    ...configComputed,
    ...columnsComputed,
    ...visibilityComputed,
    ...viewBindingsComputed
  },
  async mounted() {
    const token = localStorage.getItem('token');
    if (!token || !this.isAdmin) {
      alert("Access Denied: Administrator privileges required.");
      this.$router.push('/landing');
      return;
    }

    this.isPageLoading = true;
    try {
      const response = await this.apiFetch(`${this.apiBaseUrl}/api/check-auth`);
      if (!response.ok) throw new Error('Session expired');

      const authData = await response.json();
      if (authData.user.access_right !== 'admin') {
        throw new Error('Not an admin');
      }
      await Promise.allSettled([
        this.fetchUsers(),
        this.fetchConfigs(),
        this.fetchSiteUsage(),
        this.fetchSiteTargets(),
        this.fetchProjectColumns(),
        this.fetchColumnVisibility()
      ]);
      this.syncConfigCategories();
    } catch {
      localStorage.clear();
      this.$router.push('/login');
    } finally {
      this.isPageLoading = false;
    }
  },
  methods: {
    ...apiMethods,
    ...pageMethods,
    ...editingMethods,
    ...formattersMethods,
    ...usersMethods,
    ...configMethods,
    ...targetsMethods,
    ...columnsMethods,
    ...visibilityMethods,
    saveUserDraft(draft) {
      this.addUserForm = draft;
      return this.submitAddUser();
    },
    saveConfigDraft(draft, addingNewCategory) {
      this.addConfigForm = draft;
      this.isAddingNewCategory = addingNewCategory;
      return this.submitAddConfig();
    },
    saveTargetDraft(draft) {
      this.addTargetForm = draft;
      return this.submitAddTarget();
    },
    changeProjectColumnField(field, value) {
      this.projectColumnForm[field] = value;
      if (field === 'label') this.suggestProjectColumnName();
      if (field === 'columnName') this.projectColumnNameEdited = true;
    },
    changeColumnVisibility(field, visible) {
      if (this.isProcessing || !this.columnVisibilityLoaded) return;
      const column = this.visibilityColumns.find(item => item.field === field);
      if (column && !column.required) column.visible = visible;
    }
  }
};
</script>

<style scoped src="./admin-dashboard/styles/page.css"></style>
<style scoped src="./admin-dashboard/styles/columns.css"></style>
<style scoped src="./admin-dashboard/styles/dialogs.css"></style>
<style scoped src="./admin-dashboard/styles/loading.css"></style>
