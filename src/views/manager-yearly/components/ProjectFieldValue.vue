<template>
  <a v-if="href" :href="href" target="_blank" rel="noopener noreferrer"
    class="project-url-link" title="Open link in a new tab">{{ displayValue }}</a>
  <span v-else>{{ displayValue }}</span>
</template>

<script>
import { projectUrl } from '../../project-fields/links';

export default {
  name: 'ProjectFieldValue',
  props: ['field', 'value', 'formatCustomField'],
  computed: {
    href() { return ['url', 'text'].includes(this.field.type) ? projectUrl(this.value) : ''; },
    displayValue() { return this.formatCustomField(this.field.columnName, this.value); }
  }
};
</script>

<style scoped>
.project-url-link { color: #1f5fa8; text-decoration: underline; overflow-wrap: anywhere; }
.project-url-link:hover { color: #07254a; }
.project-url-link:focus-visible { outline: 2px solid #1f5fa8; outline-offset: 2px; }
</style>
