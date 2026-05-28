import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, register as registerApi, refreshToken as refreshTokenApi } from '@/api/auth'
import { getProfile } from '@/api/profile'
import { hashPassword } from '@/utils/crypto'
import type { LoginRequest, RegisterRequest, UserVO } from '@/types'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(localStorage.getItem('accessToken') || '')
  const refreshToken = ref(localStorage.getItem('refreshToken') || '')
  const isLoggedIn = ref(!!accessToken.value)
  const userInfo = ref<UserVO | null>(null)

  const isAdmin = computed(() => {
    return userInfo.value?.roles?.includes('admin') ?? false
  })

  function hasRole(role: string): boolean {
    return userInfo.value?.roles?.includes(role) ?? false
  }

  function hasPermission(code: string): boolean {
    return userInfo.value?.permissions?.includes(code) ?? false
  }

  async function fetchUserInfo() {
    const res = await getProfile()
    userInfo.value = res.data.data
  }

  async function login(data: LoginRequest) {
    // 密码 MD5 哈希后传输，后端再 BCrypt 加密存储
    const res = await loginApi({ username: data.username, password: hashPassword(data.password) })
    const { accessToken: at, refreshToken: rt } = res.data.data
    localStorage.setItem('accessToken', at)
    localStorage.setItem('refreshToken', rt)
    accessToken.value = at
    refreshToken.value = rt
    isLoggedIn.value = true
    await fetchUserInfo()
  }

  async function register(data: RegisterRequest) {
    await registerApi({ ...data, password: hashPassword(data.password) })
    // 注册后自动登录，密码已经 MD5 哈希过一次，登录时会再次哈希，需要传原始密码
    // 这里 data.password 仍是原始明文，login 内部会做 MD5
    await login({ username: data.username, password: data.password })
  }

  async function refresh() {
    if (!refreshToken.value) return
    const res = await refreshTokenApi({ refreshToken: refreshToken.value })
    const { accessToken: at, refreshToken: rt } = res.data.data
    localStorage.setItem('accessToken', at)
    localStorage.setItem('refreshToken', rt)
    accessToken.value = at
    refreshToken.value = rt
  }

  function logout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    accessToken.value = ''
    refreshToken.value = ''
    isLoggedIn.value = false
    userInfo.value = null
    router.push('/login')
  }

  return { accessToken, refreshToken, isLoggedIn, userInfo, isAdmin, hasRole, hasPermission, fetchUserInfo, login, register, refresh, logout }
})
