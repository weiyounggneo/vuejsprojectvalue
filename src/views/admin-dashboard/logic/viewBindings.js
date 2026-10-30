// Explicit props provided to each dashboard section.
export const computed = {
  userAccessTabProps() {
    return {
      availableRoles: this.availableRoles,
      editingCell: this.editingCell,
      isProcessing: this.isProcessing,
      userColumns: this.userColumns,
      users: this.users
    };
  },
  masterDataTabProps() {
    return {
      availableCategories: this.availableCategories,
      configColumns: this.masterDataColumns,
      filteredConfigOptions: this.filteredConfigOptions,
      isProcessing: this.isProcessing,
      selectedCategory: this.selectedCategory,
      siteUsageError: this.siteUsageError,
      siteUsageLoading: this.siteUsageLoading
    };
  },
  siteTargetsTabProps() {
    return {
      editingCell: this.editingCell,
      isProcessing: this.isProcessing,
      siteTargets: this.siteTargets,
      targetColumns: this.targetColumns
    };
  },
  projectColumnsTabProps() {
    return {
      formatProjectColumnSection: this.formatProjectColumnSection,
      formatProjectColumnType: this.formatProjectColumnType,
      isPageLoading: this.isPageLoading,
      isProcessing: this.isProcessing,
      isProjectColumnsLoading: this.isProjectColumnsLoading,
      projectColumnTableColumns: this.projectColumnTableColumns,
      projectColumns: this.projectColumns,
      projectColumnsError: this.projectColumnsError
    };
  },
  columnVisibilityTabProps() {
    return {
      columnVisibilityDirty: this.columnVisibilityDirty,
      columnVisibilityError: this.columnVisibilityError,
      columnVisibilityLoaded: this.columnVisibilityLoaded,
      columnVisibilityUpdatedAt: this.columnVisibilityUpdatedAt,
      columnVisibilityUpdatedBy: this.columnVisibilityUpdatedBy,
      isColumnVisibilityLoading: this.isColumnVisibilityLoading,
      isProcessing: this.isProcessing,
      visibilityGroups: this.visibilityGroups
    };
  },
  addUserDialogProps() {
    return {
      availableRoles: this.availableRoles,
      form: this.addUserForm,
      isProcessing: this.isProcessing
    };
  },
  addConfigDialogProps() {
    return {
      addingNewCategory: this.isAddingNewCategory,
      availableCategories: this.availableCategories,
      form: this.addConfigForm,
      isProcessing: this.isProcessing,
      selectedCategory: this.selectedCategory
    };
  },
  addTargetDialogProps() {
    return {
      configMap: this.configMap,
      form: this.addTargetForm,
      isProcessing: this.isProcessing
    };
  },
  projectColumnDialogProps() {
    return {
      availableCategories: this.availableCategories,
      configMap: this.configMap,
      formatProjectColumnType: this.formatProjectColumnType,
      isEditingProjectColumn: this.isEditingProjectColumn,
      isProcessing: this.isProcessing,
      isRetryingProjectColumn: this.isRetryingProjectColumn,
      projectColumnForm: this.projectColumnForm,
      projectColumnFormError: this.projectColumnFormError,
      projectColumnTypes: this.projectColumnTypes,
      projectColumnSections: this.projectColumnSections,
      selectedProjectColumnTypeDescription: this.selectedProjectColumnTypeDescription
    };
  }
};
