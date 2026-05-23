export interface AgentVO {
  id: number
  name: string
  description: string
  apiUrl: string
  apiKey: string
  model: string
  configJson: string
  status: number
  createdAt: string
  updatedAt: string
}

export interface CreateAgentRequest {
  name: string
  description: string
  apiUrl: string
  apiKey: string
  model: string
  configJson?: string
  status?: number
}
