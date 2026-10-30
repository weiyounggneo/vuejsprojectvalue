const clone = value => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a.widgets) === JSON.stringify(b.widgets) && JSON.stringify(a.globalFilters) === JSON.stringify(b.globalFilters);

export const computed = {
  canUndo() { return this.loaded && (this.undoStack.length > 0 || (this.historyBaseline && !same(this.historyBaseline, this.historySnapshot()))); },
  canRedo() { return this.loaded && this.redoStack.length > 0 && (!this.historyBaseline || same(this.historyBaseline, this.historySnapshot())); },
  gestureActive() { return !!this.resizingId || !!this.reorderingId; }
};

export const watch = {
  widgets: { deep: true, flush: 'sync', handler() { this.recordDraftChange(); } },
  globalFilters: { deep: true, flush: 'sync', handler() { this.recordDraftChange(); } }
};

export const methods = {
  historySnapshot() { return { widgets: clone(this.widgets), globalFilters: clone(this.globalFilters), selectedId: this.selectedId }; },
  resetDraftHistory() {
    this.tableAdjustment = null;
    this.undoStack = []; this.redoStack = []; this.historyDepth = 0; this.historyField = null;
    this.historyBaseline = this.historySnapshot();
  },
  recordDraftChange() {
    if (!this.loaded || this.historyApplying || this.historyDepth || !this.historyBaseline) return;
    const next = this.historySnapshot();
    if (same(this.historyBaseline, next)) { this.historyBaseline.selectedId = this.selectedId; return; }
    this.tableAdjustment = null;
    this.undoStack.push(clone(this.historyBaseline));
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack = []; this.historyBaseline = next;
  },
  beginDraftAction() { if (!this.historyDepth) this.recordDraftChange(); this.historyDepth += 1; },
  endDraftAction() { this.historyDepth = Math.max(0, this.historyDepth - 1); if (!this.historyDepth) this.recordDraftChange(); },
  changeDraft(action) {
    this.endFieldEdit(); this.beginDraftAction();
    try { action(); } finally { this.endDraftAction(); }
  },
  beginFieldEdit(event) {
    const target = event.target;
    if (this.locked || this.gestureActive || target?.tagName !== 'INPUT' || !['text', 'number', 'range', ''].includes(target.type)) return;
    if (this.historyField === target) return;
    this.endFieldEdit(); this.historyField = target; this.beginDraftAction();
  },
  endFieldEdit() { if (this.historyField) { this.historyField = null; this.endDraftAction(); } },
  restoreHistory(snapshot) {
    this.tableAdjustment = null;
    this.historyApplying = true;
    try {
      this.widgets = clone(snapshot.widgets);
      this.globalFilters = clone(snapshot.globalFilters || this.globalFilters);
      this.selectedId = this.widgets.some(w => w.id === snapshot.selectedId) ? snapshot.selectedId : this.widgets[0]?.id || '';
      this.historyBaseline = this.historySnapshot();
      this.error = ''; this.message = '';
    } finally { this.historyApplying = false; }
  },
  undo() {
    if (this.locked || this.gestureActive || !this.loaded) return;
    this.endFieldEdit(); this.recordDraftChange();
    const previous = this.undoStack.pop(); if (!previous) return;
    this.redoStack.push(this.historySnapshot()); this.restoreHistory(previous);
  },
  redo() {
    if (this.locked || this.gestureActive || !this.loaded) return;
    this.endFieldEdit(); this.recordDraftChange();
    const next = this.redoStack.pop(); if (!next) return;
    this.undoStack.push(this.historySnapshot()); this.restoreHistory(next);
  }
};
