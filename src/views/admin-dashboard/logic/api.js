// Api logic for AdminDashboard. Functions run on the page instance.
export const computed = {
  apiBaseUrl() {
    return (process.env.VUE_APP_API_URL || '').trim().replace(/\/+$/, '');
  }
};

export const methods = {
  async apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, options);

    if (response.status === 401 || response.status === 403) {
      alert('Session expired or unauthorized. Returning to login.');
      localStorage.clear();
      this.$router.push('/login');
      const error = new Error('Unauthorized');
      error.isUnauthorized = true;
      throw error;
    }
    return response;
  }
};
