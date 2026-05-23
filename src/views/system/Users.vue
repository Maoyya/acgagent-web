<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import { getUserList, createUser, updateUser, deleteUser, assignUserRoles, getUserRoleIds } from '@/api/user'
import { getRoleList } from '@/api/role'
import type { UserVO, CreateUserRequest, UpdateUserRequest } from '@/types'
import type { RoleVO } from '@/types'

// ========== 列表数据 ==========
const loading = ref(false)
const userList = ref<UserVO[]>([])

// ========== 搜索 & 分页 ==========
const searchUsername = ref('')
const searchStatus = ref<number | string>('')

const filteredList = computed(() => {
  let list = userList.value
  if (searchUsername.value.trim()) {
    const keyword = searchUsername.value.trim().toLowerCase()
    list = list.filter((u) => u.username.toLowerCase().includes(keyword))
  }
  if (searchStatus.value !== '') {
    list = list.filter((u) => u.status === searchStatus.value)
  }
  return list
})

const currentPage = ref(1)
const pageSize = ref(10)

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

function handlePageChange() {
  // 翻页时无需额外请求，前端分页
}

// ========== 加载用户列表 ==========
async function fetchUsers() {
  loading.value = true
  try {
    const res = await getUserList()
    userList.value = res.data.data
  } catch {
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

// ========== 新建 / 编辑对话框 ==========
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const formRef = ref<FormInstance>()

const editUserId = ref<number | null>(null)

const defaultFormData = () => ({
  username: '',
  nickname: '',
  email: '',
  phone: '',
  status: 1,
})

const formData = ref(defaultFormData())

const formRules = computed<FormRules>(() => ({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 32, message: '用户名长度为 2 ~ 32 个字符', trigger: 'blur' },
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
}))

function openCreateDialog() {
  dialogMode.value = 'create'
  editUserId.value = null
  formData.value = defaultFormData()
  dialogVisible.value = true
}

function openEditDialog(user: UserVO) {
  dialogMode.value = 'edit'
  editUserId.value = user.id
  formData.value = {
    username: user.username,
    nickname: user.nickname ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    status: user.status,
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    if (dialogMode.value === 'create') {
      const payload: CreateUserRequest = {
        username: formData.value.username,
        nickname: formData.value.nickname || undefined,
        email: formData.value.email || undefined,
        phone: formData.value.phone || undefined,
        status: formData.value.status,
      }
      await createUser(payload)
      ElMessage.success('创建用户成功')
    } else {
      const payload: UpdateUserRequest = {
        nickname: formData.value.nickname || undefined,
        email: formData.value.email || undefined,
        phone: formData.value.phone || undefined,
        status: formData.value.status,
      }
      await updateUser(editUserId.value!, payload)
      ElMessage.success('更新用户成功')
    }
    dialogVisible.value = false
    await fetchUsers()
  } catch {
    // request.ts 已统一提示
  }
}

// ========== 删除 ==========
async function handleDelete(id: number) {
  try {
    await deleteUser(id)
    ElMessage.success('删除成功')
    await fetchUsers()
  } catch {
    // request.ts 已统一提示
  }
}

// ========== 状态切换 ==========
async function handleStatusChange(user: UserVO, newStatus: number) {
  try {
    await updateUser(user.id, { status: newStatus })
    ElMessage.success(newStatus === 1 ? '已启用' : '已禁用')
    user.status = newStatus
  } catch {
    // 失败时恢复原状态
    user.status = newStatus === 1 ? 0 : 1
  }
}

// ========== 分配角色对话框 ==========
const roleDialogVisible = ref(false)
const roleDialogLoading = ref(false)
const roleDialogSaving = ref(false)
const roleTargetUserId = ref<number | null>(null)
const allRoles = ref<RoleVO[]>([])
const selectedRoleIds = ref<number[]>([])

async function openRoleDialog(user: UserVO) {
  roleTargetUserId.value = user.id
  roleDialogVisible.value = true
  roleDialogLoading.value = true
  selectedRoleIds.value = []

  try {
    const [rolesRes, userRolesRes] = await Promise.all([
      getRoleList(),
      getUserRoleIds(user.id),
    ])
    allRoles.value = rolesRes.data.data
    selectedRoleIds.value = userRolesRes.data.data
  } catch {
    ElMessage.error('获取角色数据失败')
  } finally {
    roleDialogLoading.value = false
  }
}

async function handleRoleSubmit() {
  if (roleTargetUserId.value === null) return
  roleDialogSaving.value = true
  try {
    await assignUserRoles(roleTargetUserId.value, selectedRoleIds.value)
    ElMessage.success('角色分配成功')
    roleDialogVisible.value = false
  } catch {
    // request.ts 已统一提示
  } finally {
    roleDialogSaving.value = false
  }
}

// ========== 初始化 ==========
onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="users-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
      <p class="page-subtitle">管理系统用户账号、状态及角色分配</p>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchUsername"
        placeholder="搜索用户名"
        :prefix-icon="Search"
        clearable
        class="search-input"
      />
      <el-select
        v-model="searchStatus"
        placeholder="状态筛选"
        clearable
        class="search-select"
      >
        <el-option label="全部" :value="''" />
        <el-option label="启用" :value="1" />
        <el-option label="禁用" :value="0" />
      </el-select>
      <el-button type="primary" :icon="Plus" @click="openCreateDialog">
        新增用户
      </el-button>
    </div>

    <!-- 表格 -->
    <el-table
      v-loading="loading"
      :data="pagedList"
      class="users-table"
      stripe
    >
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column prop="nickname" label="昵称" min-width="120">
        <template #default="{ row }">
          {{ row.nickname || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="email" label="邮箱" min-width="180">
        <template #default="{ row }">
          {{ row.email || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="phone" label="手机" min-width="140">
        <template #default="{ row }">
          {{ row.phone || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-switch
            :model-value="row.status === 1"
            inline-prompt
            active-text="启"
            inactive-text="禁"
            @change="(val: boolean) => handleStatusChange(row, val ? 1 : 0)"
          />
        </template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="170">
        <template #default="{ row }">
          {{ row.createdAt?.replace('T', ' ').slice(0, 19) || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openEditDialog(row)">
            编辑
          </el-button>
          <el-button type="primary" link size="small" @click="openRoleDialog(row)">
            分配角色
          </el-button>
          <el-popconfirm
            title="确定删除该用户？"
            confirm-button-text="确定"
            cancel-button-text="取消"
            @confirm="handleDelete(row.id)"
          >
            <template #reference>
              <el-button type="danger" link size="small">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredList.length"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="handlePageChange"
        @size-change="handlePageChange"
      />
    </div>

    <!-- 新建 / 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增用户' : '编辑用户'"
      width="480px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-position="top"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="formData.username"
            placeholder="请输入用户名"
            :disabled="dialogMode === 'edit'"
            maxlength="32"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="formData.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机">
          <el-input v-model="formData.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="formData.status"
            :active-value="1"
            :inactive-value="0"
            inline-prompt
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">
          {{ dialogMode === 'create' ? '创建' : '保存' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 分配角色对话框 -->
    <el-dialog
      v-model="roleDialogVisible"
      title="分配角色"
      width="440px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-loading="roleDialogLoading" class="role-list">
        <el-checkbox-group v-model="selectedRoleIds">
          <el-checkbox
            v-for="role in allRoles"
            :key="role.id"
            :value="role.id"
            :label="role.name"
            class="role-checkbox"
          />
        </el-checkbox-group>
        <el-empty
          v-if="allRoles.length === 0 && !roleDialogLoading"
          description="暂无可分配的角色"
        />
      </div>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="roleDialogSaving"
          @click="handleRoleSubmit"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.users-page {
  background: var(--color-bg-card);
  border-radius: var(--radius-base);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.page-header {
  margin-bottom: 20px;
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

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.search-input {
  width: 220px;
}

.search-select {
  width: 140px;
}

.users-table {
  width: 100%;
  border-radius: var(--radius-base);
}

/* 表头样式 */
:deep(.el-table__header th) {
  font-weight: 600;
  color: var(--color-text-secondary);
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.role-list {
  min-height: 80px;
}

.role-checkbox {
  display: block;
  margin-bottom: 8px;
}
</style>
