<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Edit,
  Film,
  User,
  Picture,
  VideoCamera,
  Refresh,
  Plus,
  Delete,
} from '@element-plus/icons-vue'
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  generateStoryboard as apiGenerateStoryboard,
  generateCharacters as apiGenerateCharacters,
  streamPlot,
} from '@/api/workshop'
import type { WorkshopProject, Shot, Character } from '@/types'
import { colorFromName } from './colorFromName'

const steps = [
  { title: '故事梗概', icon: Edit, description: '输入故事创意，AI 帮你扩展' },
  { title: '剧情扩展', icon: Film, description: 'AI 生成完整剧情' },
  { title: '分镜生成', icon: Picture, description: '拆分镜头，生成描述' },
  { title: '角色设计', icon: User, description: 'AI 设计角色外貌' },
  { title: '视频生成', icon: VideoCamera, description: '生成最终视频片段' },
]

// 步骤游标 + 项目状态
const currentStep = ref(0)
const projectList = ref<WorkshopProject[]>([])
const currentProject = ref<WorkshopProject | null>(null)
const projectId = ref<number | null>(null)

// 各步编辑区
const storyInput = ref('')
const plotText = ref('')
const storyboard = ref<Shot[]>([])
const characters = ref<Character[]>([])

// 各步 loading
const savingStory = ref(false)
const plotGenerating = ref(false)
const storyboardGenerating = ref(false)
const charactersGenerating = ref(false)

// 剧情流式生成的 AbortController：切换/新建/删除项目时主动取消在途流，
// 避免 A 项目的 content 事件继续追加到 B 项目的 plotText
const plotAbort = ref<AbortController | null>(null)

/** 清空各步编辑区（切换/删除项目时调用） */
function resetEditors() {
  storyInput.value = ''
  plotText.value = ''
  storyboard.value = []
  characters.value = []
}

/** 拉取项目列表 */
async function loadProjects() {
  try {
    const res = await listProjects()
    projectList.value = res.data.data ?? []
  } catch {
    ElMessage.error('加载项目列表失败')
  }
}

/** 切换项目：拉取详情并灌入各步 ref */
async function onSelectProject(id: number | null) {
  // 取消在途的剧情流（若 A 项目流到一半切到 B，content 不应再污染 B 的 plotText）
  plotAbort.value?.abort()
  projectId.value = id
  if (!id) {
    currentProject.value = null
    resetEditors()
    return
  }
  try {
    const res = await getProject(id)
    currentProject.value = res.data.data
    storyInput.value = currentProject.value?.story ?? ''
    plotText.value = currentProject.value?.plot ?? ''
    storyboard.value = currentProject.value?.storyboard ?? []
    characters.value = currentProject.value?.characters ?? []
  } catch {
    ElMessage.error('加载项目失败')
  }
}

/** 新建项目：createProject({}) → 刷新列表 → 切换到新项目 */
async function onCreateProject() {
  // 取消在途的剧情流（项目上下文即将变更）
  plotAbort.value?.abort()
  try {
    const res = await createProject({})
    const created = res.data.data
    await loadProjects()
    await onSelectProject(created.id)
    ElMessage.success('已新建项目')
  } catch {
    ElMessage.error('新建项目失败')
  }
}

/** 删除当前项目（带二次确认） */
async function onDeleteProject() {
  if (!currentProject.value) return
  // 取消在途的剧情流（currentProject 即将被清空，回调里 currentProject.value! 会抛错）
  plotAbort.value?.abort()
  try {
    // 用户确认；取消则直接返回，不报错
    await ElMessageBox.confirm('确认删除当前项目？删除后不可恢复。', '删除项目', {
      type: 'warning',
    })
  } catch {
    return
  }
  const id = currentProject.value.id
  try {
    await deleteProject(id)
    await loadProjects()
    projectId.value = null
    currentProject.value = null
    resetEditors()
    ElMessage.success('已删除')
  } catch {
    ElMessage.error('删除失败')
  }
}

/** ① 保存故事梗概到后端 */
async function saveStory() {
  if (!currentProject.value) {
    ElMessage.warning('请先选择项目')
    return
  }
  savingStory.value = true
  try {
    await updateProject(currentProject.value.id, { story: storyInput.value })
    currentProject.value.story = storyInput.value
    ElMessage.success('已保存')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    savingStory.value = false
  }
}

/** ② 生成剧情（SSE 流式：增量 content → plotText；done → 落库） */
async function generatePlot() {
  if (!currentProject.value) {
    ElMessage.warning('请先选择项目')
    return
  }
  if (!storyInput.value.trim()) {
    ElMessage.warning('请先输入故事梗概')
    return
  }
  // 取消上一次在途的流（如有），避免新旧流的 content 事件交错追加
  plotAbort.value?.abort()
  const controller = new AbortController()
  plotAbort.value = controller
  plotGenerating.value = true
  plotText.value = ''
  try {
    await streamPlot({ story: storyInput.value }, (e) => {
      // abort 后 streamPlot 不再回调；此处再加一道防护，确保不会向已被清空的 currentProject 写
      if (controller.signal.aborted) return
      if (e.type === 'content' && e.content) {
        // 增量 token 累加，实时渲染
        plotText.value += e.content
      } else if (e.type === 'done') {
        // 流结束：把累计剧情落库（不 await，避免阻塞 finally）
        // 先捕获 id/plot 局部量：若 HTTP 在途期间用户切换/删除项目，
        // DB 已用正确的 id 落库；本地写回仅在 currentProject 仍是同一项目时进行
        const id = currentProject.value!.id
        const plot = plotText.value
        void updateProject(id, { plot })
          .then(() => {
            if (currentProject.value?.id === id) {
              currentProject.value!.plot = plot
            }
            ElMessage.success('剧情已生成并保存')
          })
          .catch(() => ElMessage.error('剧情保存失败'))
      } else if (e.type === 'error') {
        ElMessage.error(e.message || '生成失败')
      }
    }, controller.signal)
  } catch (err) {
    // 主动 abort 触发的 AbortError 是预期行为，不报错；其余才提示
    if (!controller.signal.aborted) {
      ElMessage.error((err as Error).message || '生成失败')
    }
  } finally {
    // 仅当本次 controller 仍是当前活跃的那个时才清理：
    // 若已被更新的 generatePlot 替换，则 plotGenerating/plotAbort 由后者负责
    if (plotAbort.value === controller) {
      plotAbort.value = null
      plotGenerating.value = false
    }
  }
}

/** ③ 生成分镜（同步：plot → Shot[]，渲染并落库） */
async function generateStoryboard() {
  if (!currentProject.value) {
    ElMessage.warning('请先选择项目')
    return
  }
  if (!plotText.value.trim()) {
    ElMessage.warning('请先生成剧情')
    return
  }
  storyboardGenerating.value = true
  try {
    const res = await apiGenerateStoryboard({ plot: plotText.value })
    storyboard.value = res.data.data ?? []
    await updateProject(currentProject.value.id, { storyboard: storyboard.value })
    currentProject.value.storyboard = storyboard.value
    ElMessage.success('分镜已生成并保存')
  } catch {
    ElMessage.error('生成失败')
  } finally {
    storyboardGenerating.value = false
  }
}

/** ④ 生成角色（同步：plot → Character[]，渲染并落库） */
async function generateCharacters() {
  if (!currentProject.value) {
    ElMessage.warning('请先选择项目')
    return
  }
  if (!plotText.value.trim()) {
    ElMessage.warning('请先生成剧情')
    return
  }
  charactersGenerating.value = true
  try {
    const res = await apiGenerateCharacters({ plot: plotText.value })
    characters.value = res.data.data ?? []
    await updateProject(currentProject.value.id, { characters: characters.value })
    currentProject.value.characters = characters.value
    ElMessage.success('角色已生成并保存')
  } catch {
    ElMessage.error('生成失败')
  } finally {
    charactersGenerating.value = false
  }
}

/** 「重新生成」= 重跑当前步（① 为保存；⑤ 视频不在本期，禁用） */
function handleRegenerate() {
  switch (currentStep.value) {
    case 0:
      void saveStory()
      break
    case 1:
      void generatePlot()
      break
    case 2:
      void generateStoryboard()
      break
    case 3:
      void generateCharacters()
      break
    // case 4: 视频生成留空（占位 disabled）
  }
}

function nextStep() {
  if (currentStep.value < steps.length - 1) currentStep.value++
}

function prevStep() {
  if (currentStep.value > 0) currentStep.value--
}

const regenLoading = () =>
  savingStory.value ||
  plotGenerating.value ||
  storyboardGenerating.value ||
  charactersGenerating.value

// 暴露给测试（defineExpose 不影响生产）
defineExpose({
  currentStep,
  projectList,
  currentProject,
  projectId,
  storyInput,
  plotText,
  storyboard,
  characters,
  savingStory,
  plotGenerating,
  storyboardGenerating,
  charactersGenerating,
  loadProjects,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  saveStory,
  generatePlot,
  generateStoryboard,
  generateCharacters,
  handleRegenerate,
})

onMounted(() => {
  void loadProjects()
})
</script>

<template>
  <div class="workshop">
    <!-- 顶部：项目选择器 -->
    <div class="project-bar">
      <el-select
        v-model="projectId"
        placeholder="选择项目..."
        class="project-select"
        clearable
        @change="onSelectProject(projectId)"
      >
        <el-option
          v-for="p in projectList"
          :key="p.id"
          :label="p.title || `项目 #${p.id}`"
          :value="p.id"
        />
      </el-select>
      <el-button :icon="Plus" type="primary" @click="onCreateProject">新建项目</el-button>
      <el-button
        :icon="Delete"
        type="danger"
        :disabled="!currentProject"
        @click="onDeleteProject"
      >
        删除
      </el-button>
    </div>

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
        <div class="step-actions-inline">
          <el-button type="primary" :loading="savingStory" @click="saveStory">保存</el-button>
        </div>
      </template>

      <!-- 第2步：剧情扩展 -->
      <template v-if="currentStep === 1">
        <div class="step-header">
          <h3>剧情扩展</h3>
          <p class="step-desc">AI 根据你的梗概生成的完整剧情</p>
        </div>
        <div class="plot-content">
          <!-- plotText 来自 LLM 输出（不可信），用文本插值 + CSS white-space:pre-wrap 渲染换行，
               视觉等价于早期的 \n→<br/>，但避免 XSS。不渲染 Markdown。 -->
          <div v-if="plotText">{{ plotText }}</div>
          <div v-else class="empty-hint">点击下方"重新生成"开始扩展剧情</div>
        </div>
      </template>

      <!-- 第3步：分镜生成 -->
      <template v-if="currentStep === 2">
        <div class="step-header">
          <h3>分镜生成</h3>
          <p class="step-desc">AI 自动拆分镜头，生成镜头描述</p>
        </div>
        <div v-if="storyboard.length" class="storyboard-grid">
          <el-card
            v-for="(shot, idx) in storyboard"
            :key="idx"
            class="shot-card"
            shadow="hover"
          >
            <div class="shot-number">镜头 {{ idx + 1 }}</div>
            <div class="shot-meta">
              <el-tag size="small" type="info">{{ shot.shot }}</el-tag>
              <el-tag size="small">{{ shot.duration }}</el-tag>
              <el-tag size="small" type="warning">{{ shot.movement }}</el-tag>
            </div>
            <p class="shot-desc">{{ shot.description }}</p>
            <p v-if="shot.dialogue" class="shot-dialogue">"{{ shot.dialogue }}"</p>
          </el-card>
        </div>
        <div v-else class="empty-hint">点击下方"重新生成"拆分镜头</div>
      </template>

      <!-- 第4步：角色设计 -->
      <template v-if="currentStep === 3">
        <div class="step-header">
          <h3>角色设计</h3>
          <p class="step-desc">AI 生成的角色外貌描述</p>
        </div>
        <div v-if="characters.length" class="character-grid">
          <el-card
            v-for="(char, idx) in characters"
            :key="idx"
            class="character-card"
            shadow="hover"
          >
            <div class="character-avatar" :style="{ background: colorFromName(char.name) }">
              {{ char.name[0] }}
            </div>
            <div class="character-info">
              <div class="character-name">{{ char.name }}</div>
              <el-tag size="small" type="info">{{ char.role }}</el-tag>
              <p class="character-desc">{{ char.description }}</p>
            </div>
          </el-card>
        </div>
        <div v-else class="empty-hint">点击下方"重新生成"设计角色</div>
      </template>

      <!-- 第5步：视频生成（占位，本期不实现） -->
      <template v-if="currentStep === 4">
        <div class="step-header">
          <h3>视频生成</h3>
          <p class="step-desc">AI 根据分镜和角色生成视频片段</p>
        </div>
        <el-empty description="视频生成功能即将上线，敬请期待" />
      </template>

      <!-- 操作按钮 -->
      <div class="step-actions">
        <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
        <el-button
          :icon="Refresh"
          :loading="regenLoading()"
          :disabled="currentStep === 4"
          @click="handleRegenerate"
        >
          {{ currentStep === 0 ? '保存' : '重新生成' }}
        </el-button>
        <el-button v-if="currentStep < steps.length - 1" type="primary" @click="nextStep">
          下一步
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

.project-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  background: var(--color-bg-card);
  border-radius: var(--radius-base);
  padding: 16px 24px;
  box-shadow: var(--shadow-sm);
}

.project-select {
  width: 280px;
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
  /* 让 plotText 里的 \n 直接渲染为换行（取代早期 v-html 的 <br/> 注入，避免 XSS） */
  white-space: pre-wrap;
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

.step-actions-inline {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.empty-hint {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 32px 0;
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
