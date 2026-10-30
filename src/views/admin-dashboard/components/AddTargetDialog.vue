<template>
  <div class="modal-overlay">
    <div class="modal">
      <h3>Add New Site Target</h3>
      <form @submit.prevent="saveDraft">

        <div class="form-group" style="margin-bottom: 16px;">
          <label for="target_site">Site</label>

          <select v-if="configMap.SITE && configMap.SITE.length > 0" id="target_site" v-model="addTargetForm.site" :disabled="isProcessing" required>
            <option value="" disabled>Select a site...</option>
            <option v-for="site in configMap.SITE" :key="site" :value="site">{{ site }}</option>
          </select>
          <input v-else id="target_site" v-model="addTargetForm.site" :disabled="isProcessing" placeholder="e.g. AMK" required />
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label for="target_year">Target Year</label>
          <input
            id="target_year"
            type="number"
            v-model="addTargetForm.target_year"
            :disabled="isProcessing"
            required
          />
        </div>

        <div class="form-group" style="margin-bottom: 24px;">
          <label for="expected_value">Expected Value ($)</label>
          <input
            id="expected_value"
            type="number"
            step="any"
            v-model="addTargetForm.expected_value"
            :disabled="isProcessing"
            placeholder="e.g. 500000"
            required
          />
        </div>

        <div class="modal-actions">
          <button type="submit" class="actions formButton" :disabled="isProcessing">
            {{ isProcessing ? 'Saving...' : 'Save Target' }}
          </button>
          <button type="button" class="actions cancel" @click="$emit('close')" :disabled="isProcessing">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AddTargetDialog',
  props: [
    'configMap',
    'form',
    'isProcessing'
  ],
  emits: [
    'close',
    'save'
  ],
  data() { return { addTargetForm: { ...this.form } }; },
  watch: { form: { deep: true, handler(value) { this.addTargetForm = { ...value }; } } },
  methods: {
    saveDraft() { this.$emit('save', { ...this.addTargetForm }); },
  },
};
</script>

<style scoped src="../styles/dialogs.css"></style>
<style scoped src="../styles/columns.css"></style>
