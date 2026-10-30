<template>
  <button type="button" class="chart-move-handle" :disabled="disabled"
    :aria-label="'Drag to move ' + widget.title" title="Drag to reorder this item"
    @pointerdown.stop.prevent="start" @pointermove.stop="move" @pointerup.stop="drop"
    @pointercancel.stop="cancel" @lostpointercapture="cancel" @keydown.esc.stop="cancel">
    <span aria-hidden="true">⠿</span><span>Move</span>
  </button>
</template>

<script>
export default {
  name: 'ChartMoveHandle',
  props: ['widget', 'disabled', 'gridElement'],
  emits: ['select', 'start', 'hover', 'reorder', 'end'],
  data() { return { drag: null }; },
  watch: { disabled(value) { if (value) this.cancel(); } },
  beforeUnmount() { this.cancel(); },
  methods: {
    start(event) {
      if (this.disabled || this.drag || (event.button !== undefined && event.button !== 0)) return;
      this.$emit('select', this.widget.id);
      this.pointerTarget = event.currentTarget; this.pointerTarget.focus?.();
      try { this.pointerTarget.setPointerCapture(event.pointerId); } catch { this.pointerTarget = null; return; }
      this.drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, target: null };
      this.$emit('start', this.widget.id);
      this.scrollLoop();
    },
    updateTarget() {
      if (!this.drag) return;
      const grid = this.gridElement();
      const hit = document.elementFromPoint?.(this.drag.x, this.drag.y);
      const tile = hit?.closest?.('[data-preview-widget-id]');
      let target = null;
      if (tile && grid?.contains(tile)) {
        const targetId = tile.getAttribute('data-preview-widget-id');
        if (targetId !== this.widget.id) {
          const rect = tile.getBoundingClientRect();
          const dx = (this.drag.x - rect.left - rect.width / 2) / Math.max(rect.width, 1);
          const dy = (this.drag.y - rect.top - rect.height / 2) / Math.max(rect.height, 1);
          target = { id: this.widget.id, targetId, placement: (Math.abs(dy) > Math.abs(dx) ? dy : dx) < 0 ? 'before' : 'after' };
        }
      } else if (hit?.closest?.('[data-drop-end]') && grid?.contains(hit)) target = { id: this.widget.id, placement: 'end' };
      this.drag.target = target; this.$emit('hover', target);
    },
    move(event) {
      if (!this.drag || event.pointerId !== this.drag.pointerId) return;
      this.drag.x = event.clientX; this.drag.y = event.clientY; this.updateTarget();
    },
    scrollLoop() {
      if (!this.drag || typeof window === 'undefined' || !window.requestAnimationFrame) return;
      const tick = () => {
        if (!this.drag) return;
        const y = this.drag.y, edge = 60;
        const amount = y < edge ? -16 : y > window.innerHeight - edge ? 16 : 0;
        if (amount) { window.scrollBy(0, amount); this.updateTarget(); }
        this.scrollFrame = window.requestAnimationFrame(tick);
      };
      this.scrollFrame = window.requestAnimationFrame(tick);
    },
    drop(event) {
      if (!this.drag || event.pointerId !== this.drag.pointerId) return;
      this.drag.x = event.clientX; this.drag.y = event.clientY; this.updateTarget();
      if (this.drag.target) this.$emit('reorder', this.drag.target);
      this.finish();
    },
    cancel() { this.finish(); },
    finish() {
      if (!this.drag) return;
      const pointerId = this.drag.pointerId; this.drag = null;
      if (typeof window !== 'undefined' && this.scrollFrame) window.cancelAnimationFrame(this.scrollFrame);
      this.scrollFrame = null;
      try { this.pointerTarget?.releasePointerCapture(pointerId); } catch { /* Capture may already be released. */ }
      this.pointerTarget = null;
      this.$emit('hover', null); this.$emit('end', this.widget.id);
    }
  }
};
</script>

<style scoped>
.chart-move-handle { display: flex; align-items: center; gap: 5px; flex: 0 0 auto; padding: 5px 8px; border: 1px solid #cdd7e2; border-radius: 5px; background: #fff; color: #536378; font: inherit; font-size: 12px; cursor: grab; touch-action: none; }
.chart-move-handle:active { cursor: grabbing; }
.chart-move-handle:disabled { opacity: .4; cursor: default; }
@media (pointer: coarse) { .chart-move-handle { min-height: 44px; } }
</style>
