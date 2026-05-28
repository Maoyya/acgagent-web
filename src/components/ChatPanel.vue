<script setup lang="ts">
/**
 * 右侧滑入对话面板，包含 Agent 选择器、对话列表、消息展示和 SSE 流式发送。
 * 面板独立管理自身的对话状态（conversations、messages、selectedAgent）。
 */
import { ref, onMounted, nextTick, computed } from 'vue'
import { getAgentList } from '@/api/agent'
import {
  getConversations,
  getMessages,
  createConversation,
} from '@/api/chat'
import { useSSE } from '@/composables/useSSE'
import { ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import type { AgentVO, ConversationVO, MessageVO } from '@/types'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const { streaming, send, abort } = useSSE()

// --- Agent 列表 ---
const agents = ref<AgentVO[]>([])
const selectedAgentId = ref<number | null>(null)
const loadingAgents = ref(false)

// 只展示 category=CHAT 的 Agent
const chatAgents = computed(() =>
  agents.value.filter((a) => a.category === 'CHAT'),
)

// --- 对话列表与当前对话 ---
const conversations = ref<ConversationVO[]>([])
const currentConversationId = ref<number | null>(null)
const messages = ref<MessageVO[]>([])
const loadingMessages = ref(false)
const messagesRef = ref<HTMLElement>()

// --- 输入 ---
const inputText = ref('')

/** 是否正在查看某个对话 */
const inConversation = computed(() => currentConversationId.value !== null)

/** 当前对话的标题 */
const conversationTitle = computed(() => {
  if (!currentConversationId.value) return ''
  const conv = conversations.value.find(
    (c) => c.id === currentConversationId.value,
  )
  return conv?.title ?? '对话'
})

// ---- 初始化 ----

onMounted(async () => {
  await fetchAgents()
  await fetchConversations()
})

async function fetchAgents() {
  loadingAgents.value = true
  try {
    const res = await getAgentList()
    agents.value = res.data.data ?? []
  } catch {
    ElMessage.error('加载 Agent 列表失败')
  } finally {
    loadingAgents.value = false
  }
}

async function fetchConversations() {
  try {
    const res = await getConversations()
    conversations.value = res.data.data ?? []
  } catch {
    ElMessage.error('加载对话列表失败')
  }
}

// ---- Agent 选择 → 创建新对话 ----

async function onAgentChange(agentId: number) {
  selectedAgentId.value = agentId
  const agent = agents.value.find((a) => a.id === agentId)
  const title = agent ? `与 ${agent.name} 对话` : '新对话'

  try {
    const res = await createConversation({ agentId, title })
    const conv = res.data.data
    conversations.value.unshift(conv)
    enterConversation(conv.id)
  } catch {
    ElMessage.error('创建对话失败')
  }
}

// ---- 对话列表操作 ----

async function enterConversation(convId: number) {
  currentConversationId.value = convId
  loadingMessages.value = true
  try {
    const res = await getMessages(convId)
    messages.value = res.data.data ?? []
    scrollToBottom()
  } catch {
    ElMessage.error('加载消息失败')
  } finally {
    loadingMessages.value = false
  }
}

/** 返回对话列表 */
function backToList() {
  currentConversationId.value = null
  messages.value = []
}

// ---- 发送消息 ----

function handleSend() {
  const content = inputText.value.trim()
  const convId = currentConversationId.value
  if (!content || !convId || streaming.value) return

  inputText.value = ''

  // 用户消息（本地临时）
  messages.value.push({
    id: Date.now(),
    conversationId: convId,
    role: 'user',
    content,
    tokens: null,
    createdAt: new Date().toISOString(),
  })

  // 空的 assistant 占位消息
  messages.value.push({
    id: -1,
    conversationId: convId,
    role: 'assistant',
    content: '',
    tokens: null,
    createdAt: new Date().toISOString(),
  })

  scrollToBottom()

  send(
    `/api/chat/conversations/${convId}/send`,
    { content },
    // onChunk: 累计完整文本，更新最后一条 assistant 消息
    (fullText) => {
      const lastMsg = messages.value[messages.value.length - 1]
      if (lastMsg && lastMsg.role === 'assistant') {
        lastMsg.content = fullText
      }
      scrollToBottom()
    },
    // onDone
    () => {},
    // onError
    (error) => {
      ElMessage.error(error.message || '发送失败')
    },
  )
}

function scrollToBottom() {
  nextTick(() => {
    const el = messagesRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

// ---- 关闭面板 ----

function closePanel() {
  emit('update:visible', false)
}

/** 点击遮罩层关闭面板 */
function onBackdropClick() {
  closePanel()
}

/** 拦截面板内容区点击，防止冒泡到遮罩层 */
function onPanelClick(e: MouseEvent) {
  e.stopPropagation()
}
</script>

<template>
  <!-- 遮罩层：面板打开时覆盖整个视口 -->
  <Transition name="panel-overlay">
    <div
      v-if="visible"
      class="chat-panel-backdrop"
      @click="onBackdropClick"
    >
      <!-- 面板主体 -->
      <Transition name="panel-slide">
        <div
          v-if="visible"
          class="chat-panel"
          @click="onPanelClick"
        >
          <!-- 顶栏 -->
          <div class="panel-header">
            <el-button
              text
              class="close-btn"
              @click="closePanel"
            >
              <el-icon :size="18"><Close /></el-icon>
            </el-button>
            <span class="panel-title">
              {{ inConversation ? conversationTitle : '对话' }}
            </span>
            <el-button
              v-if="inConversation"
              text
              class="back-btn"
              @click="backToList"
            >
              返回
            </el-button>
          </div>

          <!-- Agent 选择器 -->
          <div class="panel-agent-selector">
            <el-select
              v-model="selectedAgentId"
              placeholder="选择 Agent"
              :loading="loadingAgents"
              clearable
              @change="onAgentChange"
            >
              <el-option
                v-for="agent in chatAgents"
                :key="agent.id"
                :label="agent.name"
                :value="agent.id"
              />
            </el-select>
          </div>

          <!-- 对话列表模式 -->
          <div
            v-if="!inConversation"
            class="panel-conversations"
          >
            <div
              v-for="conv in conversations"
              :key="conv.id"
              class="conversation-item"
              @click="enterConversation(conv.id)"
            >
              <div class="conversation-item-title">{{ conv.title }}</div>
              <div class="conversation-item-time">{{ conv.updatedAt }}</div>
            </div>
            <div
              v-if="conversations.length === 0"
              class="empty-hint"
            >
              暂无对话，请先选择一个 Agent 开始
            </div>
          </div>

          <!-- 消息模式 -->
          <template v-else>
            <div
              ref="messagesRef"
              v-loading="loadingMessages"
              class="panel-messages"
            >
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="msg"
                :class="{
                  'msg--user': msg.role === 'user',
                  'msg--assistant': msg.role === 'assistant',
                }"
              >
                <div class="msg-bubble">{{ msg.content }}</div>
              </div>
              <!-- 流式输出打字指示器 -->
              <div
                v-if="streaming"
                class="typing-indicator"
              >
                <span class="typing-dot" />
                <span class="typing-dot" />
                <span class="typing-dot" />
              </div>
            </div>

            <!-- 输入区域 -->
            <div class="panel-input">
              <el-input
                v-model="inputText"
                type="textarea"
                :rows="2"
                :disabled="streaming"
                placeholder="输入消息..."
                resize="none"
                @keydown.enter.exact.prevent="handleSend"
              />
              <el-button
                type="primary"
                :disabled="streaming || !inputText.trim()"
                @click="handleSend"
              >
                发送
              </el-button>
            </div>
          </template>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
/* 遮罩层 */
.chat-panel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: transparent;
}

/* 面板主体 */
.chat-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: calc(100vw / 6);
  min-width: 280px;
  height: 100vh;
  background: #fff;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶栏 */
.panel-header {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
  gap: 8px;
}

.close-btn {
  padding: 4px;
  color: #909399;
}

.close-btn:hover {
  color: #303133;
}

.panel-title {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.back-btn {
  padding: 4px 8px;
  font-size: 13px;
  color: #409eff;
}

/* Agent 选择器 */
.panel-agent-selector {
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.panel-agent-selector :deep(.el-select) {
  width: 100%;
}

/* 对话列表 */
.panel-conversations {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.conversation-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.conversation-item:hover {
  background: #f5f7fa;
}

.conversation-item-title {
  font-size: 14px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-item-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.empty-hint {
  padding: 32px 16px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

/* 消息区域 */
.panel-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.msg {
  margin-bottom: 16px;
  max-width: 85%;
}

.msg--user {
  margin-left: auto;
  text-align: right;
}

.msg--assistant {
  margin-right: auto;
}

.msg-bubble {
  display: inline-block;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  text-align: left;
}

.msg--user .msg-bubble {
  background: #409eff;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.msg--assistant .msg-bubble {
  background: #f4f4f5;
  color: #303133;
  border-bottom-left-radius: 4px;
}

/* 打字指示器 */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #909399;
  animation: typing-bounce 1.2s ease-in-out infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

/* 输入区域 */
.panel-input {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding: 12px;
  border-top: 1px solid #ebeef5;
  flex-shrink: 0;
}

.panel-input :deep(.el-textarea) {
  flex: 1;
}

/* 面板滑入/滑出动画 */
.panel-slide-enter-active {
  transition: transform 0.3s ease-out;
}

.panel-slide-leave-active {
  transition: transform 0.25s ease-in;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(100%);
}

/* 遮罩层淡入淡出 */
.panel-overlay-enter-active {
  transition: opacity 0.3s ease;
}

.panel-overlay-leave-active {
  transition: opacity 0.25s ease;
}

.panel-overlay-enter-from,
.panel-overlay-leave-to {
  opacity: 0;
}
</style>
