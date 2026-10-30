// Forms logic for ManagerYearlyTracking. Functions run on the page instance.
import { ACTUAL_DATE_FIELDS } from './fields.constants';

export const computed = {
  activeForm() {
      return this.showAddForm ? this.addForm : this.updateForm;
    }
};

export const methods = {
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
};
