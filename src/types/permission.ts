export interface PermissionVO {
  id: number
  parentId: number
  name: string
  code: string
  type: number
  path: string | null
  icon: string | null
  sort: number
  status: number
  createdAt: string
  updatedAt: string
}

export interface CreatePermissionRequest {
  parentId?: number
  name: string
  code: string
  type: number
  path?: string
  icon?: string
  sort?: number
  status?: number
}

export interface UpdatePermissionRequest {
  parentId?: number
  name?: string
  code?: string
  type?: number
  path?: string
  icon?: string
  sort?: number
  status?: number
}

export interface PermissionTreeNode extends PermissionVO {
  children: PermissionTreeNode[]
}
