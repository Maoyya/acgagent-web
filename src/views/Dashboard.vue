<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { getAgentList } from '@/api/agent'
import type { AgentVO } from '@/types'
import { Odometer, Monitor, ChatDotRound } from '@element-plus/icons-vue'

const router = useRouter()
const chatStore = useChatStore()

const agents = ref<AgentVO[]>([])
const loading = ref(false)

const recentConversations = computed(() =>
  chatStore.conversations.slice(0, 5),
)

const quickActions = [
  {
    title: '新建对话',
    description: '选择 Agent 开始一段新对话',
    icon: ChatDotRound,
    route: '/chat',
  },
  {
    title: 'Agent 管理',
    description: '创建和管理你的 AI Agent',
    icon: Monitor,
    route: '/agents',
  },
  {
    title: '系统概览',
    description: '查看用户、角色与权限配置',
    icon: Odometer,
    route: '/system/users',
  },
]

function navigateTo(route: string) {
  router.push(route)
}

function continueConversation(id: number) {
  router.push(`/chat/${id}`)
}

function formatTime(dateStr: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      chatStore.fetchConversations(),
      getAgentList().then((res) => {
        agents.value = res.data.data
      }),
    ])
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="dashboard">
    <!-- 欢迎区域 -->
    <div class="welcome-card">
      <h1 class="welcome-title">欢迎回来</h1>
      <p class="welcome-subtitle">
        你有 {{ agents.length }} 个 Agent，{{ chatStore.conversations.length }} 段对话记录
      </p>
    </div>

    <!-- 快捷操作 -->
    <h2 class="section-title">快捷操作</h2>
    <div class="quick-actions">
      <div
        v-for="action in quickActions"
        :key="action.route"
        class="action-card"
        @click="navigateTo(action.route)"
      >
        <div class="action-icon-circle">
          <el-icon :size="24">
            <component :is="action.icon" />
          </el-icon>
        </div>
        <div class="action-title">{{ action.title }}</div>
        <div class="action-desc">{{ action.description }}</div>
      </div>
    </div>

    <!-- 最近对话 -->
    <h2 class="section-title">最近对话</h2>
    <el-card class="recent-card" shadow="never">
      <el-table
        :data="recentConversations"
        v-loading="loading"
        style="width: 100%"
      >
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <span class="conv-title">{{ row.title || '未命名对话' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="agentId" label="Agent ID" width="120" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            <span class="conv-time">{{ formatTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              @click="continueConversation(row.id)"
            >
              继续对话
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无对话记录" :image-size="80" />
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 960px;
  margin: 0 auto;
}

/* 欢迎卡片 */
.welcome-card {
  background: linear-gradient(135deg, var(--color-sidebar) 0%, #2d3436 100%);
  color: #ffffff;
  padding: 32px;
  border-radius: 12px;
  margin-bottom: 32px;
}

.welcome-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.welcome-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

/* 区域标题 */
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 16px;
}

/* 快捷操作卡片网格 */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.action-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-base);
  padding: 24px 20px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: var(--shadow-sm);
  text-align: center;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.action-icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(233, 69, 96, 0.1);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
}

.action-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}

.action-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* 最近对话表格 */
.recent-card {
  border-radius: var(--radius-base);
}

.recent-card :deep(.el-card__body) {
  padding: 0;
}

.conv-title {
  font-weight: 500;
}

.conv-time {
  color: var(--color-text-secondary);
  font-size: 13px;
}
</style>
