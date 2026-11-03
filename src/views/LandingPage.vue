<template>
  <div class="landing-page">
    <button class="logout-btn" @click="logout">Logout</button>

    <div class="login-container">
      <div class="login-left">
        <div class="logo-title">
          <img src="@/assets/st-logo.png" alt="ST Logo" class="logo" />
          <span class="title">AI@BEM Portal</span>
        </div>

        <div class="center-icon-wrapper">
          <img
            src="@/assets/Transparent_WHITE.png"
            alt="MDS — Manufacturing Data Science"
            class="center-icon"
          />
        </div>
      </div>

      <div class="login-right">
        <div class="landing-form">
          <h2>Welcome{{ username ? `, ${username}` : '' }}</h2>

          <!-- IF THEY ARE APPROVED (Viewer, User, Admin) -->
          <div v-if="hasAccess" style="width: 100%;">
            <p class="subtitle">Open AI@BEM Portal to manage projects and explore portfolio performance.</p>

            <button class="landing-btn" @click="goToManagerDashboard">
              AI@BEM Portal
            </button>

            <!-- ONLY ADMINS SEE THE CONFIG/USER MANAGEMENT PAGE -->
            <button
              v-if="isAdmin"
              class="landing-btn"
              @click="goToAdminDashboard"
            >
              System Administration
            </button>
          </div>

          <!-- IF THEY ARE PENDING -->
          <div v-else class="pending-notice">
            <p>Your account is currently <strong>Pending</strong>.</p>
            <p>Please contact your System Administrator to request 'Viewer' or 'User' privileges to access AI@BEM Portal.</p>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LandingPage',
  computed: {
    role() {
      return localStorage.getItem('access_right') || 'pending';
    },
    hasAccess() {
      // Only these three roles can click into the apps
      return ['viewer', 'user', 'admin'].includes(this.role);
    },
    isAdmin() {
      return this.role === 'admin';
    },
    username() {
      return localStorage.getItem('username') || '';
    }
  },
  methods: {
    goToManagerDashboard() {
      this.$router.push('/manager-dashboard');
    },
    goToAdminDashboard() {
      this.$router.push('/admin');
    },
    logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('access_right');
      this.$router.push('/login');
    }
  }
};
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  font-family: Arial, Helvetica, sans-serif;
}

.logout-btn {
  position: absolute;
  top: 24px;
  right: 36px;
  background: none;
  color: #07254a;
  border: 2px solid #07254a;
  font-size: 1.1rem;
  cursor: pointer;
  font-weight: 600;
  border-radius: 8px;
  padding: 8px 24px;
  transition: background 0.2s, color 0.2s;
  z-index: 10;
}

.logout-btn:hover {
  background: #07254a;
  color: #ffd600;
}

.login-container {
  display: flex;
  min-height: 100vh;
  border: 1px solid #1a3353;
}

.login-left {
  background: #07254a;
  color: #fff;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 40px;
}

.logo-title {
  display: flex;
  align-items: center;
}

.logo {
  width: 120px;
  margin-bottom: 15px;
  margin-right: 20px;
  margin-top: 15px;
}

.title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #fff;
  white-space: nowrap;
}

.center-icon-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.center-icon {
  max-width: 500px;
  max-height: 500px;
  width: 100%;
  height: auto;
}

.login-right {
  flex: 1;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.landing-form {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.landing-form h2 {
  color: #07254a;
  font-weight: bold;
  margin-bottom: 12px;
  text-align: center;
  font-size: 2rem;
}

.subtitle {
  color: #4b5b70;
  margin-bottom: 24px;
  font-size: 1rem;
  text-align: center;
}

.landing-btn {
  margin-top: 16px;
  width: 100%;
  padding: 14px 0;
  background: #ffd600;
  color: #07254a;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.landing-btn:hover {
  background: #ffea00;
  transform: translateY(-1px);
}

/* NEW PENDING NOTICE CSS */
.pending-notice {
  margin-top: 24px;
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
  padding: 16px 24px;
  border-radius: 8px;
  text-align: center;
  line-height: 1.6;
  font-size: 0.95rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}
.pending-notice p {
  margin: 0 0 8px 0;
}
.pending-notice p:last-child {
  margin-bottom: 0;
}
</style>