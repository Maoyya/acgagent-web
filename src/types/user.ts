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
  roles: string[]
  permissions: string[]
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

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ChangePhoneRequest {
  newPhone: string
  verifyCode: string
}

export interface UpdateProfileRequest {
  nickname?: string
  email?: string
}

export interface WxBindStatus {
  bound: boolean
  openid: string | null
}
