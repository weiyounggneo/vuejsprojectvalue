<template>
  <button type="button" class="chart-resize-handle" :class="{ dragging: !!drag }" :disabled="disabled"
    :aria-label="'Resize ' + widget.title + '. Drag or use arrow keys.'"
    :title="hasHeight ? 'Drag to change width and chart height' : 'Drag to change width; height fits the content'"
    @pointerdown.stop.prevent="start" @pointermove.stop="resize" @pointerup.stop="finish"
    @pointercancel.stop="cancel" @lostpointercapture="finish" @keydown="resizeWithKeyboard">
    <span aria-hidden="true">↘</span>
  </button>
</template>

<script>
import { WIDTH_CHOICES, HEIGHT_CHOICES, hasChartHeight, resizedDimensions } from './layoutSizing';

export default {
  name: 'ChartResizeHandle',
  props: ['widget', 'disabled', 'gridMetrics'],
  emits: ['select', 'resize', 'start', 'end'],
  data() { return { drag: null }; },
  computed: { hasHeight() { return hasChartHeight(this.widget); } },
  watch: { disabled(value) { if (value) this.cancel(); } },
  beforeUnmount() { this.finish(); },
  methods: {
    start(event) {
      if (this.disabled || this.drag || (event.button !== undefined && event.button !== 0)) return;
      const metrics = this.gridMetrics();
      if (!metrics || !Number.isFinite(metrics.width) || metrics.width <= 0) return;
      this.$emit('select', this.widget.id);
      event.currentTarget.focus?.();
      this.drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY,
        width: this.widget.width, height: this.widget.height, gridWidth: metrics.width, gap: metrics.gap ?? 20 };
      this.resizeTarget = event.currentTarget;
      try { this.resizeTarget.setPointerCapture(event.pointerId); } catch { this.drag = null; this.resizeTarget = null; return; }
      this.$emit('start', this.widget.id);
    },
    resize(event) {
      if (!this.drag || this.disabled || event.pointerId !== this.drag.pointerId) return;
      const size = resizedDimensions({ ...this.widget, width: this.drag.width, height: this.drag.height },
        event.clientX - this.drag.x, event.clientY - this.drag.y, this.drag.gridWidth, this.drag.gap);
      if (size.width !== this.widget.width || size.height !== this.widget.height) this.$emit('resize', { id: this.widget.id, ...size });
    },
    finish() {
      if (!this.drag) return;
      const pointerId = this.drag.pointerId;
      this.drag = null;
      try { this.resizeTarget?.releasePointerCapture(pointerId); } catch { /* Capture can already be released. */ }
      this.resizeTarget = null;
      this.$emit('end', this.widget.id);
    },
    cancel() {
      if (!this.drag) return;
      this.$emit('resize', { id: this.widget.id, width: this.drag.width, height: this.drag.height });
      this.finish();
    },
    resizeWithKeyboard(event) {
      if (this.disabled) return;
      if (event.key === 'Escape') { this.cancel(); return; }
      const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.key);
      const vertical = ['ArrowUp', 'ArrowDown'].includes(event.key);
      if (!horizontal && !vertical) return;
      if (vertical && !this.hasHeight) return;
      event.preventDefault(); event.stopPropagation();
      const choices = horizontal ? WIDTH_CHOICES.map(c => c.value) : HEIGHT_CHOICES;
      const oldValue = horizontal ? this.widget.width : this.widget.height;
      const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
      const index = Math.max(0, Math.min(choices.length - 1, choices.indexOf(oldValue) + direction));
      this.$emit('select', this.widget.id);
      this.$emit('resize', { id: this.widget.id, width: horizontal ? choices[index] : this.widget.width,
        height: vertical ? choices[index] : this.widget.height });
    }
  }
};
</script>

<style scoped>
.chart-resize-handle { position: absolute; right: 4px; bottom: 4px; width: 32px; height: 32px; padding: 0; border: 1px solid #dce3ec; border-radius: 5px; background: #fff; color: #536378; font-size: 22px; line-height: 1; cursor: nwse-resize; touch-action: none; z-index: 2; }
.chart-resize-handle:hover, .chart-resize-handle.dragging { color: #007fa3; border-color: #007fa3; background: #eef9fc; }
.chart-resize-handle:disabled { opacity: .4; cursor: default; }
@media (pointer: coarse) { .chart-resize-handle { width: 44px; height: 44px; } }
</style>
