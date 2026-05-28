<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules, type UploadRequestOptions } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  changePhone,
  getWxBindStatus,
  unbindWx,
} from '@/api/profile'
import { hashPassword } from '@/utils/crypto'
import type { UserVO, WxBindStatus } from '@/types'

const authStore = useAuthStore()

// ========== 用户信息 ==========
const profileLoading = ref(false)
const profile = ref<UserVO | null>(null)

async function fetchProfile() {
  profileLoading.value = true
  try {
    const res = await getProfile()
    profile.value = res.data.data
    profileForm.value = {
      nickname: profile.value.nickname ?? '',
      email: profile.value.email ?? '',
    }
  } catch {
    ElMessage.error('获取个人信息失败')
  } finally {
    profileLoading.value = false
  }
}

// ========== 头像上传 ==========
const avatarUploading = ref(false)

async function handleAvatarUpload(options: UploadRequestOptions) {
  avatarUploading.value = true
  try {
    const res = await uploadAvatar(options.file)
    const newAvatar = res.data.data
    if (profile.value) {
      profile.value.avatar = newAvatar
    }
    // 同步更新 authStore 中的用户头像
    if (authStore.userInfo) {
      authStore.userInfo.avatar = newAvatar
    }
    ElMessage.success('头像更新成功')
  } catch {
    ElMessage.error('头像上传失败')
  } finally {
    avatarUploading.value = false
  }
}

// ========== 基本信息 Tab ==========
const profileForm = ref({ nickname: '', email: '' })
const profileSaving = ref(false)
const profileFormRef = ref<FormInstance>()

const profileRules: FormRules = {
  nickname: [
    { max: 64, message: '昵称长度不能超过 64 个字符', trigger: 'blur' },
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
    { max: 128, message: '邮箱长度不能超过 128 个字符', trigger: 'blur' },
  ],
}

async function handleSaveProfile() {
  if (!profileFormRef.value) return
  const valid = await profileFormRef.value.validate().catch(() => false)
  if (!valid) return

  profileSaving.value = true
  try {
    const res = await updateProfile({
      nickname: profileForm.value.nickname || undefined,
      email: profileForm.value.email || undefined,
    })
    profile.value = res.data.data
    // 同步更新 authStore
    if (authStore.userInfo) {
      authStore.userInfo.nickname = profile.value.nickname
      authStore.userInfo.email = profile.value.email
    }
    ElMessage.success('信息更新成功')
  } catch {
    // request.ts 统一提示
  } finally {
    profileSaving.value = false
  }
}

// ========== 修改手机号对话框 ==========
const phoneDialogVisible = ref(false)
const phoneFormRef = ref<FormInstance>()
const phoneForm = ref({ newPhone: '', verifyCode: '' })
const phoneSaving = ref(false)

const phoneRules: FormRules = {
  newPhone: [
    { required: true, message: '请输入新手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  verifyCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码为 6 位数字', trigger: 'blur' },
  ],
}

function openPhoneDialog() {
  phoneForm.value = { newPhone: '', verifyCode: '' }
  phoneDialogVisible.value = true
}

async function handleChangePhone() {
  if (!phoneFormRef.value) return
  const valid = await phoneFormRef.value.validate().catch(() => false)
  if (!valid) return

  phoneSaving.value = true
  try {
    await changePhone({
      newPhone: phoneForm.value.newPhone,
      verifyCode: phoneForm.value.verifyCode,
    })
    ElMessage.success('手机号修改成功')
    phoneDialogVisible.value = false
    await fetchProfile()
  } catch {
    // request.ts 统一提示
  } finally {
    phoneSaving.value = false
  }
}

// ========== 修改密码 Tab ==========
const passwordFormRef = ref<FormInstance>()
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const passwordSaving = ref(false)

const passwordRules: FormRules = {
  oldPassword: [
    { required: true, message: '请输入旧密码', trigger: 'blur' },
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度为 6 ~ 50 个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== passwordForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

async function handleChangePassword() {
  if (!passwordFormRef.value) return
  const valid = await passwordFormRef.value.validate().catch(() => false)
  if (!valid) return

  passwordSaving.value = true
  try {
    await changePassword({
      oldPassword: hashPassword(passwordForm.value.oldPassword),
      newPassword: hashPassword(passwordForm.value.newPassword),
      confirmPassword: passwordForm.value.confirmPassword,
    })
    ElMessage.success('密码修改成功，请重新登录')
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    // 密码修改后要求重新登录
    authStore.logout()
  } catch {
    // request.ts 统一提示
  } finally {
    passwordSaving.value = false
  }
}

// ========== 账号绑定 Tab ==========
const wxStatus = ref<WxBindStatus | null>(null)
const wxLoading = ref(false)
const wxUnbinding = ref(false)

async function fetchWxStatus() {
  wxLoading.value = true
  try {
    const res = await getWxBindStatus()
    wxStatus.value = res.data.data
  } catch {
    // 微信绑定状态非关键信息，静默处理
  } finally {
    wxLoading.value = false
  }
}

async function handleUnbindWx() {
  wxUnbinding.value = true
  try {
    await unbindWx()
    ElMessage.success('已解除微信绑定')
    await fetchWxStatus()
  } catch {
    // request.ts 统一提示
  } finally {
    wxUnbinding.value = false
  }
}

/** 将 openid 脱敏显示，只保留前 4 位和后 4 位 */
function maskOpenid(openid: string): string {
  if (openid.length <= 8) return openid
  return openid.slice(0, 4) + '****' + openid.slice(-4)
}

// ========== 初始化 ==========
onMounted(() => {
  fetchProfile()
  fetchWxStatus()
})
</script>

<template>
  <div class="profile-page" v-loading="profileLoading">
    <div class="page-header">
      <h2 class="page-title">个人中心</h2>
      <p class="page-subtitle">管理您的账号信息和安全设置</p>
    </div>

    <div class="profile-layout">
      <!-- 左侧头像区域 -->
      <div class="avatar-section">
        <el-upload
          :http-request="handleAvatarUpload"
          :show-file-list="false"
          accept="image/png,image/jpeg,image/gif,image/webp"
        >
          <el-avatar
            :size="100"
            :src="profile?.avatar || undefined"
            class="avatar-img"
          >
            {{ profile?.nickname?.charAt(0) || profile?.username?.charAt(0) || '?' }}
          </el-avatar>
          <div class="avatar-overlay">
            <span v-if="!avatarUploading">点击更换</span>
            <el-icon v-else class="is-loading"><Loading /></el-icon>
          </div>
        </el-upload>
        <div class="avatar-name">{{ profile?.nickname || profile?.username || '-' }}</div>
        <div class="avatar-username">@{{ profile?.username || '-' }}</div>
      </div>

      <!-- 右侧 Tab 区域 -->
      <div class="content-section">
        <el-tabs>
          <!-- 基本信息 -->
          <el-tab-pane label="基本信息">
            <el-form
              ref="profileFormRef"
              :model="profileForm"
              :rules="profileRules"
              label-position="top"
              class="profile-form"
            >
              <el-form-item label="昵称" prop="nickname">
                <el-input
                  v-model="profileForm.nickname"
                  placeholder="请输入昵称"
                  maxlength="64"
                  show-word-limit
                />
              </el-form-item>

              <el-form-item label="邮箱" prop="email">
                <el-input
                  v-model="profileForm.email"
                  placeholder="请输入邮箱"
                  maxlength="128"
                />
              </el-form-item>

              <el-form-item label="手机号">
                <div class="phone-field">
                  <span class="phone-display">{{ profile?.phone || '未设置' }}</span>
                  <el-button type="primary" link @click="openPhoneDialog">
                    修改
                  </el-button>
                </div>
              </el-form-item>

              <el-form-item label="注册时间">
                <span class="readonly-field">
                  {{ profile?.createdAt?.replace('T', ' ').slice(0, 19) || '-' }}
                </span>
              </el-form-item>

              <el-form-item label="角色">
                <div class="roles-field">
                  <el-tag
                    v-for="role in (profile?.roles || [])"
                    :key="role"
                    :type="role === 'admin' ? 'danger' : 'info'"
                    class="role-tag"
                  >
                    {{ role }}
                  </el-tag>
                  <span v-if="!profile?.roles?.length" class="readonly-field">-</span>
                </div>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" :loading="profileSaving" @click="handleSaveProfile">
                  保存修改
                </el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <!-- 修改密码 -->
          <el-tab-pane label="修改密码">
            <el-form
              ref="passwordFormRef"
              :model="passwordForm"
              :rules="passwordRules"
              label-position="top"
              class="profile-form"
            >
              <el-form-item label="旧密码" prop="oldPassword">
                <el-input
                  v-model="passwordForm.oldPassword"
                  type="password"
                  placeholder="请输入当前密码"
                  show-password
                />
              </el-form-item>

              <el-form-item label="新密码" prop="newPassword">
                <el-input
                  v-model="passwordForm.newPassword"
                  type="password"
                  placeholder="请输入新密码（6 ~ 50 位）"
                  show-password
                />
              </el-form-item>

              <el-form-item label="确认新密码" prop="confirmPassword">
                <el-input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  placeholder="请再次输入新密码"
                  show-password
                />
              </el-form-item>

              <el-form-item>
                <el-button type="primary" :loading="passwordSaving" @click="handleChangePassword">
                  修改密码
                </el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <!-- 账号绑定 -->
          <el-tab-pane label="账号绑定">
            <div class="bind-section" v-loading="wxLoading">
              <div class="bind-item">
                <div class="bind-info">
                  <span class="bind-label">微信</span>
                  <span v-if="wxStatus?.bound" class="bind-status bound">
                    已绑定（{{ maskOpenid(wxStatus.openid!) }}）
                  </span>
                  <span v-else class="bind-status unbound">未绑定</span>
                </div>
                <el-button
                  v-if="wxStatus?.bound"
                  type="danger"
                  plain
                  size="small"
                  :loading="wxUnbinding"
                  @click="handleUnbindWx"
                >
                  解绑
                </el-button>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 修改手机号对话框 -->
    <el-dialog
      v-model="phoneDialogVisible"
      title="修改手机号"
      width="440px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="phoneFormRef"
        :model="phoneForm"
        :rules="phoneRules"
        label-position="top"
      >
        <el-form-item label="新手机号" prop="newPhone">
          <el-input
            v-model="phoneForm.newPhone"
            placeholder="请输入新手机号"
            maxlength="11"
          />
        </el-form-item>
        <el-form-item label="验证码" prop="verifyCode">
          <el-input
            v-model="phoneForm.verifyCode"
            placeholder="请输入 6 位验证码"
            maxlength="6"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="phoneDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="phoneSaving" @click="handleChangePhone">
          确认修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.profile-page {
  background: var(--color-bg-card);
  border-radius: var(--radius-base);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  min-height: 0;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 4px 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

.profile-layout {
  display: flex;
  gap: 32px;
}

/* 左侧头像 */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 160px;
  padding-top: 8px;
}

.avatar-section :deep(.el-upload) {
  position: relative;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
}

.avatar-img {
  font-size: 36px;
  background: var(--color-primary-light);
  color: #fff;
}

.avatar-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30px;
  line-height: 30px;
  text-align: center;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-section :deep(.el-upload:hover) .avatar-overlay {
  opacity: 1;
}

.avatar-name {
  margin-top: 12px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.avatar-username {
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* 右侧 Tab 区域 */
.content-section {
  flex: 1;
  min-width: 0;
}

.profile-form {
  max-width: 480px;
}

.phone-field {
  display: flex;
  align-items: center;
  gap: 12px;
}

.phone-display {
  color: var(--color-text);
}

.readonly-field {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.roles-field {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.role-tag {
  text-transform: capitalize;
}

/* 账号绑定 */
.bind-section {
  max-width: 480px;
}

.bind-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border);
}

.bind-item:last-child {
  border-bottom: none;
}

.bind-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bind-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text);
}

.bind-status {
  font-size: 13px;
}

.bind-status.bound {
  color: var(--color-success);
}

.bind-status.unbound {
  color: var(--color-text-light);
}

/* 响应式：窄屏时改为上下布局 */
@media (max-width: 640px) {
  .profile-layout {
    flex-direction: column;
    align-items: center;
  }

  .avatar-section {
    min-width: auto;
    padding-top: 0;
  }

  .profile-form,
  .bind-section {
    max-width: 100%;
  }
}
</style>
