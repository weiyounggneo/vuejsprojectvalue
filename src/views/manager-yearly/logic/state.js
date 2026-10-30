// Each page instance receives its own state.
export function createTrackingState() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthString = `${currentYear}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    return {
      // NEW: Dynamic Configuration Options from Backend
      configOptions: {
        SITE: [],
        PILLAR: [],
        STATUS: ['Ongoing', 'Cancelled', 'Closed', 'On-Hold'],
        PMOGATE: ['G1', 'G2', 'G2.5', 'G3', 'Closure'],
        DTIT: ['Yes', 'No'],
        AITYPE: ['AI', 'AA', 'A'],
        FOAKNOAK: ['FOAK', 'NOAK']
      },

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

      // First savings year, used as the baseline when accumulating annual site targets.
      cardsStartYear: 2025,

      // Analytics global chart filter
      dashboardFilter: {
        selectedSite: 'ALL', values: {}
      },
      visualisationWidgets: null,
      visualisationGlobalFilters: null,
      visualisationCatalog: null,
      visualisationError: '',
      visualisationLayoutLoaded: false,
      isVisualisationLoading: false,

      // Project Timeline specific filters
      timelineFilter: {
        site: 'ALL'
      },

      // Global Page State
      activeTab: 'grid',
      accessRight: localStorage.getItem('access_right') || '',
      isProcessing: false,
      isPageLoading: false,
      processingMessage: '',
      showSuccessDialog: false,
      successMessage: '',

      // Dropdown UI state
      showProjectDropdown: false,

      // UI State
      showAddForm: false,
      showUpdateForm: false,
      showColumnManager: false,
      
      // NEW: Manual Snapshot Month Value
      manualSnapshotMonth: currentMonthString,

      // History UI State
      showHistoryModal: false,
      historyData: [],
      isFetchingHistory: false,

      showGlobalHistoryModal: false,
      globalHistoryData: [],
      isFetchingGlobalHistory: false,

      // Data State
      rows: [],
      tableLoadError: '',
      projectFields: [],
      projectFieldsLoaded: false,
      projectFieldsError: '',
      customFieldHistory: [],
      customFieldHistoryError: '',
      isFetchingCustomFieldHistory: false,
      formError: '',
      addProjectCreatedId: null,
      sessionEnded: false,
      siteTargets: [], 
      velocityData: [], 
      selectedRow: null,

      // Columns / Table refresh control
      tableColumns: [],
      hiddenColumns: {},
      columnPreferenceUser: '',
      columnPreferenceError: '',
      adminHiddenFields: [],
      columnVisibilityLoaded: false,
      columnVisibilityError: '',
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
      actualDateFormBaseline: {},

      // Static chart colors
      pieColors: ['#1f5fa8', '#28a745', '#ffd600', '#d93025', '#17a2b8', '#6c757d', '#6f42c1', '#fd7e14']
    };
  }
