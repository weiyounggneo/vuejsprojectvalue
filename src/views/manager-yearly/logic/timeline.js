// Timeline logic for ManagerYearlyTracking. Functions run on the page instance.
import { matchesFilter } from '../../portfolio-layout/aggregation';
import { globalFilterOptions } from '../../portfolio-layout/globalFilters';

const TIMELINE_SITE_FILTER = Object.freeze({ field: 'sites', label: 'Site', display: 'buttons' });

export const computed = {
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

  timelineSiteOptions() {
      // Use the same dynamic source as Portfolio Overview: project records plus
      // target-only sites. New sites therefore appear without a frontend edit.
      return globalFilterOptions(
        TIMELINE_SITE_FILTER,
        this.rows,
        this.portfolioLayoutCatalog,
        this.siteTargets,
        this.configOptions?.SITE || []
      ).filter(option => option.value).map(option => option.value);
    },

  filteredTimelineRows() {
      const selectedSite = String(this.timelineFilter.site || 'ALL').trim().toUpperCase();
      if (selectedSite === 'ALL') return this.rows;
      const rule = { field: 'sites', operator: 'in', values: [selectedSite] };
      return this.rows.filter(row => matchesFilter(row, rule, { type: 'text' }));
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
    }
};

export const methods = {
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
    }
};
