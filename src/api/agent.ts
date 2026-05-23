import request from '@/utils/request'
import type { Result, AgentVO, CreateAgentRequest } from '@/types'

export function getAgentList() {
  return request.get<Result<AgentVO[]>>('/agents')
}

export function getAgent(id: number) {
  return request.get<Result<AgentVO>>(`/agents/${id}`)
}

export function createAgent(data: CreateAgentRequest) {
  return request.post<Result<AgentVO>>('/agents', data)
}

export function updateAgent(id: number, data: Partial<CreateAgentRequest>) {
  return request.put<Result<AgentVO>>(`/agents/${id}`, data)
}

export function deleteAgent(id: number) {
  return request.delete<Result<void>>(`/agents/${id}`)
}
