<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getTemplateList, deleteTemplate, applyTemplateToAgent } from '@/api/prompt'
import { useAuthStore } from '@/stores/auth'
import { PromptModeLabels } from '@/types'
import type { PromptTemplateVO, PromptMode } from '@/types'
import PromptGenerateDialog from '@/components/prompt/PromptGenerateDialog.vue'
import PromptEditDrawer from '@/components/prompt/PromptEditDrawer.vue'
import AgentSelectDialog from '@/components/prompt/AgentSelectDialog.vue'

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)
const currentUserId = computed(() => authStore.userInfo?.id ?? null)

const templates = ref<PromptTemplateVO[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const filterMode = ref<PromptMode | ''>('')

const filteredTemplates = computed(() => {
  let list = templates.value
  if (filterMode.value) list = list.filter((t) => t.mode === filterMode.value)
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim().toLowerCase()
    list = list.filter((t) => t.name.toLowerCase().includes(kw))
  }
  return list
})

/** 当前用户是否可编辑/删除该模板（owner 或 admin） */
function canManage(tpl: PromptTemplateVO): boolean {
  return isAdmin.value || tpl.userId === currentUserId.value
}

async function fetchTemplates() {
  loading.value = true
  try {
    const res = await getTemplateList()
    templates.value = res.data.data ?? []
  } catch {
    ElMessage.error('加载模板列表失败')
  } finally {
    loading.value = false
  }
}

// --- generate ---
const generateVisible = ref(false)
// --- 编辑抽屉 ---
const drawerVisible = ref(false)
const editingTpl = ref<PromptTemplateVO | null>(null)
const draftSeed = ref<{ systemPrompt: string; mode: PromptMode; caps?: string[] } | null>(null)

function onDraft(draft: { systemPrompt: string; mode: PromptMode; caps?: string[] }) {
  editingTpl.value = null
  draftSeed.value = draft
  drawerVisible.value = true
}
function handleAdd() {
  editingTpl.value = null
  draftSeed.value = null
  drawerVisible.value = true
}
function handleEdit(tpl: PromptTemplateVO) {
  editingTpl.value = tpl
  draftSeed.value = null
  drawerVisible.value = true
}

// --- apply (admin) ---
const applyVisible = ref(false)
const applyingTpl = ref<PromptTemplateVO | null>(null)
function handleApply(tpl: PromptTemplateVO) {
  applyingTpl.value = tpl
  applyVisible.value = true
}
async function onApplyAgent(agentId: number) {
  if (!applyingTpl.value) return
  try {
    await applyTemplateToAgent(applyingTpl.value.id, agentId)
    ElMessage.success('已应用到该 Agent')
  } catch {
    /* 拦截器已弹 */
  }
}

async function handleDelete(tpl: PromptTemplateVO) {
  await deleteTemplate(tpl.id)
  ElMessage.success('删除成功')
  await fetchTemplates()
}

fetchTemplates()
</script>

<template>
  <div class="prompt-page">
    <div class="page-header">
      <h2 class="page-title">提示词模板</h2>
      <div class="toolbar">
        <el-input v-model="searchKeyword" placeholder="搜索名称" clearable style="width: 200px" />
        <el-select v-model="filterMode" placeholder="全部模式" clearable style="width: 140px">
          <el-option v-for="(label, key) in PromptModeLabels" :key="key" :label="label" :value="key" />
        </el-select>
        <el-button @click="handleAdd">手动新建</el-button>
        <el-button type="primary" @click="generateVisible = true">生成提示词</el-button>
      </div>
    </div>

    <div v-loading="loading" class="tpl-list">
      <el-card v-for="tpl in filteredTemplates" :key="tpl.id" class="tpl-card" shadow="hover">
        <div class="tpl-head">
          <span class="tpl-name">{{ tpl.name }}</span>
          <el-tag size="small" :type="tpl.mode === 'acg' ? 'success' : 'warning'">
            {{ PromptModeLabels[tpl.mode] }}
          </el-tag>
          <el-tag size="small" :type="tpl.userId === null ? 'danger' : 'info'">
            {{ tpl.userId === null ? '公共' : '私有' }}
          </el-tag>
          <span class="tpl-tokens" v-if="tpl.estPromptTokens != null">~{{ tpl.estPromptTokens }} tokens</span>
        </div>
        <div class="tpl-actions">
          <el-button text size="small" @click="handleEdit(tpl)" v-if="canManage(tpl)">编辑</el-button>
          <el-button text size="small" type="primary" @click="handleApply(tpl)" v-if="isAdmin">应用到 Agent</el-button>
          <el-popconfirm title="确定删除该模板吗？" @confirm="handleDelete(tpl)" v-if="canManage(tpl)">
            <template #reference>
              <el-button text size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </div>
      </el-card>
      <div v-if="!loading && filteredTemplates.length === 0" class="empty-state">
        暂无模板，点击「生成提示词」或「手动新建」
      </div>
    </div>

    <PromptGenerateDialog v-model="generateVisible" @draft="onDraft" />
    <PromptEditDrawer
      v-model="drawerVisible"
      :template="editingTpl"
      :seed="draftSeed"
      @saved="fetchTemplates"
    />
    <AgentSelectDialog v-model="applyVisible" title="选择要应用的 Agent" @select="onApplyAgent" />
  </div>
</template>

<style scoped>
.prompt-page {
  padding: 24px;
  background: var(--color-bg-card);
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-sm);
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
}
.toolbar {
  display: flex;
  gap: 12px;
}
.tpl-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
}
.tpl-card :deep(.el-card__body) {
  padding: 16px;
}
.tpl-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tpl-name {
  font-weight: 600;
  color: var(--color-text);
}
.tpl-tokens {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.tpl-actions {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}
.empty-state {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 48px 0;
  font-size: 14px;
}
</style>
