// Users logic for AdminDashboard. Functions run on the page instance.
export const methods = {
  async fetchUsers() {
    try {
      const res = await this.apiFetch(`${this.apiBaseUrl}/api/admin/users`);
      if (!res.ok) throw new Error('Failed to fetch users');
      this.users = await res.json();
    } catch (err) {
      console.error(err);
    }
  },

  openAddUserModal() {
    this.addUserForm.username = '';
    this.addUserForm.access_right = 'viewer';
    this.showAddUserModal = true;
  },

  async submitAddUser() {
    const newUsername = this.addUserForm.username.trim();
    if (!newUsername) return alert('Username cannot be empty.');

    this.isProcessing = true;
    this.processingMessage = `Adding ${newUsername}...`;
    
    try {
      const res = await this.apiFetch(`${this.apiBaseUrl}/api/admin/users/${encodeURIComponent(newUsername)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_right: this.addUserForm.access_right })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to add user');
      }

      this.successMessage = `Successfully added ${newUsername} with ${this.addUserForm.access_right.toUpperCase()} access.`;
      this.showAddUserModal = false;
      this.showSuccessDialog = true;
      await this.fetchUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      this.isProcessing = false;
      this.processingMessage = '';
    }
  },

  async saveUserRole(row) {
    if (this.isProcessing) return;
    const field = this.editingCell.field;
    if (!field || field !== 'access_right') return;

    const newRole = this.editValue;
    if (newRole === row.access_right) {
      this.cancelInlineEdit();
      return;
    }

    this.isProcessing = true;
    this.processingMessage = `Updating role for ${row.username}...`;
    
    try {
      const res = await this.apiFetch(`${this.apiBaseUrl}/api/admin/users/${encodeURIComponent(row.username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_right: newRole })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to update user role');
      }

      this.successMessage = `Successfully updated ${row.username} to ${newRole.toUpperCase()}.`;
      this.showSuccessDialog = true;
      await this.fetchUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      this.cancelInlineEdit();
      this.isProcessing = false;
      this.processingMessage = '';
    }
  }
};
