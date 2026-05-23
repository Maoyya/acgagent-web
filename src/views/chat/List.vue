<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { getAgentList } from '@/api/agent'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { AgentVO } from '@/types'
import { Plus, ChatDotRound } from '@element-plus/icons-vue'

const router = useRouter()
const chatStore = useChatStore()

const agents = ref<AgentVO[]>([])
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const selectedAgentId = ref<number | null>(null)
const newTitle = ref('')

/** 根据 agentId 查找 Agent 名称 */
function getAgentName(agentId: number): string {
  const agent = agents.value.find((a) => a.id === agentId)
  return agent?.name ?? `Agent #${agentId}`
}

/** 根据 agentId 查找 Agent 模型名 */
function getAgentModel(agentId: number): string {
  const agent = agents.value.find((a) => a.id === agentId)
  return agent?.model ?? ''
}

/** 格式化时间 */
function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  return dateStr.replace('T', ' ').slice(0, 16)
}

/** 生成头像背景色，基于 ID 哈希 */
function avatarColor(id: number): string {
  const colors = ['#e94560', '#00b894', '#6c5ce7', '#fdcb6e', '#74b9ff', '#a29bfe', '#fd79a8', '#00cec9']
  return colors[id % colors.length]
}

/** 点击卡片跳转对话详情 */
function handleCardClick(conversationId: number) {
  router.push(`/chat/${conversationId}`)
}

/** 打开新建对话对话框 */
function handleOpenDialog() {
  selectedAgentId.value = null
  newTitle.value = ''
  dialogVisible.value = true
}

/** 新建对话 */
async function handleCreateConversation() {
  if (!selectedAgentId.value) {
    ElMessage.warning('请选择一个 Agent')
    return
  }
  dialogLoading.value = true
  try {
    const data: { agentId: number; title?: string } = {
      agentId: selectedAgentId.value,
    }
    if (newTitle.value.trim()) {
      data.title = newTitle.value.trim()
    }
    const conversation = await chatStore.addConversation(data)
    dialogVisible.value = false
    ElMessage.success('创建对话成功')
    router.push(`/chat/${conversation.id}`)
  } catch {
    // request.ts 已统一提示
  } finally {
    dialogLoading.value = false
  }
}

/** 删除对话 */
async function handleDelete(conversationId: number) {
  try {
    await ElMessageBox.confirm('确定删除该对话吗？删除后不可恢复。', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await chatStore.removeConversation(conversationId)
    ElMessage.success('删除成功')
  } catch {
    // 用户取消或 request.ts 已提示
  }
}

onMounted(async () => {
  const promises: Promise<void>[] = []
  promises.push(chatStore.fetchConversations().catch(() => {}))
  promises.push(
    getAgentList()
      .then((res) => {
        agents.value = res.data.data
      })
      .catch(() => {}),
  )
  await Promise.all(promises)
})
</script>

<template>
  <div class="chat-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">对话</h2>
      <el-button type="primary" :icon="Plus" @click="handleOpenDialog">
        新建对话
      </el-button>
    </div>

    <!-- 对话卡片网格 -->
    <div v-loading="chatStore.loading" class="conversation-grid">
      <template v-if="chatStore.conversations.length">
        <el-card
          v-for="conv in chatStore.conversations"
          :key="conv.id"
          class="conversation-card"
          shadow="hover"
        >
          <div class="card-body" @click="handleCardClick(conv.id)">
            <div class="card-left">
              <div class="conv-avatar" :style="{ background: avatarColor(conv.id) }">
                <el-icon :size="22" color="#fff"><ChatDotRound /></el-icon>
              </div>
            </div>
            <div class="card-right">
              <div class="conv-title" :title="conv.title || '未命名对话'">
                {{ conv.title || '未命名对话' }}
              </div>
              <div class="conv-agent">
                <span class="agent-name">{{ getAgentName(conv.agentId) }}</span>
                <el-tag v-if="getAgentModel(conv.agentId)" size="small" type="info" class="model-tag">
                  {{ getAgentModel(conv.agentId) }}
                </el-tag>
              </div>
              <div class="conv-time">{{ formatTime(conv.updatedAt || conv.createdAt) }}</div>
            </div>
          </div>
          <div class="card-footer">
            <el-button text size="small" @click="handleCardClick(conv.id)">继续对话</el-button>
            <el-button text size="small" type="danger" @click.stop="handleDelete(conv.id)">删除</el-button>
          </div>
        </el-card>
      </template>

      <!-- 空状态 -->
      <div v-if="!chatStore.loading && !chatStore.conversations.length" class="empty-state">
        <el-icon :size="48" color="var(--color-text-light)"><ChatDotRound /></el-icon>
        <p>暂无对话，点击上方按钮开始</p>
      </div>
    </div>

    <!-- 新建对话对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="新建对话"
      width="460px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form label-position="top">
        <el-form-item label="选择 Agent" required>
          <el-select
            v-model="selectedAgentId"
            placeholder="请选择 Agent"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="agent in agents"
              :key="agent.id"
              :label="agent.name"
              :value="agent.id"
            >
              <div class="agent-option">
                <span>{{ agent.name }}</span>
                <span class="agent-option-model">{{ agent.model }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="对话标题">
          <el-input
            v-model="newTitle"
            placeholder="可选，不填则自动生成"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dialogLoading" @click="handleCreateConversation">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.chat-page {
  background: var(--color-bg-card);
  border-radius: var(--radius-base);
  padding: 24px;
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
  margin: 0;
}

.conversation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  min-height: 200px;
}

.conversation-card {
  transition: transform 0.2s, box-shadow 0.2s;
  border-radius: var(--radius-base);
}

.conversation-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.conversation-card :deep(.el-card__body) {
  padding: 0;
}

.card-body {
  display: flex;
  gap: 16px;
  padding: 20px;
  cursor: pointer;
}

.card-left {
  flex-shrink: 0;
}

.conv-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conv-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-agent {
  display: flex;
  align-items: center;
  gap: 6px;
}

.agent-name {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.model-tag {
  flex-shrink: 0;
}

.conv-time {
  font-size: 12px;
  color: var(--color-text-light);
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  padding: 10px 20px;
  border-top: 1px solid var(--color-border);
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 12px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

/* Agent 选择下拉选项 */
.agent-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.agent-option-model {
  font-size: 12px;
  color: var(--color-text-light);
}
</style>
