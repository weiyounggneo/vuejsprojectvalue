<template>
  <div class="timeline-window-card">
      <div class="timeline-window-header">
        <div>
          <h3 class="timeline-window-title">Timeline Window</h3>
          <p class="timeline-window-help">
            Adjust the visible timeline using the controls below.
          </p>
        </div>

        <div class="timeline-window-summary">
          <strong>{{ timelineWindowLabel }}</strong>
          <span>{{ trackingYears.length }} year(s) visible</span>
        </div>
      </div>

      <div class="timeline-window-controls">
        <div class="timeline-control">
          <div class="timeline-control-row">
            <label for="timelineStart">Start Year</label>
            <input
              id="timelineStart"
              type="number"
              :min="timelineConfig.minYear"
              :max="timelineConfig.maxYear"
              :value="timelineConfig.startYear"
              @change="$emit('year-change', { field: 'start', value: $event.target.value })"
            />
          </div>
          <input
            type="range"
            :min="timelineConfig.minYear"
            :max="timelineConfig.maxYear"
            step="1"
            :value="timelineConfig.startYear"
            @input="$emit('year-change', { field: 'start', value: $event.target.value })"
          />
        </div>

        <div class="timeline-control">
          <div class="timeline-control-row">
            <label for="timelineEnd">End Year</label>
            <input
              id="timelineEnd"
              type="number"
              :min="timelineConfig.minYear"
              :max="timelineConfig.maxYear"
              :value="timelineConfig.endYear"
              @change="$emit('year-change', { field: 'end', value: $event.target.value })"
            />
          </div>
          <input
            type="range"
            :min="timelineConfig.minYear"
            :max="timelineConfig.maxYear"
            step="1"
            :value="timelineConfig.endYear"
            @input="$emit('year-change', { field: 'end', value: $event.target.value })"
          />
        </div>

        <div class="timeline-shortcuts">
          <button
            type="button"
            class="timeline-shortcut-btn"
            @click="$emit('apply-window', defaultTimelineStart, defaultTimelineEnd)"
          >
            Default (N-1 to N+3)
          </button>
          <button
            type="button"
            class="timeline-shortcut-btn"
            @click="$emit('apply-window', currentYear, currentYear + 5)"
          >
            Current + 5
          </button>
          <button
            type="button"
            class="timeline-shortcut-btn"
            @click="$emit('apply-window', timelineConfig.minYear, timelineConfig.maxYear)"
          >
            All Years
          </button>
        </div>
      </div>

      <div class="timeline-window-footer">
        Visible years:
        <span v-for="year in trackingYears" :key="year" class="year-chip">{{ year }}</span>
      </div>
    </div>
</template>

<script>


export default {
  name: 'TimelineWindow',
  props: [
    'currentYear',
    'defaultTimelineEnd',
    'defaultTimelineStart',
    'timelineConfig',
    'timelineWindowLabel',
    'trackingYears'
  ],
  emits: [
    'apply-window',
    'year-change'
  ],
};
</script>

<style scoped src="../styles/window.css"></style>
<style scoped src="../styles/responsive.css"></style>
