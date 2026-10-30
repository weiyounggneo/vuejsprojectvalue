// Page logic for ManagerYearlyTracking. Functions run on the page instance.
export const computed = {
  isAdmin() {
      return this.accessRight === 'admin';
    },

  isEditor() {
      return this.accessRight === 'admin' || this.accessRight === 'user';
    }
};

export const methods = {
  goHome() {
      this.$router.push('/landing');
    },

  goBack() {
      this.$router.push('/landing');
    },

  logout() {
      this.accessRight = '';
      localStorage.removeItem('token');
      localStorage.removeItem('access_right');
      this.$router.push('/login');
    }
};
