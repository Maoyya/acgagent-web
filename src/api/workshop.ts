import request from '@/utils/request'
import type {
  Result, WorkshopProject, WorkshopProjectRequest,
  PlotRequest, StoryboardRequest, CharactersRequest,
  Shot, Character, PlotStreamEvent,
} from '@/types'

/** 创建工坊项目 */
export function createProject(data: WorkshopProjectRequest) {
  return request.post<Result<WorkshopProject>>('/workshop/projects', data)
}

/** 列出当前用户的工坊项目 */
export function listProjects() {
  return request.get<Result<WorkshopProject[]>>('/workshop/projects')
}

/** 获取工坊项目详情 */
export function getProject(id: number) {
  return request.get<Result<WorkshopProject>>(`/workshop/projects/${id}`)
}

/** 更新工坊项目（局部字段） */
export function updateProject(id: number, data: WorkshopProjectRequest) {
  return request.put<Result<WorkshopProject>>(`/workshop/projects/${id}`, data)
}

/** 删除工坊项目 */
export function deleteProject(id: number) {
  return request.delete<Result<void>>(`/workshop/projects/${id}`)
}

/** 生成分镜（同步 POST：剧情 → 镜头列表） */
export function generateStoryboard(data: StoryboardRequest) {
  return request.post<Result<Shot[]>>('/workshop/storyboard', data)
}

/** 生成角色（同步 POST：剧情 → 角色列表） */
export function generateCharacters(data: CharactersRequest) {
  return request.post<Result<Character[]>>('/workshop/characters', data)
}

/**
 * 剧情扩展 SSE 流式：POST /workshop/plot 走 text/event-stream。
 * 镜像 src/api/prompt.ts 的 generatePromptStream：fetch + ReadableStream + TextDecoder，
 * 按 \n\n 切块、data: 取载荷，逐事件回调 onEvent。
 *
 * @param data 剧情请求（story=故事梗概）
 * @param onEvent 每个 SSE 事件的回调（content/done/error）
 * @param signal 可选 AbortSignal，用于取消
 */
export async function streamPlot(
  data: PlotRequest,
  onEvent: (e: PlotStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem('accessToken')
  const response = await fetch('/api/workshop/plot', {
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
        onEvent(JSON.parse(payload) as PlotStreamEvent)
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
