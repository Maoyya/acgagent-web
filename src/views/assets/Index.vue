<script setup lang="ts">
import { ref, computed } from 'vue'
import { Picture, VideoCamera } from '@element-plus/icons-vue'

type AssetType = 'all' | 'image' | 'video'

const activeFilter = ref<AssetType>('all')

// Mock 数据
const mockAssets = ref([
  { id: 1, name: '雨夜涩谷街景', type: 'image' as const, createdAt: '2026-05-20T10:30:00', size: '2.4 MB' },
  { id: 2, name: '林月角色三视图', type: 'image' as const, createdAt: '2026-05-20T11:00:00', size: '3.1 MB' },
  { id: 3, name: '黑猫特写', type: 'image' as const, createdAt: '2026-05-21T09:15:00', size: '1.8 MB' },
  { id: 4, name: '第1镜动画', type: 'video' as const, createdAt: '2026-05-22T14:00:00', size: '15.2 MB' },
  { id: 5, name: '第2镜动画', type: 'video' as const, createdAt: '2026-05-22T15:30:00', size: '12.8 MB' },
  { id: 6, name: '巷口场景概念图', type: 'image' as const, createdAt: '2026-05-23T08:00:00', size: '4.5 MB' },
  { id: 7, name: '第3镜动画', type: 'video' as const, createdAt: '2026-05-23T16:00:00', size: '18.1 MB' },
  { id: 8, name: '影（黑猫）角色设定图', type: 'image' as const, createdAt: '2026-05-24T10:00:00', size: '2.9 MB' },
])

const filteredAssets = computed(() => {
  if (activeFilter.value === 'all') return mockAssets.value
  return mockAssets.value.filter((a) => a.type === activeFilter.value)
})

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('zh-CN')
}
</script>

<template>
  <div class="assets-page">
    <div class="page-header">
      <div>
        <h2>素材库</h2>
        <p class="subtitle">管理项目中的图片和视频素材</p>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-radio-group v-model="activeFilter" size="default">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="image">图片</el-radio-button>
        <el-radio-button value="video">视频</el-radio-button>
      </el-radio-group>
      <span class="count">{{ filteredAssets.length }} 个素材</span>
    </div>

    <!-- 素材网格 -->
    <div class="asset-grid">
      <el-card
        v-for="asset in filteredAssets"
        :key="asset.id"
        class="asset-card"
        shadow="hover"
      >
        <div class="asset-thumbnail" :class="{ 'asset-thumbnail--video': asset.type === 'video' }">
          <el-icon :size="36">
            <Picture v-if="asset.type === 'image'" />
            <VideoCamera v-else />
          </el-icon>
        </div>
        <div class="asset-info">
          <div class="asset-name" :title="asset.name">{{ asset.name }}</div>
          <div class="asset-meta">
            <el-tag :type="asset.type === 'image' ? 'info' : 'warning'" size="small">
              {{ asset.type === 'image' ? '图片' : '视频' }}
            </el-tag>
            <span class="asset-size">{{ asset.size }}</span>
          </div>
          <div class="asset-date">{{ formatDate(asset.createdAt) }}</div>
        </div>
      </el-card>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredAssets.length === 0" class="empty-state">
      <el-empty description="暂无素材" />
    </div>
  </div>
</template>

<style scoped>
.assets-page {
  background: var(--color-bg-card);
  border-radius: var(--radius-base);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
}

.subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.count {
  font-size: 13px;
  color: var(--color-text-light);
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.asset-card {
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.asset-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.asset-thumbnail {
  height: 140px;
  background: var(--color-bg);
  border-radius: var(--radius-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  color: var(--color-text-light);
}

.asset-thumbnail--video {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: rgba(255, 255, 255, 0.5);
}

.asset-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}

.asset-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.asset-size {
  font-size: 12px;
  color: var(--color-text-light);
}

.asset-date {
  font-size: 12px;
  color: var(--color-text-light);
}

.empty-state {
  padding: 60px 0;
  text-align: center;
}
</style>
