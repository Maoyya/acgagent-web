import axios from 'axios'
import type { Result } from '@/types'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 类型增强：允许请求级声明「跳过全局错误处理」（generate/保存闸门的 403-blocked 是业务结果）
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorHandler?: boolean
  }
}

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    // 调用方显式跳过 → 原样返回完整响应，由调用方自判 code
    if (response.config.skipErrorHandler) {
      return response
    }
    const res = response.data as Result<unknown>
    if (res.code !== 200) {
      ElMessage.error(res.message || '请求失败')
      if (res.code === 401) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        router.push('/login')
      }
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      router.push('/login')
    }
    ElMessage.error(error.message || '网络错误')
    return Promise.reject(error)
  },
)

export default request
