export interface ConversationVO {
  id: number
  userId: number
  agentId: number
  title: string
  createdAt: string
  updatedAt: string
}

export interface MessageVO {
  id: number
  conversationId: number
  role: 'USER' | 'ASSISTANT'
  content: string
  tokens: number
  createdAt: string
}

export interface CreateConversationRequest {
  agentId: number
  title?: string
}

export interface SendMessageRequest {
  content: string
}
