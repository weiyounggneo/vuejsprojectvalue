// Portfolio logic for ManagerYearlyTracking. Functions run on the page instance.
import { portfolioRows, matchesFilter } from '../../portfolio-layout/aggregation';

export const computed = {
  eligiblePortfolioRows() {
      return portfolioRows(this.rows);
    },

  portfolioSiteOptions() {
      const sites = new Set();
      this.eligiblePortfolioRows.forEach(row => {
        String(row.sites || '').split(',').forEach(value => {
          const site = value.trim().toUpperCase();
          if (site && site !== 'ALL') sites.add(site);
        });
      });
      return [...sites].sort();
    },

  cardYears() {
      return [this.currentYear];
    },

  cardsRangeLabel() {
      return String(this.currentYear);
    },

  filteredDashboardRows() {
      if (Array.isArray(this.globalProjectFilters)) {
        return this.eligiblePortfolioRows.filter(row => this.globalProjectFilters.every(rule => matchesFilter(row, rule,
          this.portfolioLayoutCatalog.groups.find(group => group.value === rule.field))));
      }
      const selectedSite = String(this.dashboardFilter.selectedSite || 'ALL').trim().toUpperCase();
      if (selectedSite === 'ALL') {
        return this.eligiblePortfolioRows;
      }
      const rule = { field: 'sites', operator: 'in', values: [selectedSite] };
      return this.eligiblePortfolioRows.filter(row => matchesFilter(row, rule, { type: 'text' }));
    },

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
};

export const methods = {
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
      const selectedSite = this.portfolioTargetRows ? 'ALL' : String(this.dashboardFilter.selectedSite || 'ALL').trim().toUpperCase();
      return (this.portfolioTargetRows || this.siteTargets).reduce((sum, target) => {
        const targetYear = Number(target.target_year);
        const matchesYear = cumulative
          ? targetYear >= this.cardsStartYear && targetYear <= year
          : targetYear === year;
        const matchesSite = selectedSite === 'ALL' || String(target.site || '').trim().toUpperCase() === selectedSite;
        const value = Number(target.expected_value);
        return matchesYear && matchesSite && Number.isFinite(value) ? sum + value : sum;
      }, 0);
    },

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
    }
};
