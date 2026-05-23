import request from '@/utils/request'
import type { Result, UserVO, CreateUserRequest, UpdateUserRequest } from '@/types'

export function getCurrentUser() {
  return request.get<Result<UserVO>>('/users/me')
}

export function getUserList() {
  return request.get<Result<UserVO[]>>('/users')
}

export function getUser(id: number) {
  return request.get<Result<UserVO>>(`/users/${id}`)
}

export function createUser(data: CreateUserRequest) {
  return request.post<Result<UserVO>>('/users', data)
}

export function updateUser(id: number, data: UpdateUserRequest) {
  return request.put<Result<UserVO>>(`/users/${id}`, data)
}

export function deleteUser(id: number) {
  return request.delete<Result<void>>(`/users/${id}`)
}

export function assignUserRoles(userId: number, roleIds: number[]) {
  return request.post<Result<void>>(`/users/${userId}/roles`, roleIds)
}

export function getUserRoleIds(userId: number) {
  return request.get<Result<number[]>>(`/users/${userId}/roles`)
}
