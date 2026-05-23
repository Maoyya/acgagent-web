export interface UserVO {
  id: number
  username: string
  nickname: string | null
  email: string | null
  phone: string | null
  avatar: string | null
  status: number
  createdAt: string
  updatedAt: string
}

export interface CreateUserRequest {
  username: string
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
  status?: number
}

export interface UpdateUserRequest {
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
  status?: number
}
