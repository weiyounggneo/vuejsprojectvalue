// Page logic for AdminDashboard. Functions run on the page instance.
export const computed = {
  isAdmin() {
    return localStorage.getItem('access_right') === 'admin';
  }
};

export const methods = {
  goHome() {
    if (this.isProcessing || this.isPageLoading) return;
    this.$router.push('/landing');
  },

  goBack() {
    if (this.isProcessing || this.isPageLoading) return;
    this.$router.push('/landing');
  },

  logout() {
    if (this.isProcessing || this.isPageLoading) return;
    localStorage.clear();
    this.$router.push('/login');
  }
};
