<template>
  <div class="modal-overlay">
    <div class="modal">
      <h3>Add New User</h3>
      <form @submit.prevent="saveDraft">
        <div class="form-group" style="margin-bottom: 16px;">
          <label for="new_username">Username (LDAP ID)</label>
          <input
            id="new_username"
            v-model="addUserForm.username"
            :disabled="isProcessing"
            placeholder="e.g. youngneo"
            v-focus
            required
          />
        </div>

        <div class="form-group" style="margin-bottom: 24px;">
          <label for="new_role">Access Right</label>
          <select id="new_role" v-model="addUserForm.access_right" :disabled="isProcessing" required>
            <option v-for="role in availableRoles" :key="role" :value="role">{{ role.toUpperCase() }}</option>
          </select>
        </div>

        <div class="modal-actions">
          <button type="submit" class="actions formButton" :disabled="isProcessing">
            {{ isProcessing ? 'Adding...' : 'Add User' }}
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
  name: 'AddUserDialog',
  props: [
    'availableRoles',
    'form',
    'isProcessing'
  ],
  emits: [
    'close',
    'save'
  ],
  directives: { focus: { mounted(el) { el.focus(); } } },
  data() { return { addUserForm: { ...this.form } }; },
  watch: { form: { deep: true, handler(value) { this.addUserForm = { ...value }; } } },
  methods: {
    saveDraft() { this.$emit('save', { ...this.addUserForm }); },
  },
};
</script>

<style scoped src="../styles/dialogs.css"></style>
<style scoped src="../styles/columns.css"></style>
