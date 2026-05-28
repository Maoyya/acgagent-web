import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/Login.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/auth/Register.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue') },
        { path: 'agents', name: 'Agents', component: () => import('@/views/agents/Index.vue'), meta: { roles: ['admin'] } },
        { path: 'workshop/:id', name: 'Workshop', component: () => import('@/views/workshop/Index.vue') },
        { path: 'assets', name: 'Assets', component: () => import('@/views/assets/Index.vue') },
        { path: 'profile', name: 'Profile', component: () => import('@/views/profile/Index.vue') },
        { path: 'system/users', name: 'Users', component: () => import('@/views/system/Users.vue'), meta: { roles: ['admin'] } },
        { path: 'system/roles', name: 'Roles', component: () => import('@/views/system/Roles.vue'), meta: { roles: ['admin'] } },
        { path: 'system/permissions', name: 'Permissions', component: () => import('@/views/system/Permissions.vue'), meta: { roles: ['admin'] } },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const token = localStorage.getItem('accessToken')
  if (to.meta.requiresAuth !== false && !token) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
  if ((to.name === 'Login' || to.name === 'Register') && token) {
    return { name: 'Dashboard' }
  }

  const requiredRoles = to.meta.roles as string[] | undefined
  if (requiredRoles && requiredRoles.length > 0) {
    const authStore = useAuthStore()
    if (!authStore.userInfo) {
      await authStore.fetchUserInfo()
    }
    const userRoles = authStore.userInfo?.roles || []
    const hasAccess = requiredRoles.some((r) => userRoles.includes(r))
    if (!hasAccess) {
      return { name: 'Dashboard' }
    }
  }
})

export default router
