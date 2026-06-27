<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Film, FolderOpened } from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()
const loaded = ref(false)

const quickActions = [
  {
    title: '创作工坊',
    description: 'AI 视频创作，五步出片',
    icon: Film,
    route: '/workshop/new',
    gradient: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
    delay: 0,
  },
  {
    title: '素材库',
    description: '管理你的创作素材和资源',
    icon: FolderOpened,
    route: '/assets',
    gradient: 'linear-gradient(135deg, #00b894 0%, #55efc4 100%)',
    delay: 0.1,
  },
]

function navigateTo(route: string) {
  router.push(route)
}

onMounted(() => {
  requestAnimationFrame(() => {
    loaded.value = true
  })
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
            <span class="hero-title-line">欢迎回来，{{ authStore.userInfo?.nickname || authStore.userInfo?.username || '创作者' }}</span>
            <span class="hero-title-accent">创造你的 AI 影像世界</span>
          </h1>
          <p class="hero-subtitle">
            从故事梗概到成片输出，AI 全流程辅助创作
          </p>
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
          v-for="action in quickActions"
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
          </div>
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
  grid-template-columns: repeat(2, 1fr);
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
