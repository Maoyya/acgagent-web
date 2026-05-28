import request from '@/utils/request'
import type { Result, UserVO, UpdateProfileRequest, ChangePasswordRequest, ChangePhoneRequest, WxBindStatus } from '@/types'

export function getProfile() {
  return request.get<Result<UserVO>>('/user/profile/me')
}

export function updateProfile(data: UpdateProfileRequest) {
  return request.put<Result<UserVO>>('/user/profile/me/profile', data)
}

export function uploadAvatar(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.put<Result<string>>('/user/profile/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function changePhone(data: ChangePhoneRequest) {
  return request.put<Result<void>>('/user/profile/me/phone', data)
}

export function changePassword(data: ChangePasswordRequest) {
  return request.put<Result<void>>('/user/profile/me/password', data)
}

export function getWxBindStatus() {
  return request.get<Result<WxBindStatus>>('/user/profile/me/wx-status')
}

export function unbindWx() {
  return request.post<Result<void>>('/user/profile/me/wx-unbind')
}
