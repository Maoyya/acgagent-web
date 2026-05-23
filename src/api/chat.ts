import request from '@/utils/request'
import type {
  Result,
  ConversationVO,
  MessageVO,
  CreateConversationRequest,
  SendMessageRequest,
} from '@/types'

export function createConversation(data: CreateConversationRequest) {
  return request.post<Result<ConversationVO>>('/chat/conversations', data)
}

export function getConversations() {
  return request.get<Result<ConversationVO[]>>('/chat/conversations')
}

export function getMessages(conversationId: number) {
  return request.get<Result<MessageVO[]>>(`/chat/conversations/${conversationId}/messages`)
}

export function sendMessage(conversationId: number, data: SendMessageRequest) {
  return request.post<Result<void>>(`/chat/conversations/${conversationId}/send`, data)
}

export function deleteConversation(conversationId: number) {
  return request.delete<Result<void>>(`/chat/conversations/${conversationId}`)
}
