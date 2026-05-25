<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Edit,
  Film,
  User,
  Picture,
  VideoCamera,
  Refresh,
} from '@element-plus/icons-vue'

const currentStep = ref(0)
const loading = ref(false)

const steps = [
  { title: '故事梗概', icon: Edit, description: '输入故事创意，AI 帮你扩展' },
  { title: '剧情扩展', icon: Film, description: 'AI 生成完整剧情' },
  { title: '分镜生成', icon: Picture, description: '拆分镜头，生成描述' },
  { title: '角色设计', icon: User, description: 'AI 设计角色外貌' },
  { title: '视频生成', icon: VideoCamera, description: '生成最终视频片段' },
]

// Mock 数据
const storyInput = ref('一个少女在雨夜的东京街头，意外捡到了一只会说话的黑猫。黑猫告诉她，它是来自平行世界的守护者，而她被选中成为新的世界守护人。')

const mockPlot = ref(`## 第一章：雨夜的邂逅

四月的东京，细雨绵绵。十七岁的�的少女�的林月独自走在涩谷的街头，刚刚结束了补习班的课程。

忽然，小巷里传来一声微弱的猫叫。她循声望去，一只浑身湿透的黑猫蜷缩在纸箱旁。

"救救我..."

林月惊讶地发现，声音竟然是从那只猫的口中传出的。

## 第二章：守护者的秘密

黑猫自称"影"，来自平行世界"�的暗域"。它告诉林月，两个世界之间的平衡正在崩溃，而林月体内沉睡着远古守护者的血脉。

"你是唯一能拯救两个世界的人。"影用深邃的金色眼睛注视着她。

## 第三章：觉醒

在影的引导下，林月开始学习控制自己的守护之力。每一次修炼，她都能感受到体内沉睡的力量正在苏醒...`)

const mockStoryboards = ref([
  { id: 1, shot: '远景', description: '雨夜涩谷十字路口，霓虹灯倒映在湿润的地面上，行人撑伞匆匆而过', duration: '3s', movement: '缓慢推进', dialogue: '' },
  { id: 2, shot: '中景', description: '林月走出补习班大楼，撑开透明雨伞', duration: '2s', movement: '跟随', dialogue: '' },
  { id: 3, shot: '近景', description: '小巷角落，一只黑猫蜷缩在湿纸箱旁，金色眼睛闪烁', duration: '2s', movement: '静止', dialogue: '救救我...' },
  { id: 4, shot: '特写', description: '林月惊讶的表情，瞳孔微缩', duration: '1s', movement: '推近', dialogue: '' },
  { id: 5, shot: '中景', description: '林月蹲下，小心翼翼地伸出手触摸黑猫', duration: '3s', movement: '静止', dialogue: '你...你在说话？' },
])

const mockCharacters = ref([
  { id: 1, name: '林月', role: '主角', description: '17岁高中女生，黑色长发，身穿校服。性格安静内向，但内心坚强。觉醒后拥有操控光影的能力。', color: '#4a90d9' },
  { id: 2, name: '影', role: '引导者', description: '来自暗域的黑猫，金色眼睛，体型比普通猫略大。实际上是暗域的前任守护者，因力量衰退而化为猫形。', color: '#2d3436' },
])

const mockVideos = ref([
  { id: 1, title: '第1镜 - 雨夜涩谷', status: '已完成', thumbnail: '' },
  { id: 2, title: '第2镜 - 林月出场', status: '生成中...', thumbnail: '' },
  { id: 3, title: '第3镜 - 黑猫登场', status: '等待中', thumbnail: '' },
])

function handleGenerate() {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    ElMessage.success('生成完成（Mock 数据）')
  }, 1500)
}

function nextStep() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

</script>

<template>
  <div class="workshop">
    <!-- 步骤条 -->
    <div class="steps-card">
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step v-for="(step, index) in steps" :key="index" :title="step.title" :icon="step.icon" />
      </el-steps>
    </div>

    <!-- 内容区 -->
    <div class="content-card">
      <!-- 第1步：故事梗概 -->
      <template v-if="currentStep === 0">
        <div class="step-header">
          <h3>故事梗概</h3>
          <p class="step-desc">输入你的故事创意，AI 将帮你扩展为完整剧情</p>
        </div>
        <el-input
          v-model="storyInput"
          type="textarea"
          :rows="8"
          placeholder="描述你的故事创意..."
          class="story-input"
          maxlength="5000"
          show-word-limit
        />
      </template>

      <!-- 第2步：剧情扩展 -->
      <template v-if="currentStep === 1">
        <div class="step-header">
          <h3>剧情扩展</h3>
          <p class="step-desc">AI 根据你的梗概生成的完整剧情</p>
        </div>
        <div class="plot-content">
          <div v-html="mockPlot.replace(/\n/g, '<br/>')"></div>
        </div>
      </template>

      <!-- 第3步：分镜生成 -->
      <template v-if="currentStep === 2">
        <div class="step-header">
          <h3>分镜生成</h3>
          <p class="step-desc">AI 自动拆分镜头，生成镜头描述</p>
        </div>
        <div class="storyboard-grid">
          <el-card v-for="shot in mockStoryboards" :key="shot.id" class="shot-card" shadow="hover">
            <div class="shot-number">镜头 {{ shot.id }}</div>
            <div class="shot-meta">
              <el-tag size="small" type="info">{{ shot.shot }}</el-tag>
              <el-tag size="small">{{ shot.duration }}</el-tag>
              <el-tag size="small" type="warning">{{ shot.movement }}</el-tag>
            </div>
            <p class="shot-desc">{{ shot.description }}</p>
            <p v-if="shot.dialogue" class="shot-dialogue">"{{ shot.dialogue }}"</p>
          </el-card>
        </div>
      </template>

      <!-- 第4步：角色设计 -->
      <template v-if="currentStep === 3">
        <div class="step-header">
          <h3>角色设计</h3>
          <p class="step-desc">AI 生成的角色外貌描述</p>
        </div>
        <div class="character-grid">
          <el-card v-for="char in mockCharacters" :key="char.id" class="character-card" shadow="hover">
            <div class="character-avatar" :style="{ background: char.color }">
              {{ char.name[0] }}
            </div>
            <div class="character-info">
              <div class="character-name">{{ char.name }}</div>
              <el-tag size="small" type="info">{{ char.role }}</el-tag>
              <p class="character-desc">{{ char.description }}</p>
            </div>
          </el-card>
        </div>
      </template>

      <!-- 第5步：视频生成 -->
      <template v-if="currentStep === 4">
        <div class="step-header">
          <h3>视频生成</h3>
          <p class="step-desc">AI 根据分镜和角色生成视频片段</p>
        </div>
        <div class="video-grid">
          <el-card v-for="video in mockVideos" :key="video.id" class="video-card" shadow="hover">
            <div class="video-thumbnail">
              <el-icon :size="40" color="#b2bec3"><VideoCamera /></el-icon>
            </div>
            <div class="video-info">
              <div class="video-title">{{ video.title }}</div>
              <el-tag :type="video.status === '已完成' ? 'success' : video.status === '生成中...' ? 'warning' : 'info'" size="small">
                {{ video.status }}
              </el-tag>
            </div>
          </el-card>
        </div>
      </template>

      <!-- 操作按钮 -->
      <div class="step-actions">
        <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="handleGenerate">
          重新生成
        </el-button>
        <el-button v-if="currentStep < steps.length - 1" type="primary" @click="nextStep">
          下一步
        </el-button>
        <el-button v-if="currentStep === steps.length - 1" type="success" disabled>
          导出项目
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workshop {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.steps-card,
.content-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-base);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.step-header {
  margin-bottom: 20px;
}

.step-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}

.step-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.story-input :deep(.el-textarea__inner) {
  font-size: 14px;
  line-height: 1.8;
  border-radius: var(--radius-base);
}

.plot-content {
  background: var(--color-bg);
  padding: 20px;
  border-radius: var(--radius-base);
  line-height: 1.8;
  font-size: 14px;
  color: var(--color-text);
  max-height: 500px;
  overflow-y: auto;
}

.storyboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.shot-card {
  transition: transform 0.2s;
}

.shot-card:hover {
  transform: translateY(-2px);
}

.shot-number {
  font-weight: 600;
  font-size: 14px;
  color: var(--color-primary);
  margin-bottom: 8px;
}

.shot-meta {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.shot-desc {
  font-size: 13px;
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: 4px;
}

.shot-dialogue {
  font-size: 13px;
  color: var(--color-primary);
  font-style: italic;
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.character-card {
  transition: transform 0.2s;
}

.character-card:hover {
  transform: translateY(-2px);
}

.character-card :deep(.el-card__body) {
  display: flex;
  gap: 16px;
}

.character-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  flex-shrink: 0;
}

.character-info {
  flex: 1;
}

.character-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}

.character-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-top: 8px;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.video-card {
  transition: transform 0.2s;
}

.video-card:hover {
  transform: translateY(-2px);
}

.video-thumbnail {
  height: 140px;
  background: var(--color-bg);
  border-radius: var(--radius-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.video-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.video-title {
  font-weight: 500;
  font-size: 14px;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}
</style>
