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

export interface CreateAgentRequest {
  name: string
  description?: string
  avatar?: string
  apiUrl: string
  apiKey: string
  model: string
  status?: number
  configJson?: string
}
