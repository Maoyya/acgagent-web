import request from '@/utils/request'
import type { Result, LoginRequest, RegisterRequest, TokenVO, RefreshTokenRequest } from '@/types'

export function login(data: LoginRequest) {
  return request.post<Result<TokenVO>>('/auth/login', data)
}

export function register(data: RegisterRequest) {
  return request.post<Result<TokenVO>>('/auth/register', data)
}

export function refreshToken(data: RefreshTokenRequest) {
  return request.post<Result<TokenVO>>('/auth/refresh', data)
}
