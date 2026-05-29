export interface AgentVO {
  id: number
  name: string
  description: string | null
  avatar: string | null
  apiUrl: string
  apiKey: string
  model: string
  status: number
  category: 'CHAT' | 'VIDEO' | 'IMAGE'
  configJson: string | null
  createdAt: string
  updatedAt: string
}

export type AgentCategory = 'CHAT' | 'VIDEO' | 'IMAGE'

export const AgentCategoryLabels: Record<AgentCategory, string> = {
  CHAT: '对话',
  VIDEO: '视频',
  IMAGE: '生图',
}

export interface CreateAgentRequest {
  name: string
  description?: string
  avatar?: string
  apiUrl: string
  apiKey: string
  model: string
  status?: number
  category?: AgentCategory
  configJson?: string
}
