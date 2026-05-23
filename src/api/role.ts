import request from '@/utils/request'
import type { Result, RoleVO, CreateRoleRequest, UpdateRoleRequest, PermissionVO } from '@/types'

export function getRoleList() {
  return request.get<Result<RoleVO[]>>('/roles')
}

export function getRole(id: number) {
  return request.get<Result<RoleVO>>(`/roles/${id}`)
}

export function createRole(data: CreateRoleRequest) {
  return request.post<Result<RoleVO>>('/roles', data)
}

export function updateRole(id: number, data: UpdateRoleRequest) {
  return request.put<Result<RoleVO>>(`/roles/${id}`, data)
}

export function deleteRole(id: number) {
  return request.delete<Result<void>>(`/roles/${id}`)
}

export function assignRolePermissions(roleId: number, permissionIds: number[]) {
  return request.post<Result<void>>(`/roles/${roleId}/permissions`, permissionIds)
}

export function getRolePermissions(roleId: number) {
  return request.get<Result<PermissionVO[]>>(`/roles/${roleId}/permissions`)
}
