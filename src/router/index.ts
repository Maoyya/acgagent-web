import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { isTokenExpired } from '@/utils/jwt'

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
        { path: 'prompts', name: 'Prompts', component: () => import('@/views/prompts/Index.vue') },
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
  // token 有效：既存在又未过期。过期判定依据 JWT 的 exp，仅用于提前拦截
  const tokenValid = !!token && !isTokenExpired(token)

  // 需要鉴权的页面：无 token 或已过期 → 清理残留凭证并跳登录
  if (to.meta.requiresAuth !== false && !tokenValid) {
    if (token) {
      // 过期 token 的清理策略与 request.ts 中 401 处理保持一致
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
  // 已登录（token 有效）用户访问登录/注册页 → 跳 dashboard
  if ((to.name === 'Login' || to.name === 'Register') && tokenValid) {
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
