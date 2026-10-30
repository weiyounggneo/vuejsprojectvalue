<template>
  <details v-if="choices.length" class="drill-access" @click.stop><summary>Explore contributing projects</summary>
    <label>Chart value<select v-model="index"><option v-for="(choice, i) in choices" :key="i" :value="i">{{ choice.label }}</option></select></label>
    <button type="button" @click.stop="$emit('open', choices[index]?.scope)">View projects</button>
  </details>
</template>

<script>
export default { name: 'DrilldownAccess', props: { choices: { type: Array, default: () => [] } }, emits: ['open'],
  data() { return { index: 0 }; }, watch: { choices() { if (this.index >= this.choices.length) this.index = 0; } } };
</script>

<style scoped>
.drill-access { font-size: 12px; color: #254669; margin-top: 10px; } summary { cursor: pointer; padding: 5px 0; } label { display: flex; flex-direction: column; gap: 5px; margin: 7px 0; } select { max-width: 100%; width: 100%; } button, select { padding: 7px 10px; border: 1px solid #bdccdc; border-radius: 5px; background: white; color: #254669; font: inherit; } button { cursor: pointer; } button:focus-visible, select:focus-visible, summary:focus-visible { outline: 3px solid #87baf2; outline-offset: 2px; }
</style>
