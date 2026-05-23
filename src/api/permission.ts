import request from '@/utils/request'
import type { Result, PermissionVO, CreatePermissionRequest, UpdatePermissionRequest } from '@/types'

export function getPermissionList() {
  return request.get<Result<PermissionVO[]>>('/permissions')
}

export function getPermission(id: number) {
  return request.get<Result<PermissionVO>>(`/permissions/${id}`)
}

export function createPermission(data: CreatePermissionRequest) {
  return request.post<Result<PermissionVO>>('/permissions', data)
}

export function updatePermission(id: number, data: UpdatePermissionRequest) {
  return request.put<Result<PermissionVO>>(`/permissions/${id}`, data)
}

export function deletePermission(id: number) {
  return request.delete<Result<void>>(`/permissions/${id}`)
}
