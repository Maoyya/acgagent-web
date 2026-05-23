<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import {
  getRoleList,
  createRole,
  updateRole,
  deleteRole,
  assignRolePermissions,
  getRolePermissions,
} from '@/api/role'
import { getPermissionList } from '@/api/permission'
import type { RoleVO, CreateRoleRequest, UpdateRoleRequest, PermissionVO, PermissionTreeNode } from '@/types'

// ========== 列表数据 ==========
const loading = ref(false)
const roleList = ref<RoleVO[]>([])

// ========== 搜索 & 分页 ==========
const searchName = ref('')
const searchStatus = ref<number | string>('')

const filteredList = computed(() => {
  let list = roleList.value
  if (searchName.value.trim()) {
    const keyword = searchName.value.trim().toLowerCase()
    list = list.filter((r) => r.name.toLowerCase().includes(keyword))
  }
  if (searchStatus.value !== '') {
    list = list.filter((r) => r.status === searchStatus.value)
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
  // 前端分页，无需额外请求
}

// ========== 加载角色列表 ==========
async function fetchRoles() {
  loading.value = true
  try {
    const res = await getRoleList()
    roleList.value = res.data.data
  } catch {
    ElMessage.error('获取角色列表失败')
  } finally {
    loading.value = false
  }
}

// ========== 新建 / 编辑对话框 ==========
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const formRef = ref<FormInstance>()
const editRoleId = ref<number | null>(null)

const defaultFormData = () => ({
  name: '',
  code: '',
  sort: 0,
  status: 1,
  remark: '',
})

const formData = ref(defaultFormData())

const formRules = computed<FormRules>(() => ({
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { min: 2, max: 32, message: '角色名称长度为 2 ~ 32 个字符', trigger: 'blur' },
  ],
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { pattern: /^[A-Z_]+$/, message: '编码仅允许大写字母和下划线', trigger: 'blur' },
  ],
}))

function openCreateDialog() {
  dialogMode.value = 'create'
  editRoleId.value = null
  formData.value = defaultFormData()
  dialogVisible.value = true
}

function openEditDialog(role: RoleVO) {
  dialogMode.value = 'edit'
  editRoleId.value = role.id
  formData.value = {
    name: role.name,
    code: role.code,
    sort: role.sort,
    status: role.status,
    remark: role.remark ?? '',
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    if (dialogMode.value === 'create') {
      const payload: CreateRoleRequest = {
        name: formData.value.name,
        code: formData.value.code,
        sort: formData.value.sort,
        status: formData.value.status,
        remark: formData.value.remark || undefined,
      }
      await createRole(payload)
      ElMessage.success('创建角色成功')
    } else {
      const payload: UpdateRoleRequest = {
        name: formData.value.name,
        code: formData.value.code,
        sort: formData.value.sort,
        status: formData.value.status,
        remark: formData.value.remark || undefined,
      }
      await updateRole(editRoleId.value!, payload)
      ElMessage.success('更新角色成功')
    }
    dialogVisible.value = false
    await fetchRoles()
  } catch {
    // request.ts 已统一提示
  }
}

// ========== 删除 ==========
async function handleDelete(id: number) {
  try {
    await deleteRole(id)
    ElMessage.success('删除成功')
    await fetchRoles()
  } catch {
    // request.ts 已统一提示
  }
}

// ========== 分配权限对话框 ==========

/** 将扁平权限列表构建为树形结构 */
function buildPermissionTree(list: PermissionVO[]): PermissionTreeNode[] {
  const map = new Map<number, PermissionTreeNode>()
  const roots: PermissionTreeNode[] = []

  // 先创建所有节点
  for (const item of list) {
    map.set(item.id, { ...item, children: [] })
  }

  // 再按 parentId 组装
  for (const node of map.values()) {
    if (node.parentId === 0 || !map.has(node.parentId)) {
      roots.push(node)
    } else {
      map.get(node.parentId)!.children.push(node)
    }
  }

  return roots
}

const permDialogVisible = ref(false)
const permDialogLoading = ref(false)
const permDialogSaving = ref(false)
const permTargetRoleId = ref<number | null>(null)
const permTreeRef = ref<InstanceType<typeof import('element-plus')['ElTree']>>()
const permTreeData = ref<PermissionTreeNode[]>([])

async function openPermDialog(role: RoleVO) {
  permTargetRoleId.value = role.id
  permDialogVisible.value = true
  permDialogLoading.value = true

  try {
    const [permRes, rolePermRes] = await Promise.all([
      getPermissionList(),
      getRolePermissions(role.id),
    ])
    permTreeData.value = buildPermissionTree(permRes.data.data)
    // 等待树渲染后设置选中节点
    const checkedIds = rolePermRes.data.data.map((p) => p.id)
    // nextTick 确保 el-tree 已渲染
    await new Promise((resolve) => setTimeout(resolve, 0))
    permTreeRef.value?.setCheckedKeys(checkedIds)
  } catch {
    ElMessage.error('获取权限数据失败')
  } finally {
    permDialogLoading.value = false
  }
}

async function handlePermSubmit() {
  if (permTargetRoleId.value === null || !permTreeRef.value) return
  permDialogSaving.value = true
  try {
    // 收集全选节点 + 半选节点
    const checkedKeys = permTreeRef.value.getCheckedKeys(false) as number[]
    const halfCheckedKeys = permTreeRef.value.getHalfCheckedKeys() as number[]
    const allIds = [...checkedKeys, ...halfCheckedKeys]
    await assignRolePermissions(permTargetRoleId.value, allIds)
    ElMessage.success('权限分配成功')
    permDialogVisible.value = false
  } catch {
    // request.ts 已统一提示
  } finally {
    permDialogSaving.value = false
  }
}

// ========== 初始化 ==========
onMounted(() => {
  fetchRoles()
})
</script>

<template>
  <div class="roles-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">角色管理</h2>
      <p class="page-subtitle">管理系统角色及权限分配</p>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchName"
        placeholder="搜索角色名称"
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
        新增角色
      </el-button>
    </div>

    <!-- 表格 -->
    <el-table
      v-loading="loading"
      :data="pagedList"
      class="roles-table"
      stripe
    >
      <el-table-column prop="name" label="角色名" min-width="120" />
      <el-table-column prop="code" label="编码" min-width="140" />
      <el-table-column prop="sort" label="排序" width="80" align="center" />
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
            {{ row.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="160">
        <template #default="{ row }">
          {{ row.remark || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="250" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openEditDialog(row)">
            编辑
          </el-button>
          <el-button type="primary" link size="small" @click="openPermDialog(row)">
            分配权限
          </el-button>
          <el-popconfirm
            title="确定删除该角色？"
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
      :title="dialogMode === 'create' ? '新增角色' : '编辑角色'"
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
        <el-form-item label="角色名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入角色名称"
            maxlength="32"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input
            v-model="formData.code"
            placeholder="请输入角色编码，如 ADMIN"
            :disabled="dialogMode === 'edit'"
            maxlength="64"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="formData.sort" :min="0" :max="9999" controls-position="right" />
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
        <el-form-item label="备注">
          <el-input
            v-model="formData.remark"
            type="textarea"
            placeholder="请输入备注"
            :rows="3"
            maxlength="200"
            show-word-limit
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

    <!-- 分配权限对话框 -->
    <el-dialog
      v-model="permDialogVisible"
      title="分配权限"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-loading="permDialogLoading" class="perm-tree-wrapper">
        <el-tree
          ref="permTreeRef"
          :data="permTreeData"
          show-checkbox
          node-key="id"
          default-expand-all
          :props="{ label: 'name', children: 'children' }"
          class="perm-tree"
        >
          <template #default="{ data }">
            <span class="perm-node">
              <span class="perm-node-name">{{ data.name }}</span>
              <span class="perm-node-code">{{ data.code }}</span>
            </span>
          </template>
        </el-tree>
        <el-empty
          v-if="permTreeData.length === 0 && !permDialogLoading"
          description="暂无可分配的权限"
        />
      </div>
      <template #footer>
        <el-button @click="permDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="permDialogSaving"
          @click="handlePermSubmit"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.roles-page {
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

.roles-table {
  width: 100%;
  border-radius: var(--radius-base);
}

:deep(.el-table__header th) {
  font-weight: 600;
  color: var(--color-text-secondary);
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.perm-tree-wrapper {
  min-height: 80px;
  max-height: 420px;
  overflow-y: auto;
}

.perm-node {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.perm-node-name {
  color: var(--color-text);
}

.perm-node-code {
  color: var(--color-text-light);
  font-size: 12px;
}
</style>
