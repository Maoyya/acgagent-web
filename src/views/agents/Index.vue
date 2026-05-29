<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { getAgentList, createAgent, updateAgent, deleteAgent } from '@/api/agent'
import type { AgentVO, AgentCategory, CreateAgentRequest } from '@/types'
import { AgentCategoryLabels } from '@/types'

const agents = ref<AgentVO[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('新增 Agent')
const editingId = ref<number | null>(null)
const searchKeyword = ref('')
const filterCategory = ref<AgentCategory | ''>('')

/** 每个分类的折叠状态 */
const collapsed = reactive<Record<AgentCategory, boolean>>({
  CHAT: false,
  VIDEO: false,
  IMAGE: false,
})

const formRef = ref<FormInstance>()
const formLoading = ref(false)

const form = ref({
  name: '',
  description: '',
  apiUrl: '',
  apiKey: '',
  model: '',
  status: true,
  category: 'CHAT' as AgentCategory,
  configJson: '',
})

const filteredAgents = computed(() => {
  let list = agents.value
  if (filterCategory.value) {
    list = list.filter((a) => a.category === filterCategory.value)
  }
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    list = list.filter((a) => a.name.toLowerCase().includes(keyword))
  }
  return list
})

/** 按分类分组 */
const groupedAgents = computed(() => {
  const groups: { category: AgentCategory; label: string; agents: AgentVO[] }[] = []
  for (const [cat, label] of Object.entries(AgentCategoryLabels)) {
    const items = filteredAgents.value.filter((a) => a.category === cat)
    if (items.length > 0 || !filterCategory.value) {
      groups.push({ category: cat as AgentCategory, label, agents: items })
    }
  }
  return groups
})

async function fetchAgents() {
  loading.value = true
  try {
    const res = await getAgentList()
    agents.value = res.data.data
  } finally {
    loading.value = false
  }
}

function handleAdd(defaultCategory?: AgentCategory) {
  editingId.value = null
  dialogTitle.value = '新增 Agent'
  form.value = {
    name: '',
    description: '',
    apiUrl: '',
    apiKey: '',
    model: '',
    status: true,
    category: defaultCategory || 'CHAT',
    configJson: '',
  }
  dialogVisible.value = true
}

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
    category: agent.category,
    configJson: agent.configJson || '',
  }
  dialogVisible.value = true
}

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
      category: form.value.category,
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

async function handleDelete(id: number) {
  await deleteAgent(id)
  ElMessage.success('删除成功')
  await fetchAgents()
}

function avatarColor(name: string): string {
  const colors = ['#e94560', '#00b894', '#6c5ce7', '#fdcb6e', '#74b9ff', '#a29bfe', '#fd79a8', '#00cec9']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function toggleCollapse(category: AgentCategory) {
  collapsed[category] = !collapsed[category]
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
          style="width: 200px"
        />
        <el-select
          v-model="filterCategory"
          placeholder="全部分类"
          clearable
          style="width: 140px"
        >
          <el-option
            v-for="(label, key) in AgentCategoryLabels"
            :key="key"
            :label="label"
            :value="key"
          />
        </el-select>
        <el-button type="primary" @click="handleAdd()">新增 Agent</el-button>
      </div>
    </div>

    <div v-loading="loading">
      <!-- 按分类分组展示 -->
      <div
        v-for="group in groupedAgents"
        :key="group.category"
        class="category-section"
      >
        <div class="category-header" @click="toggleCollapse(group.category)">
          <el-icon class="collapse-icon" :class="{ rotated: !collapsed[group.category] }">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </el-icon>
          <el-tag
            :type="group.category === 'CHAT' ? 'success' : group.category === 'VIDEO' ? 'warning' : 'danger'"
            size="large"
            class="category-label"
          >
            {{ group.label }}
          </el-tag>
          <span class="category-count">{{ group.agents.length }}</span>
          <el-button
            text
            size="small"
            class="section-add-btn"
            @click.stop="handleAdd(group.category)"
          >
            + 新增
          </el-button>
        </div>

        <Transition name="section-collapse">
          <div v-show="!collapsed[group.category]" class="category-body">
            <div class="agent-grid">
              <el-card
                v-for="agent in group.agents"
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
                  <el-tag size="small" type="info">{{ agent.model }}</el-tag>
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
            </div>
            <div v-if="group.agents.length === 0" class="empty-hint">
              该分类暂无 Agent
            </div>
          </div>
        </Transition>
      </div>

      <!-- 全局空状态 -->
      <div v-if="!loading && groupedAgents.length === 0" class="empty-state">
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
        <el-form-item label="名称" prop="name" :rules="[
          { required: true, message: '请输入名称' },
          { max: 128, message: '名称长度不能超过 128 个字符', trigger: 'blur' },
        ]">
          <el-input v-model="form.name" placeholder="请输入 Agent 名称" maxlength="128" show-word-limit />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述（可选）"
            maxlength="512"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="API 地址" prop="apiUrl" :rules="[
          { required: true, message: '请输入 API 地址' },
          { max: 512, message: 'API 地址长度不能超过 512 个字符', trigger: 'blur' },
        ]">
          <el-input v-model="form.apiUrl" placeholder="https://api.example.com/v1" maxlength="512" />
        </el-form-item>
        <el-form-item label="API Key" prop="apiKey">
          <el-input
            v-model="form.apiKey"
            type="password"
            show-password
            :placeholder="editingId ? '不修改请留空' : '请输入 API Key'"
            maxlength="512"
          />
        </el-form-item>
        <el-form-item label="模型" prop="model" :rules="[
          { required: true, message: '请输入模型名称' },
          { max: 128, message: '模型名称长度不能超过 128 个字符', trigger: 'blur' },
        ]">
          <el-input v-model="form.model" placeholder="gpt-4o" maxlength="128" show-word-limit />
        </el-form-item>
        <el-form-item label="分类" prop="category" :rules="[{ required: true, message: '请选择分类' }]">
          <el-select v-model="form.category" placeholder="请选择分类">
            <el-option
              v-for="(label, key) in AgentCategoryLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
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
            maxlength="5000"
            show-word-limit
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

/* 分类分组 */
.category-section {
  margin-bottom: 20px;
}

.category-section:last-child {
  margin-bottom: 0;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  user-select: none;
}

.category-header:hover {
  background: var(--color-bg);
}

.collapse-icon {
  transition: transform 0.3s;
  color: var(--color-text-secondary);
}

.collapse-icon.rotated {
  transform: rotate(90deg);
}

.category-label {
  font-size: 15px;
  font-weight: 600;
}

.category-count {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-left: 4px;
}

.section-add-btn {
  margin-left: auto;
  color: var(--color-primary);
}

.category-body {
  padding: 12px 0 0;
}

.section-collapse-enter-active,
.section-collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.section-collapse-enter-from,
.section-collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
}

.section-collapse-enter-to,
.section-collapse-leave-from {
  opacity: 1;
  max-height: 2000px;
}

/* 卡片网格 */
.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
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
  padding: 16px;
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
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
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
  font-size: 15px;
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

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
  margin-top: 8px;
}

.empty-hint {
  padding: 24px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  color: var(--color-text-secondary);
  font-size: 14px;
}
</style>
