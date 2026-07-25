/** 生成模式：acg-二次元, compliant-合规（后端 PromptMode 枚举 value） */
export type PromptMode = 'acg' | 'compliant'

export const PromptModeLabels: Record<PromptMode, string> = {
  acg: '二次元',
  compliant: '合规',
}

/** moderation 裁决（generate 拦截 / moderate 返回 / 保存闸门拦截） */
export interface ModerationVerdictVO {
  passed: boolean
  violatedRules: string[]
  reasons: string[]
  confidence: number
  mode: PromptMode
}

/** 消耗估算 */
export interface CostEstimateVO {
  promptTokens: number
  estCompletionTokens: number
  model: string
}

/** generate 成功响应（v1.1：无 templateId，纯草稿） */
export interface PromptGenerateResponseVO {
  systemPrompt: string
  mode: PromptMode
  moderation: ModerationVerdictVO
  estimate: CostEstimateVO
}

/** generate 流式事件（SSE）：content=增量 token，done=结束+估算，error=中途失败 */
export interface GenerateStreamEvent {
  type: 'content' | 'done' | 'error'
  content?: string
  estimate?: CostEstimateVO
  message?: string
}

/** beautify 响应（v1.1：润色后文本；字段名以后端最终 VO 为准，暂定 systemPrompt） */
export interface PromptBeautifyResponseVO {
  systemPrompt: string
}

/** 模板视图对象（后端 PromptTemplateVO） */
export interface PromptTemplateVO {
  id: number
  userId: number | null // null = 公共模板
  name: string
  systemPrompt: string
  mode: PromptMode
  targetCapabilities: string[] | null
  estPromptTokens: number | null
  status: number // 1-启用 0-禁用
  createdAt: string
  updatedAt: string
}

/** generate 请求 */
export interface PromptGenerateRequest {
  userHints: string[]
  mode: PromptMode
  targetCapabilities?: string[]
}

/** beautify 请求（v1.1） */
export interface PromptBeautifyRequest {
  systemPrompt: string
  agentId: number
  mode?: PromptMode
}

/** moderate 请求 */
export interface PromptModerateRequest {
  systemPrompt: string
  mode?: PromptMode
}

/** estimate 请求 */
export interface PromptEstimateRequest {
  systemPrompt: string
  model?: string
}

/** 手建/更新入参（后端 `public` 保留字 → TS isPublic，API 映射） */
export interface PromptTemplateRequest {
  name?: string
  systemPrompt?: string
  mode?: PromptMode
  targetCapabilities?: string[]
  status?: number
  isPublic?: boolean
}
