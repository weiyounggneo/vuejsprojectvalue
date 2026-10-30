// Config logic for AdminDashboard. Functions run on the page instance.
import { normalizeSite, resolveSiteOptions } from '../../portfolio-layout/siteOptions';

export const computed = {
  resolvedSiteOptions() {
    return resolveSiteOptions({
      masterSites: this.configMap.SITE || [],
      rows: this.siteUsageRows,
      targets: this.siteTargets
    });
  },
  masterDataColumns() {
    if (this.selectedCategory !== 'SITE') return this.configColumns;
    return [
      { label: 'Site', field: 'value' },
      { label: 'Status', field: 'status' },
      { label: 'Eligible Projects', field: 'eligibleProjectCount', type: 'number' },
      { label: 'Target Records', field: 'targetCount', type: 'number' },
      { label: 'Filter Availability', field: 'filterAvailability' },
      { label: 'Actions', field: 'actions', sortable: false }
    ];
  },
  filteredConfigOptions() {
    if (!this.selectedCategory) return [];
    if (this.selectedCategory === 'SITE') return this.resolvedSiteOptions.map(site => ({
      ...site,
      status: site.configured ? 'Configured' : 'Missing from Master Data',
      filterAvailability: 'Available'
    }));
    const options = this.configMap[this.selectedCategory] || [];
    return options.map(opt => ({ value: opt }));
  }
};

export const methods = {
  syncConfigCategories() {
    const categories = Object.keys(this.configMap || {});
    if (this.resolvedSiteOptions.length && !categories.includes('SITE')) categories.push('SITE');
    this.availableCategories = categories.sort();
    if (!this.availableCategories.includes(this.selectedCategory)) this.selectedCategory = this.availableCategories[0] || '';
  },

  async fetchConfigs() {
    try {
      const res = await this.apiFetch(`${this.apiBaseUrl}/api/config/options`);
      if (!res.ok) throw new Error('Failed to fetch configuration options');
      const data = await res.json();
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid configuration response');
      this.configMap = data;
      this.syncConfigCategories();
    } catch (err) {
      console.error(err);
    }
  },

  async fetchSiteUsage() {
    if (this.siteUsageLoading) return;
    this.siteUsageLoading = true;
    this.siteUsageError = '';
    try {
      const res = await this.apiFetch(`${this.apiBaseUrl}/api/manager-yearly`);
      if (!res.ok) throw new Error('Failed to fetch project Site usage');
      const rows = await res.json();
      if (!Array.isArray(rows)) throw new Error('Invalid project Site usage response');
      this.siteUsageRows = rows;
    } catch (err) {
      if (!err.isUnauthorized) this.siteUsageError = 'Project usage could not be loaded. Configured Sites and target usage are still shown.';
    } finally {
      this.siteUsageLoading = false;
      this.syncConfigCategories();
    }
  },

  openAddConfigModal(prefill = '') {
    this.addConfigForm.value = typeof prefill === 'string' ? prefill : '';
    this.addConfigForm.newCategory = '';
    this.isAddingNewCategory = false; 
    this.showAddConfigModal = true;
  },

  configureMissingSite(site) {
    const value = normalizeSite(site?.value ?? site);
    if (!value || this.isProcessing) return;
    this.selectedCategory = 'SITE';
    this.openAddConfigModal(value);
  },

  async submitAddConfig() {
    if (!this.addConfigForm.value.trim()) {
      return alert("Value cannot be blank.");
    }

    let categoryToUse = this.selectedCategory;

    if (this.isAddingNewCategory) {
      if (!this.addConfigForm.newCategory.trim()) {
        return alert("New category name cannot be blank.");
      }
      categoryToUse = this.addConfigForm.newCategory.trim().toUpperCase().replace(/\s+/g, '_');
    }

    if (!categoryToUse) {
      return alert("Please select or create a category before adding an option.");
    }

    this.isProcessing = true;
    this.processingMessage = 'Adding new option...';

    try {
      const inputValue = this.addConfigForm.value.trim();
      if (categoryToUse === 'SITE') {
        const site = normalizeSite(inputValue);
        if (!site || site === 'ALL' || inputValue.includes(',')) return alert("Enter one Site name only. 'ALL' and comma-separated values are not valid Master Data Sites.");
        if ((this.configMap.SITE || []).some(value => normalizeSite(value) === site)) return alert(`${site} is already configured in Master Data.`);
      }

      const payload = {
        category: categoryToUse,
        value: categoryToUse === 'SITE' ? normalizeSite(inputValue) : inputValue
      };

      const res = await this.apiFetch(`${this.apiBaseUrl}/api/config/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to add option');
      }

      this.successMessage = `'${payload.value}' has been successfully added to ${this.formatCategoryName(categoryToUse)}.`;
      this.showAddConfigModal = false;
      this.showSuccessDialog = true;
      
      this.selectedCategory = categoryToUse;
      await this.fetchConfigs();
      await this.fetchProjectColumns();
    } catch (err) {
      alert(err.message);
    } finally {
      this.isProcessing = false;
      this.processingMessage = '';
    }
  }
};
