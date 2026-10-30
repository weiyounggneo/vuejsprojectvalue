// Editing logic for AdminDashboard. Functions run on the page instance.
export const methods = {
  startInlineEdit(rowId, field, currentValue) {
    if (this.isProcessing || this.isPageLoading) return;
    this.editingCell = { rowId, field };
    this.editValue = currentValue;
  },

  cancelInlineEdit() {
    this.editingCell = { rowId: null, field: null };
    this.editValue = null;
  }
};
