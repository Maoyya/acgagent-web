import request from '@/utils/request'
import type {
  Result, PromptTemplateVO, PromptTemplateRequest,
  PromptGenerateRequest, PromptGenerateResponseVO,
  PromptBeautifyRequest, PromptBeautifyResponseVO,
  PromptModerateRequest, ModerationVerdictVO,
  PromptEstimateRequest, CostEstimateVO, PromptMode,
} from '@/types'

/** generate 草稿：403-blocked（草稿违规）是业务结果，跳过全局错误处理 */
export function generatePrompt(data: PromptGenerateRequest) {
  return request.post<Result<PromptGenerateResponseVO>>('/prompts/generate', data, {
    skipErrorHandler: true,
  })
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
