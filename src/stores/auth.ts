import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as loginApi, register as registerApi, refreshToken as refreshTokenApi } from '@/api/auth'
import type { LoginRequest, RegisterRequest } from '@/types'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(localStorage.getItem('accessToken') || '')
  const refreshToken = ref(localStorage.getItem('refreshToken') || '')
  const isLoggedIn = ref(!!accessToken.value)

  async function login(data: LoginRequest) {
    const res = await loginApi(data)
    const { accessToken: at, refreshToken: rt } = res.data.data
    localStorage.setItem('accessToken', at)
    localStorage.setItem('refreshToken', rt)
    accessToken.value = at
    refreshToken.value = rt
    isLoggedIn.value = true
  }

  async function register(data: RegisterRequest) {
    await registerApi(data)
    // 注册接口只返回用户信息，不返回 Token，需要自动调用登录
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
    router.push('/login')
  }

  return { accessToken, refreshToken, isLoggedIn, login, register, refresh, logout }
})
