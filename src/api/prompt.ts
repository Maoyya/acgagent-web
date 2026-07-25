import request from '@/utils/request'
import type {
  Result, PromptTemplateVO, PromptTemplateRequest,
  PromptGenerateRequest, GenerateStreamEvent,
  PromptBeautifyRequest, PromptBeautifyResponseVO,
  PromptModerateRequest, ModerationVerdictVO,
  PromptEstimateRequest, CostEstimateVO, PromptMode,
} from '@/types'

/**
 * generate 流式版本：POST /api/prompts/generate 走 SSE（text/event-stream）。
 * 沿用 chat SSE（useSSE）的 fetch + ReadableStream + TextDecoder 模式，
 * 额外按 \n\n 切块、data: 取载荷，逐事件回调 onEvent。
 *
 * @param data 生成请求（userHints/mode/targetCapabilities）
 * @param onEvent 每个 SSE 事件的回调（content/done/error）
 * @param signal 可选 AbortSignal，用于取消
 */
export async function generatePromptStream(
  data: PromptGenerateRequest,
  onEvent: (e: GenerateStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem('accessToken')
  const response = await fetch('/api/prompts/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
    signal,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  // 处理一个 SSE 块（多行 data:），解析后回调 onEvent
  function dispatchBlock(block: string) {
    for (const line of block.split('\n')) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      try {
        onEvent(JSON.parse(payload) as GenerateStreamEvent)
      } catch {
        // 忽略无法解析的事件载荷
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // SSE 事件以空行（\n\n）分隔；最后一块可能不完整，留到下次
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''
    for (const block of blocks) {
      if (block.trim()) dispatchBlock(block)
    }
  }
  // 尾部剩余（无结束空行的情况）
  if (buffer.trim()) dispatchBlock(buffer)
}

/** beautify 美化（v1.1）：草稿 + agentId → 该 Agent LLM 润色；不校验/不落库 */
export function beautifyPrompt(data: PromptBeautifyRequest) {
  return request.post<Result<PromptBeautifyResponseVO>>('/prompts/beautify', data)
}

export function moderatePrompt(data: PromptModerateRequest) {
  return request.post<Result<ModerationVerdictVO>>('/prompts/moderate', data)
}

export function estimatePrompt(data: PromptEstimateRequest) {
  return request.post<Result<CostEstimateVO>>('/prompts/estimate', data)
}

export function getTemplateList(mode?: PromptMode) {
  return request.get<Result<PromptTemplateVO[]>>('/prompts/templates', {
    params: mode ? { mode } : undefined,
  })
}

export function getTemplate(id: number) {
  return request.get<Result<PromptTemplateVO>>(`/prompts/templates/${id}`)
}

/** create（统一提交，三条来源）：保存闸门可能返回 403-blocked，跳过全局错误处理 */
export function createTemplate(data: PromptTemplateRequest) {
  return request.post<Result<PromptTemplateVO>>('/prompts/templates', toPublicBody(data), {
    skipErrorHandler: true,
  })
}

/** update：保存闸门同样可能 403-blocked */
export function updateTemplate(id: number, data: PromptTemplateRequest) {
  return request.put<Result<PromptTemplateVO>>(`/prompts/templates/${id}`, toPublicBody(data), {
    skipErrorHandler: true,
  })
}

export function deleteTemplate(id: number) {
  return request.delete<Result<void>>(`/prompts/templates/${id}`)
}

export function applyTemplateToAgent(templateId: number, agentId: number) {
  return request.post<Result<void>>(`/prompts/templates/${templateId}/apply/${agentId}`)
}

/** isPublic → public 键映射；其余透传 */
function toPublicBody(data: PromptTemplateRequest): Record<string, unknown> {
  const { isPublic, ...rest } = data
  return isPublic === undefined ? rest : { ...rest, public: isPublic }
}
