export interface RoleVO {
  id: number
  name: string
  code: string
  sort: number
  status: number
  remark: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateRoleRequest {
  name: string
  code: string
  sort?: number
  status?: number
  remark?: string
}

export interface UpdateRoleRequest {
  name?: string
  code?: string
  sort?: number
  status?: number
  remark?: string
}
