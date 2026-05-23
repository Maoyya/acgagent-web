<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useSSE } from '@/composables/useSSE'
import { ElMessage } from 'element-plus'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import { ArrowLeft } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const { streaming, send, abort } = useSSE()

const conversationId = computed(() => Number(route.params.id))
const loadingMessages = ref(false)
const messagesRef = ref<HTMLElement>()

// 对话标题：从 store 的 conversations 列表中查找
const conversationTitle = computed(() => {
  const conv = chatStore.conversations.find((c) => c.id === conversationId.value)
  return conv?.title ?? '对话'
})

/** 滚动到底部 */
function scrollToBottom() {
  nextTick(() => {
    const el = messagesRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

/** 加载历史消息 */
async function loadMessages() {
  loadingMessages.value = true
  try {
    await chatStore.fetchMessages(conversationId.value)
    scrollToBottom()
  } catch {
    ElMessage.error('加载消息失败')
  } finally {
    loadingMessages.value = false
  }
}

/** 发送消息 */
function handleSend(content: string) {
  const convId = conversationId.value

  // 用户消息（本地临时）
  chatStore.addMessage({
    id: Date.now(),
    conversationId: convId,
    role: 'user',
    content,
    tokens: null,
    createdAt: new Date().toISOString(),
  })

  // 空的 assistant 占位消息
  chatStore.addMessage({
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
      chatStore.updateLastAssistantMessage(fullText)
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

/** 返回对话列表 */
function goBack() {
  router.push('/chat')
}

onMounted(() => {
  loadMessages()
})

onUnmounted(() => {
  abort()
})
</script>

<template>
  <div class="chat-detail">
    <!-- 顶部栏 -->
    <div class="chat-header">
      <el-button text class="back-btn" @click="goBack">
        <el-icon :size="18"><ArrowLeft /></el-icon>
      </el-button>
      <span class="chat-title">{{ conversationTitle }}</span>
    </div>

    <!-- 消息列表 -->
    <div
      ref="messagesRef"
      v-loading="loadingMessages"
      class="chat-messages"
    >
      <MessageBubble
        v-for="msg in chatStore.currentMessages"
        :key="msg.id"
        :message="msg"
      />
      <!-- 流式输出时显示打字光标 -->
      <div v-if="streaming" class="typing-indicator">
        <span class="typing-dot" />
        <span class="typing-dot" />
        <span class="typing-dot" />
      </div>
    </div>

    <!-- 输入框 -->
    <ChatInput :disabled="streaming" @send="handleSend" />
  </div>
</template>

<style scoped>
.chat-detail {
  height: calc(100vh - var(--header-height) - 48px);
  display: flex;
  flex-direction: column;
  background: var(--color-bg-card);
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.chat-header {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.back-btn {
  padding: 4px 8px;
  color: var(--color-text-secondary);
}

.back-btn:hover {
  color: var(--color-primary);
}

.chat-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin-left: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  margin-left: 44px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-text-light);
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
</style>
