<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getPermissionList,
  createPermission,
  updatePermission,
  deletePermission,
} from '@/api/permission'
import type {
  PermissionVO,
  PermissionTreeNode,
  CreatePermissionRequest,
} from '@/types'

const loading = ref(false)
const permissionList = ref<PermissionVO[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('')
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  parentId: 0,
  name: '',
  code: '',
  type: 1,
  path: '',
  icon: '',
  sort: 0,
  status: 1,
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入权限编码', trigger: 'blur' }],
  type: [{ required: true, message: '请选择权限类型', trigger: 'change' }],
}

/** 将扁平列表转换为树形结构，parentId 为 0 视为根节点 */
function buildPermissionTree(list: PermissionVO[]): PermissionTreeNode[] {
  const map = new Map<number, PermissionTreeNode>()
  const roots: PermissionTreeNode[] = []

  for (const item of list) {
    map.set(item.id, { ...item, children: [] })
  }

  for (const node of map.values()) {
    if (node.parentId === 0) {
      roots.push(node)
    } else {
      const parent = map.get(node.parentId)
      if (parent) {
        parent.children.push(node)
      } else {
        // 找不到父节点时作为根节点处理
        roots.push(node)
      }
    }
  }

  return roots
}

const permissionTree = computed(() => buildPermissionTree(permissionList.value))

async function fetchPermissions() {
  loading.value = true
  try {
    const res = await getPermissionList()
    permissionList.value = res.data.data ?? []
  } catch {
    ElMessage.error('获取权限列表失败')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.parentId = 0
  form.name = ''
  form.code = ''
  form.type = 1
  form.path = ''
  form.icon = ''
  form.sort = 0
  form.status = 1
  formRef.value?.resetFields()
}

function handleAdd() {
  isEdit.value = false
  editingId.value = null
  dialogTitle.value = '新增权限'
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: PermissionVO) {
  isEdit.value = true
  editingId.value = row.id
  dialogTitle.value = '编辑权限'
  form.parentId = row.parentId
  form.name = row.name
  form.code = row.code
  form.type = row.type
  form.path = row.path ?? ''
  form.icon = row.icon ?? ''
  form.sort = row.sort
  form.status = row.status
  dialogVisible.value = true
}

function handleAddChild(row: PermissionVO) {
  isEdit.value = false
  editingId.value = null
  dialogTitle.value = '添加子权限'
  resetForm()
  form.parentId = row.id
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const payload: CreatePermissionRequest = {
    parentId: form.parentId,
    name: form.name,
    code: form.code,
    type: form.type,
    path: form.path || undefined,
    icon: form.icon || undefined,
    sort: form.sort,
    status: form.status,
  }

  try {
    if (isEdit.value && editingId.value !== null) {
      await updatePermission(editingId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createPermission(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await fetchPermissions()
  } catch {
    ElMessage.error(isEdit.value ? '更新失败' : '创建失败')
  }
}

async function handleDelete(row: PermissionVO) {
  try {
    await deletePermission(row.id)
    ElMessage.success('删除成功')
    await fetchPermissions()
  } catch {
    ElMessage.error('删除失败')
  }
}

function getTypeLabel(type: number) {
  return type === 1 ? '菜单' : type === 2 ? '按钮' : '未知'
}

function getTypeTagType(type: number) {
  return type === 1 ? 'info' : type === 2 ? 'warning' : 'info'
}

onMounted(() => {
  fetchPermissions()
})
</script>

<template>
  <div class="permissions-page">
    <div class="page-header">
      <h2 class="page-title">权限管理</h2>
      <el-button type="primary" @click="handleAdd">新增权限</el-button>
    </div>

    <div class="page-card">
      <el-table
        v-loading="loading"
        :data="permissionTree"
        row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        default-expand-all
        style="width: 100%"
      >
        <el-table-column prop="name" label="权限名" min-width="160" />
        <el-table-column prop="code" label="编码" min-width="180">
          <template #default="{ row }">
            <code class="code-text">{{ row.code }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="path" label="路径" min-width="140">
          <template #default="{ row }">
            <span v-if="row.path">{{ row.path }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="icon" label="图标" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.icon">{{ row.icon }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button link type="primary" size="small" @click="handleAddChild(row)">
              添加子权限
            </el-button>
            <el-popconfirm
              title="确定删除该权限吗？"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" destroy-on-close>
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="90px"
        label-position="right"
      >
        <el-form-item label="上级权限" prop="parentId">
          <el-tree-select
            v-model="form.parentId"
            :data="permissionTree"
            node-key="id"
            :props="{ label: 'name', children: 'children' }"
            check-strictly
            :render-after-expand="false"
            placeholder="无（顶级权限）"
            clearable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="权限名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入权限名称" />
        </el-form-item>
        <el-form-item label="权限编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入权限编码，如 system:user:list" />
        </el-form-item>
        <el-form-item label="权限类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio :value="1">菜单</el-radio>
            <el-radio :value="2">按钮</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="路径" prop="path">
          <el-input v-model="form.path" placeholder="菜单路径，如 /system/users" />
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <el-input v-model="form.icon" placeholder="图标名称" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.permissions-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
}

.page-card {
  border-radius: var(--radius-base);
  padding: 24px;
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}

.code-text {
  font-size: 13px;
  padding: 2px 6px;
  background: var(--color-bg);
  border-radius: 4px;
  color: var(--color-text-secondary);
}

.text-muted {
  color: var(--color-text-light);
}
</style>
