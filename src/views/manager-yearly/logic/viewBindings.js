// Explicit props supplied to each page section.
export const computed = {
    gridSectionProps() {
      return {
        canEditField: this.canEditField,
        columnVisibilityError: this.columnVisibilityError,
        columnVisibilityLoaded: this.columnVisibilityLoaded,
        currentYear: this.currentYear,
        defaultTimelineEnd: this.defaultTimelineEnd,
        defaultTimelineStart: this.defaultTimelineStart,
        editingCell: this.editingCell,
        filteredProjectNames: this.filteredProjectNames,
        filteredRows: this.filteredRows,
        filters: this.filters,
        formatCustomField: this.formatCustomField,
        isAdmin: this.isAdmin,
        isEditor: this.isEditor,
        isPageLoading: this.isPageLoading,
        isProcessing: this.isProcessing,
        projectFields: this.projectFields,
        projectFieldsError: this.projectFieldsError,
        rowClassFn: this.rowClassFn,
        selectedRow: this.selectedRow,
        showProjectDropdown: this.showProjectDropdown,
        tableColumns: this.tableColumns,
        tableLoadError: this.tableLoadError,
        tableViewVersion: this.tableViewVersion,
        timelineConfig: this.timelineConfig,
        timelineWindowLabel: this.timelineWindowLabel,
        trackingYears: this.trackingYears,
        uniquePillars: this.uniquePillars,
        uniqueSites: this.uniqueSites
      };
    },
    portfolioOverviewProps() {
      return {
        eligiblePortfolioRows: this.eligiblePortfolioRows,
        layoutWidgets: this.portfolioLayoutWidgets,
        layoutCatalog: this.portfolioLayoutCatalog,
        layoutError: this.visualisationError,
        layoutLoading: this.isVisualisationLoading,
        globalFilters: this.portfolioGlobalFilters,
        globalValues: this.portfolioGlobalValues,
        filterSiteTargets: this.siteTargets,
        masterSites: this.configOptions?.SITE || [],
        filteredDashboardRows: this.filteredDashboardRows,
        siteTargets: this.portfolioTargetRows,
        trackingYears: this.trackingYears,
        cardsStartYear: this.cardsStartYear,
        pieColors: this.pieColors,
        analyticsSiteOptions: this.portfolioSiteOptions,
        annualizedTrendOptions: this.annualizedTrendOptions,
        annualizedTrendSeries: this.annualizedTrendSeries,
        cardsRangeLabel: this.cardsRangeLabel,
        cumulativeTrendOptions: this.cumulativeTrendOptions,
        cumulativeTrendSeries: this.cumulativeTrendSeries,
        currentYear: this.currentYear,
        dashboardFilter: { selectedSite: 'ALL' },
        dtitPieOptions: this.dtitPieOptions,
        dtitPieSeries: this.dtitPieSeries,
        executiveCardsData: this.executiveCardsData,
        foakPieOptions: this.foakPieOptions,
        foakPieSeries: this.foakPieSeries,
        kpiPieOptions: this.kpiPieOptions,
        kpiPieSeries: this.kpiPieSeries,
        pillarPieOptions: this.pillarPieOptions,
        pillarPieSeries: this.pillarPieSeries,
        pillarSummaryData: this.pillarSummaryData,
        rows: this.rows,
        yearlySummaryData: this.yearlySummaryData
      };
    },
    projectTimelineProps() {
      return {
        analyticsSiteOptions: this.timelineSiteOptions,
        editingCell: this.editingCell,
        filteredTimelineRows: this.filteredTimelineRows,
        ganttChartHeight: this.ganttChartHeight,
        ganttChartOptions: this.ganttChartOptions,
        ganttChartSeries: this.ganttChartSeries,
        isEditor: this.isEditor,
        rows: this.rows,
        timelineFilter: this.timelineFilter,
        velocityData: this.velocityData
      };
    },
    projectFormDialogProps() {
      return {
        addProjectCreatedId: this.addProjectCreatedId,
        columnVisibilityError: this.columnVisibilityError,
        columnVisibilityLoaded: this.columnVisibilityLoaded,
        configOptions: this.configOptions,
        customFieldHelp: this.customFieldHelp,
        form: this.activeForm,
        formError: this.formError,
        hasVisibleKpiFields: this.hasVisibleKpiFields,
        hasVisibleMilestoneFields: this.hasVisibleMilestoneFields,
        hasVisibleYearlyFields: this.hasVisibleYearlyFields,
        isEditor: this.isEditor,
        isFieldShown: this.isFieldShown,
        isProcessing: this.isProcessing,
        projectFieldsError: this.projectFieldsError,
        showAddForm: this.showAddForm,
        showUpdateForm: this.showUpdateForm,
        visibleProjectFields: this.visibleProjectFields,
        visibleTrackingYears: this.visibleTrackingYears
      };
    },
    projectHistoryDialogProps() {
      return {
        customFieldHistoryError: this.customFieldHistoryError,
        customFieldHistoryRows: this.customFieldHistoryRows,
        formatCustomField: this.formatCustomField,
        historyData: this.historyData,
        isEditor: this.isEditor,
        isFetchingCustomFieldHistory: this.isFetchingCustomFieldHistory,
        isFetchingHistory: this.isFetchingHistory,
        selectedRow: this.selectedRow
      };
    },
    globalHistoryDialogProps() {
      return {
        globalHistoryColumns: this.globalHistoryColumns,
        globalHistoryData: this.globalHistoryData,
        globalRowClassFn: this.globalRowClassFn,
        isEditor: this.isEditor,
        isFetchingGlobalHistory: this.isFetchingGlobalHistory,
        tableViewVersion: this.tableViewVersion
      };
    },
    columnManagerDialogProps() {
      return {
        columnPreferenceError: this.columnPreferenceError,
        isFieldShown: this.isFieldShown,
        tableColumns: this.tableColumns
      };
    }
};
