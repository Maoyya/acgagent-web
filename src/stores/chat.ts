import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getConversations,
  getMessages,
  createConversation,
  deleteConversation,
} from '@/api/chat'
import type { ConversationVO, MessageVO } from '@/types'

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<ConversationVO[]>([])
  const currentMessages = ref<MessageVO[]>([])
  const loading = ref(false)

  async function fetchConversations() {
    loading.value = true
    try {
      const res = await getConversations()
      conversations.value = res.data.data
    } finally {
      loading.value = false
    }
  }

  async function fetchMessages(conversationId: number) {
    const res = await getMessages(conversationId)
    currentMessages.value = res.data.data
  }

  async function addConversation(data: { agentId: number; title?: string }) {
    const res = await createConversation(data)
    const conversation = res.data.data
    conversations.value.unshift(conversation)
    return conversation
  }

  async function removeConversation(id: number) {
    await deleteConversation(id)
    conversations.value = conversations.value.filter((c) => c.id !== id)
  }

  function addMessage(message: MessageVO) {
    currentMessages.value.push(message)
  }

  function updateLastAssistantMessage(content: string) {
    const lastMsg = currentMessages.value[currentMessages.value.length - 1]
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.content = content
    }
  }

  return {
    conversations,
    currentMessages,
    loading,
    fetchConversations,
    fetchMessages,
    addConversation,
    removeConversation,
    addMessage,
    updateLastAssistantMessage,
  }
})
