// Each dashboard instance receives fresh state.
import { FORM_SECTIONS } from '../../project-fields/sections';
export function createAdminState() {
  return {
    activeTab: 'users',
    isProcessing: false,
    isPageLoading: false,
    processingMessage: '',
    
    // Dialogs
    showSuccessDialog: false,
    successMessage: '',

    // General Editing State
    editingCell: { rowId: null, field: null },
    editValue: null,

    // User Management State
    users: [],
    availableRoles: ['pending', 'viewer', 'user', 'admin'],
    showAddUserModal: false,
    addUserForm: {
      username: '',
      access_right: 'viewer'
    },
    userColumns: [
      { label: 'Username', field: 'username' },
      { label: 'Access Right', field: 'access_right' },
      { label: 'Last Granted By', field: 'granted_by' },
      { label: 'Last Updated', field: 'updated_at' }
    ],

    // Configuration State
    configMap: {}, 
    availableCategories: [], 
    selectedCategory: '',
    showAddConfigModal: false,
    isAddingNewCategory: false,
    addConfigForm: {
      newCategory: '',
      value: ''
    },
    configColumns: [
      { label: 'Active Options', field: 'value' }
    ],
    siteUsageRows: [],
    siteUsageLoading: false,
    siteUsageError: '',

    // Site Targets State
    siteTargets: [],
    showAddTargetModal: false,
    addTargetForm: {
      site: '',
      target_year: new Date().getFullYear(),
      expected_value: null
    },
    targetColumns: [
      { label: 'Site', field: 'site', width: '200px' },
      { label: 'Target Year', field: 'target_year', type: 'number', width: '150px' },
      { label: 'Expected Value', field: 'expected_value', type: 'number', width: '200px' }
    ],

    // Added columns use the field-registry API from project-fields.js.
    visibilityColumns: [],
    visibilitySavedColumns: [],
    visibilitySearch: '',
    columnVisibilityRevision: 0,
    columnVisibilityLoaded: false,
    isColumnVisibilityLoading: false,
    columnVisibilityError: '',
    columnVisibilityUpdatedBy: '',
    columnVisibilityUpdatedAt: '',
    projectColumns: [],
    isProjectColumnsLoading: false,
    projectColumnsError: '',
    showProjectColumnModal: false,
    isRetryingProjectColumn: false,
    isEditingProjectColumn: false,
    projectColumnNewCategory: false,
    projectColumnCategoryName: '',
    projectColumnNameEdited: false,
    projectColumnFormError: '',
    projectColumnForm: { columnName: '', label: '', type: 'text', inputMode: 'free', configCategory: '', formSection: 'details' },
    projectColumnSections: FORM_SECTIONS,
    projectColumnTypes: [
      { value: 'text', label: 'Text', description: 'Names or short descriptions, up to 255 characters.' },
      { value: 'url', label: 'URL Link', description: 'A web address that users can open from the selected project metadata.' },
      { value: 'number', label: 'Number', description: 'A number with up to 14 integer digits and 4 decimal places.' },
      { value: 'date', label: 'Date', description: 'A calendar date, such as a review or approval date.' },
      { value: 'boolean', label: 'Yes / No', description: 'Yes, No, or an empty value.' }
    ],
    projectColumnTableColumns: [
      { label: 'Display Label', field: 'label' },
      { label: 'Column Name', field: 'columnName' },
      { label: 'Field Type', field: 'type' },
      { label: 'Form Section', field: 'formSection' },
      { label: 'Input', field: 'inputMode' },
      { label: 'Master Data Category', field: 'configCategory' },
      { label: 'Status', field: 'state' },
      { label: 'Added By', field: 'createdBy' },
      { label: 'Added On', field: 'createdAt' },
      { label: 'Actions', field: 'actions', sortable: false }
    ]
  };
}
