/** 分镜（一个镜头的描述） */
export interface Shot {
  /** 景别：远景/中景/近景/特写 */
  shot: string
  /** 镜头画面描述 */
  description: string
  /** 时长，如 "3s" */
  duration: string
  /** 运镜方式，如 "推镜头"、"固定" */
  movement: string
  /** 该镜头的对白/台词 */
  dialogue: string
}

/** 角色（外观/身份描述） */
export interface Character {
  /** 角色名 */
  name: string
  /** 角色定位，如 "主角"、"配角" */
  role: string
  /** 角色外貌/性格等描述 */
  description: string
}

/** 工坊项目视图对象（对应后端 WorkshopProject） */
export interface WorkshopProject {
  id: number
  userId: number
  title: string
  /** 用户输入的故事梗概；初始为 null */
  story: string | null
  /** AI 扩展后的完整剧情；未生成时为 null */
  plot: string | null
  /** 分镜列表；未生成时为 null */
  storyboard: Shot[] | null
  /** 角色列表；未生成时为 null */
  characters: Character[] | null
  createdAt: string
  updatedAt: string
}

/** 创建/更新工坊项目入参（所有字段可选，按需更新） */
export interface WorkshopProjectRequest {
  title?: string
  story?: string
  plot?: string
  storyboard?: Shot[]
  characters?: Character[]
}

/** 剧情 SSE 流式请求（story=故事梗概） */
export interface PlotRequest {
  story: string
}

/** 分镜生成请求（基于已生成的剧情） */
export interface StoryboardRequest {
  plot: string
}

/** 角色生成请求（基于已生成的剧情） */
export interface CharactersRequest {
  plot: string
}

/** 剧情 SSE 流式事件：content=增量文本，done=结束，error=中途失败 */
export interface PlotStreamEvent {
  type: 'content' | 'done' | 'error'
  content?: string
  message?: string
}
