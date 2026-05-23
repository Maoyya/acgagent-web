<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { getAgentList, createAgent, updateAgent, deleteAgent } from '@/api/agent'
import type { AgentVO, CreateAgentRequest } from '@/types'

const agents = ref<AgentVO[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('新增 Agent')
const editingId = ref<number | null>(null)
const searchKeyword = ref('')

const formRef = ref<FormInstance>()
const formLoading = ref(false)

const form = ref({
  name: '',
  description: '',
  apiUrl: '',
  apiKey: '',
  model: '',
  status: true,
  configJson: '',
})

const filteredAgents = computed(() => {
  if (!searchKeyword.value.trim()) return agents.value
  const keyword = searchKeyword.value.trim().toLowerCase()
  return agents.value.filter((a) => a.name.toLowerCase().includes(keyword))
})

/** 获取 Agent 列表 */
async function fetchAgents() {
  loading.value = true
  try {
    const res = await getAgentList()
    agents.value = res.data.data
  } finally {
    loading.value = false
  }
}

/** 打开新增对话框 */
function handleAdd() {
  editingId.value = null
  dialogTitle.value = '新增 Agent'
  form.value = {
    name: '',
    description: '',
    apiUrl: '',
    apiKey: '',
    model: '',
    status: true,
    configJson: '',
  }
  dialogVisible.value = true
}

/** 打开编辑对话框 */
function handleEdit(agent: AgentVO) {
  editingId.value = agent.id
  dialogTitle.value = '编辑 Agent'
  form.value = {
    name: agent.name,
    description: agent.description || '',
    apiUrl: agent.apiUrl,
    apiKey: '',
    model: agent.model,
    status: agent.status === 1,
    configJson: agent.configJson || '',
  }
  dialogVisible.value = true
}

/** 提交表单 */
async function handleSubmit() {
  await formRef.value?.validate()
  formLoading.value = true
  try {
    const data: CreateAgentRequest = {
      name: form.value.name,
      description: form.value.description || undefined,
      apiUrl: form.value.apiUrl,
      apiKey: form.value.apiKey || '******',
      model: form.value.model,
      status: form.value.status ? 1 : 0,
      configJson: form.value.configJson || undefined,
    }

    if (editingId.value) {
      await updateAgent(editingId.value, data)
      ElMessage.success('更新成功')
    } else {
      await createAgent(data)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await fetchAgents()
  } finally {
    formLoading.value = false
  }
}

/** 删除 Agent */
async function handleDelete(id: number) {
  await deleteAgent(id)
  ElMessage.success('删除成功')
  await fetchAgents()
}

/** 生成头像背景色，基于名字哈希 */
function avatarColor(name: string): string {
  const colors = ['#e94560', '#00b894', '#6c5ce7', '#fdcb6e', '#74b9ff', '#a29bfe', '#fd79a8', '#00cec9']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

fetchAgents()
</script>

<template>
  <div class="agent-page">
    <div class="page-header">
      <h2 class="page-title">Agent 管理</h2>
      <div class="toolbar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索 Agent 名称"
          clearable
          style="width: 240px"
        />
        <el-button type="primary" @click="handleAdd">新增 Agent</el-button>
      </div>
    </div>

    <!-- Agent 卡片网格 -->
    <div v-loading="loading" class="agent-grid">
      <template v-if="filteredAgents.length">
        <el-card
          v-for="agent in filteredAgents"
          :key="agent.id"
          class="agent-card"
          shadow="hover"
        >
          <div class="card-body">
            <div class="card-top">
              <div
                class="agent-avatar"
                :style="{ background: avatarColor(agent.name) }"
              >
                {{ agent.name.charAt(0).toUpperCase() }}
              </div>
              <span :class="['status-dot', agent.status === 1 ? 'enabled' : 'disabled']" />
            </div>
            <div class="agent-name" :title="agent.name">{{ agent.name }}</div>
            <div class="agent-desc" :title="agent.description || ''">
              {{ agent.description || '暂无描述' }}
            </div>
            <el-tag size="small" type="info" class="model-tag">{{ agent.model }}</el-tag>
          </div>
          <div class="card-footer">
            <el-button text size="small" @click="handleEdit(agent)">编辑</el-button>
            <el-popconfirm title="确定删除该 Agent 吗？" @confirm="handleDelete(agent.id)">
              <template #reference>
                <el-button text size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </el-card>
      </template>

      <!-- 空状态 -->
      <div v-if="!loading && !filteredAgents.length" class="empty-state">
        <p>暂无 Agent，点击上方按钮创建</p>
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        label-width="100px"
        label-position="right"
      >
        <el-form-item label="名称" prop="name" :rules="[{ required: true, message: '请输入名称' }]">
          <el-input v-model="form.name" placeholder="请输入 Agent 名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述（可选）"
          />
        </el-form-item>
        <el-form-item label="API 地址" prop="apiUrl" :rules="[{ required: true, message: '请输入 API 地址' }]">
          <el-input v-model="form.apiUrl" placeholder="https://api.example.com/v1" />
        </el-form-item>
        <el-form-item label="API Key" prop="apiKey">
          <el-input
            v-model="form.apiKey"
            type="password"
            show-password
            :placeholder="editingId ? '******' : '请输入 API Key'"
          />
        </el-form-item>
        <el-form-item label="模型" prop="model" :rules="[{ required: true, message: '请输入模型名称' }]">
          <el-input v-model="form.model" placeholder="gpt-4o" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" active-text="启用" inactive-text="禁用" />
        </el-form-item>
        <el-form-item label="配置 JSON" prop="configJson">
          <el-input
            v-model="form.configJson"
            type="textarea"
            :rows="4"
            placeholder='{"temperature": 0.7}'
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="formLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.agent-page {
  border-radius: var(--radius-base);
  padding: 24px;
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  min-height: 200px;
}

.agent-card {
  transition: transform 0.2s, box-shadow 0.2s;
  border-radius: var(--radius-base);
}

.agent-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.agent-card :deep(.el-card__body) {
  padding: 20px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.agent-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  flex-shrink: 0;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.enabled {
  background: var(--color-success);
}

.status-dot.disabled {
  background: var(--color-text-light);
}

.agent-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 39px;
}

.model-tag {
  align-self: flex-start;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  margin-top: 12px;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  color: var(--color-text-secondary);
  font-size: 14px;
}
</style>
