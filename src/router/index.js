import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '@/components/Login.vue';
import LandingPage from '@/views/LandingPage.vue';
import ManagerYearlyTracking from '@/views/ManagerYearlyTracking.vue';
import AdminDashboard from '@/views/AdminDashboard.vue';

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: { public: true }
  },
  {
    path: '/landing',
    name: 'Landing',
    component: LandingPage,
    // Just requires a token. 'pending' users are allowed to land here.
    meta: { requiresAuth: true } 
  },
  {
    path: '/manager-dashboard',
    name: 'ManagerDashboard',
    component: ManagerYearlyTracking,
    // requiresAccess blocks 'pending' users
    meta: { requiresAuth: true, requiresAccess: true } 
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard,
    // Strictly locked to Admins only
    meta: { requiresAuth: true, requiresAdmin: true } 
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// THE BOUNCER (Navigation Guard)
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const accessRight = localStorage.getItem('access_right'); // 'pending', 'viewer', 'user', 'admin'

  // Allow everyone into the login page
  if (to.meta.public) {
    return next();
  }

  // Kick unauthenticated users back to login
  if (to.meta.requiresAuth && !token) {
    return next('/login');
  }

  // Block 'pending' users from accessing core application pages
  if (to.meta.requiresAccess) {
    const allowedRoles = ['viewer', 'user', 'admin'];
    if (!allowedRoles.includes(accessRight)) {
      alert('Access Denied: Your account is currently pending approval.');
      return next('/landing');
    }
  }

  // Block non-admins from the Admin Dashboard
  if (to.meta.requiresAdmin && accessRight !== 'admin') {
    alert('Access Denied: Administrator privileges required.');
    return next('/landing');
  }

  // If they pass all checks, let them through
  return next();
});

export default router;