// Api logic for ManagerYearlyTracking. Functions run on the page instance.
export const computed = {
  apiBaseUrl() {
      return (process.env.VUE_APP_API_URL || '').trim().replace(/\/+$/, '');
    }
};

export const methods = {
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

  async readApiJson(response, fallback) {
      let data;
      try { data = await response.json(); } catch { throw new Error(fallback); }
      if (!response.ok) throw new Error(data?.message || fallback);
      return data;
    },

  async fetchConfigOptions() {
      try {
        const response = await this.apiFetch(`${this.apiBaseUrl}/api/config/options`);
        if (response.ok) {
          const data = await response.json();
          // Map the exact database category names (e.g. data.SITE) to the Vue state
          // An absent SITE category means no configured Sites. Do not revive the
          // old hardcoded list; project/target Sites are resolved separately.
          this.configOptions.SITE = Array.isArray(data.SITE) ? data.SITE : [];
          this.configOptions.PILLAR = data.PILLAR || ['Process & Equipment Intelligence', 'Smart Decision Hub', 'Vision Intelligence'];
          this.configOptions.STATUS = data.PROJECT_STATUS || ['Ongoing', 'Cancelled', 'Closed', 'On-Hold'];
          this.configOptions.PMOGATE = data.PMOGATE || ['G1', 'G2', 'G2.5', 'G3', 'Closure'];
          this.configOptions.DTIT = data.DTIT_INVOLVED || ['Yes', 'No'];
          this.configOptions.AITYPE = data.AI_AA_A_TYPE || ['AI', 'AA', 'A'];
          this.configOptions.FOAKNOAK = data.FOAK_NOAK || ['FOAK', 'NOAK'];
        }
      } catch (err) {
        console.error("Failed to load config options. Using safe default fallbacks.", err);
        this.configOptions.SITE = [];
        this.configOptions.PILLAR = ['Process & Equipment Intelligence', 'Smart Decision Hub', 'Vision Intelligence'];
        this.configOptions.STATUS = ['Ongoing', 'Cancelled', 'Closed', 'On-Hold'];
        this.configOptions.PMOGATE = ['G1', 'G2', 'G2.5', 'G3', 'Closure'];
        this.configOptions.DTIT = ['Yes', 'No'];
        this.configOptions.AITYPE = ['AI', 'AA', 'A'];
        this.configOptions.FOAKNOAK = ['FOAK', 'NOAK'];
      }
    },

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
          this.fetchColumnVisibility(),
          this.fetchPortfolioLayout()
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

  async refreshProjectData() {
      if (this.isProcessing || this.isPageLoading) return;
      this.cancelInlineEdit();
      await this.fetchTable();
    }
};
