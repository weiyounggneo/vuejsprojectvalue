// Targets logic for AdminDashboard. Functions run on the page instance.
export const methods = {
  async fetchSiteTargets() {
    try {
      const res = await this.apiFetch(`${this.apiBaseUrl}/api/manager-site-targets`);
      if (!res.ok) throw new Error('Failed to fetch site targets');
      this.siteTargets = await res.json();
      this.syncConfigCategories?.();
    } catch (err) {
      console.error("Site targets fetch error:", err);
    }
  },

  openAddTargetModal() {
    this.addTargetForm.site = '';
    this.addTargetForm.target_year = new Date().getFullYear();
    this.addTargetForm.expected_value = null;
    this.showAddTargetModal = true;
  },

  async submitAddTarget() {
    if (!this.addTargetForm.site || !this.addTargetForm.target_year || this.addTargetForm.expected_value === null) {
      return alert("All fields are required.");
    }

    this.isProcessing = true;
    this.processingMessage = 'Adding new site target...';

    try {
      const res = await this.apiFetch(`${this.apiBaseUrl}/api/manager-site-targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.addTargetForm)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to add target');
      }

      this.successMessage = `Target for ${this.addTargetForm.site} (${this.addTargetForm.target_year}) successfully added.`;
      this.showAddTargetModal = false;
      this.showSuccessDialog = true;
      
      await this.fetchSiteTargets();
    } catch (err) {
      alert(err.message);
    } finally {
      this.isProcessing = false;
      this.processingMessage = '';
    }
  },

  async saveSiteTarget(row) {
    if (this.isProcessing) return;
    const field = this.editingCell.field;
    if (field !== 'expected_value') return;

    const newValue = Number(this.editValue);
    if (newValue === Number(row.expected_value)) {
      this.cancelInlineEdit();
      return;
    }

    this.isProcessing = true;
    this.processingMessage = `Updating target for ${row.site}...`;
    
    try {
      const res = await this.apiFetch(`${this.apiBaseUrl}/api/manager-site-targets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site: row.site,
          target_year: row.target_year,
          expected_value: newValue
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to update target');
      }

      this.successMessage = `Successfully updated target for ${row.site} (${row.target_year}).`;
      this.showSuccessDialog = true;
      await this.fetchSiteTargets();
    } catch (err) {
      alert(err.message);
    } finally {
      this.cancelInlineEdit();
      this.isProcessing = false;
      this.processingMessage = '';
    }
  }
};
