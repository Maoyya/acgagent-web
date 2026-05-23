<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { getAgentList } from '@/api/agent'
import type { AgentVO, ConversationVO } from '@/types'
import { ChatDotRound, Monitor, Film, ArrowRight } from '@element-plus/icons-vue'

const router = useRouter()
const chatStore = useChatStore()

const agents = ref<AgentVO[]>([])
const loading = ref(false)
const loaded = ref(false)

const recentConversations = computed(() =>
  chatStore.conversations.slice(0, 6),
)

const stats = computed(() => [
  { label: 'Agent', value: agents.value.length, suffix: '个' },
  { label: '对话', value: chatStore.conversations.length, suffix: '条' },
  { label: '今日', value: Math.min(3, chatStore.conversations.length), suffix: '活跃' },
])

const quickActions = [
  {
    title: '新建对话',
    description: '选择 Agent，开始 AI 对话',
    icon: ChatDotRound,
    route: '/chat',
    gradient: 'linear-gradient(135deg, #e94560 0%, #ff6b81 100%)',
    delay: 0,
  },
  {
    title: '创作工坊',
    description: 'AI 视频创作，五步出片',
    icon: Film,
    route: '/workshop/new',
    gradient: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
    delay: 0.1,
  },
  {
    title: 'Agent 管理',
    description: '配置和部署你的 AI 助手',
    icon: Monitor,
    route: '/agents',
    gradient: 'linear-gradient(135deg, #00b894 0%, #55efc4 100%)',
    delay: 0.2,
  },
]

function navigateTo(route: string) {
  router.push(route)
}

function continueConversation(conv: ConversationVO) {
  router.push(`/chat/${conv.id}`)
}

function formatTime(dateStr: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} 小时前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
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
    requestAnimationFrame(() => {
      loaded.value = true
    })
  }
})
</script>

<template>
  <div class="dashboard" :class="{ 'dashboard--loaded': loaded }">
    <!-- Hero 区域 -->
    <section class="hero">
      <div class="hero-bg">
        <div class="hero-gradient-orb hero-gradient-orb--1"></div>
        <div class="hero-gradient-orb hero-gradient-orb--2"></div>
        <div class="hero-noise"></div>
      </div>
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">
            <span class="hero-title-line">创造你的</span>
            <span class="hero-title-accent">AI 影像世界</span>
          </h1>
          <p class="hero-subtitle">
            从故事梗概到成片输出，AI 全流程辅助创作
          </p>
        </div>
        <!-- 统计数字 -->
        <div class="stats-row">
          <div v-for="stat in stats" :key="stat.label" class="stat-item">
            <span class="stat-value">{{ stat.value }}<span class="stat-suffix">{{ stat.suffix }}</span></span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 快捷入口 -->
    <section class="actions-section">
      <div class="section-header">
        <h2 class="section-title">快速开始</h2>
        <span class="section-tag">选择一个入口开始创作</span>
      </div>
      <div class="actions-grid">
        <div
          v-for="(action, idx) in quickActions"
          :key="action.route"
          class="action-card"
          :style="{ '--card-delay': `${action.delay}s` }"
          @click="navigateTo(action.route)"
        >
          <div class="action-glow" :style="{ background: action.gradient }"></div>
          <div class="action-inner">
            <div class="action-icon-wrap" :style="{ background: action.gradient }">
              <el-icon :size="22"><component :is="action.icon" /></el-icon>
            </div>
            <div class="action-body">
              <div class="action-title">{{ action.title }}</div>
              <div class="action-desc">{{ action.description }}</div>
            </div>
            <el-icon class="action-arrow"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </section>

    <!-- 最近对话 -->
    <section class="conversations-section">
      <div class="section-header">
        <h2 class="section-title">最近对话</h2>
        <el-button v-if="chatStore.conversations.length > 0" link type="primary" @click="navigateTo('/chat')">
          查看全部 <el-icon class="el-icon--right"><ArrowRight /></el-icon>
        </el-button>
      </div>

      <div v-if="loading" class="conv-loading">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else-if="recentConversations.length === 0" class="conv-empty">
        <div class="conv-empty-icon">
          <el-icon :size="40"><ChatDotRound /></el-icon>
        </div>
        <p>还没有对话记录</p>
        <el-button type="primary" round @click="navigateTo('/chat')">开始第一段对话</el-button>
      </div>

      <div v-else class="conv-grid">
        <div
          v-for="conv in recentConversations"
          :key="conv.id"
          class="conv-card"
          @click="continueConversation(conv)"
        >
          <div class="conv-indicator"></div>
          <div class="conv-body">
            <div class="conv-title">{{ conv.title || '未命名对话' }}</div>
            <div class="conv-meta">
              <span class="conv-agent">Agent #{{ conv.agentId }}</span>
              <span class="conv-dot"></span>
              <span class="conv-time">{{ formatTime(conv.createdAt) }}</span>
            </div>
          </div>
          <el-icon class="conv-arrow"><ArrowRight /></el-icon>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1040px;
  margin: 0 auto;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.dashboard--loaded {
  opacity: 1;
  transform: translateY(0);
}

/* ===== Hero ===== */
.hero {
  position: relative;
  border-radius: 16px;
  padding: 48px 40px 40px;
  overflow: hidden;
  color: #fff;
  margin-bottom: 32px;
}

.hero-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: #0f0f1a;
}

.hero-gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
}

.hero-gradient-orb--1 {
  width: 400px;
  height: 400px;
  background: #e94560;
  top: -120px;
  right: -60px;
  animation: orbFloat 8s ease-in-out infinite alternate;
}

.hero-gradient-orb--2 {
  width: 300px;
  height: 300px;
  background: #6c5ce7;
  bottom: -80px;
  left: -40px;
  animation: orbFloat 10s ease-in-out infinite alternate-reverse;
}

.hero-noise {
  position: absolute;
  inset: 0;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 128px;
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 40px;
}

.hero-text {
  flex: 1;
}

.hero-title {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}

.hero-title-line {
  display: block;
  color: rgba(255, 255, 255, 0.85);
}

.hero-title-accent {
  display: block;
  background: linear-gradient(135deg, #e94560, #ff6b81, #fda085);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 400;
}

/* 统计 */
.stats-row {
  display: flex;
  gap: 32px;
  flex-shrink: 0;
}

.stat-item {
  text-align: center;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  min-width: 90px;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  font-family: 'DM Sans', sans-serif;
  color: #fff;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-suffix {
  font-size: 13px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.5);
}

.stat-label {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* ===== Section Header ===== */
.section-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
}

.section-tag {
  font-size: 13px;
  color: var(--color-text-light);
}

/* ===== Actions ===== */
.actions-section {
  margin-bottom: 32px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.action-card {
  position: relative;
  border-radius: 14px;
  cursor: pointer;
  overflow: hidden;
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  animation: cardSlideUp 0.5s ease backwards;
  animation-delay: var(--card-delay);
}

.action-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.action-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0.8;
}

.action-inner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.action-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.action-body {
  flex: 1;
  min-width: 0;
}

.action-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 2px;
}

.action-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-arrow {
  color: var(--color-text-light);
  font-size: 14px;
  transition: transform 0.2s, color 0.2s;
}

.action-card:hover .action-arrow {
  transform: translateX(3px);
  color: var(--color-primary);
}

/* ===== Conversations ===== */
.conversations-section {
  margin-bottom: 32px;
}

.conv-loading {
  background: var(--color-bg-card);
  border-radius: var(--radius-base);
  padding: 24px;
}

.conv-empty {
  text-align: center;
  padding: 48px 24px;
  background: var(--color-bg-card);
  border-radius: var(--radius-base);
  color: var(--color-text-secondary);
}

.conv-empty-icon {
  color: var(--color-text-light);
  margin-bottom: 12px;
}

.conv-empty p {
  margin-bottom: 16px;
  font-size: 14px;
}

.conv-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.conv-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: var(--color-bg-card);
  border-radius: 12px;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s, box-shadow 0.2s;
}

.conv-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.conv-indicator {
  width: 4px;
  height: 36px;
  border-radius: 4px;
  background: var(--color-primary);
  flex-shrink: 0;
  opacity: 0.6;
}

.conv-card:hover .conv-indicator {
  opacity: 1;
}

.conv-body {
  flex: 1;
  min-width: 0;
}

.conv-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.conv-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-light);
}

.conv-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-text-light);
}

.conv-arrow {
  color: var(--color-text-light);
  font-size: 12px;
  transition: transform 0.2s, color 0.2s;
}

.conv-card:hover .conv-arrow {
  transform: translateX(2px);
  color: var(--color-primary);
}

/* ===== Animations ===== */
@keyframes orbFloat {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(20px, -20px) scale(1.05); }
}

@keyframes cardSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
