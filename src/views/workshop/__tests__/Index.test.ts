import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// vi.hoisted 保证 mock 引用先于 vi.mock 工厂执行（streamPlot 等需在工厂内被引用）
const apiMocks = vi.hoisted(() => ({
  listProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  generateStoryboard: vi.fn(),
  generateCharacters: vi.fn(),
  streamPlot: vi.fn(),
}))

vi.mock('@/api/workshop', () => apiMocks)

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return {
    ...actual,
    // ElMessage/ElMessageBox 在 jsdom 下没有真实 UI，需 mock 弹窗
    ElMessage: { ...actual.ElMessage, warning: vi.fn(), error: vi.fn(), success: vi.fn() },
    ElMessageBox: { ...actual.ElMessageBox, confirm: vi.fn().mockResolvedValue('confirm') },
  }
})

import WorkshopIndex from '../Index.vue'
import { colorFromName } from '../colorFromName'

/** 构造后端信封响应 `{code,message,data}` */
function envelope<T>(data: T) {
  return { data: { code: 200, message: 'ok', data } }
}

const baseProject = {
  id: 1,
  userId: 7,
  title: '测试项目',
  story: '初始故事',
  plot: null,
  storyboard: null,
  characters: null,
  createdAt: '',
  updatedAt: '',
}

/** 等一个 macrotask，让 onMounted → loadProjects 跑完 */
function flush() {
  return new Promise((r) => setTimeout(r, 0))
}

describe('workshop Index', () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach((m) => m.mockReset())
    // 每次返回全新克隆，避免组件内 `currentProject.value.x = ...` 写回 baseProject
    // 造成测试间状态泄漏
    apiMocks.listProjects.mockImplementation(async () => envelope([{ ...baseProject }]))
    apiMocks.getProject.mockImplementation(async () => envelope({ ...baseProject }))
    apiMocks.createProject.mockImplementation(async () => envelope({ ...baseProject }))
    apiMocks.updateProject.mockImplementation(async () => envelope({ ...baseProject }))
    apiMocks.deleteProject.mockResolvedValue(envelope(null))
  })

  it('挂载后调用 listProjects 加载项目列表', async () => {
    const wrapper = mount(WorkshopIndex)
    await flush()
    expect(apiMocks.listProjects).toHaveBeenCalled()
    expect((wrapper.vm as any).projectList).toHaveLength(1)
  })

  it('选择项目后调用 getProject，并把 story 灌入 storyInput', async () => {
    const wrapper = mount(WorkshopIndex)
    await (wrapper.vm as any).onSelectProject(1)
    expect(apiMocks.getProject).toHaveBeenCalledWith(1)
    expect((wrapper.vm as any).storyInput).toBe('初始故事')
    expect((wrapper.vm as any).projectId).toBe(1)
  })

  it('① 保存故事：updateProject(id, {story})', async () => {
    const wrapper = mount(WorkshopIndex)
    await (wrapper.vm as any).onSelectProject(1)
    ;(wrapper.vm as any).storyInput = '新故事'
    await (wrapper.vm as any).saveStory()
    expect(apiMocks.updateProject).toHaveBeenCalledWith(1, { story: '新故事' })
  })

  it('② 生成剧情：streamPlot content 累加到 plotText，done 后调 updateProject({plot})', async () => {
    // 按 PromptGenerateDialog.test.ts 的手法：脚本化 content/done 事件
    apiMocks.streamPlot.mockImplementation(
      async (_data: unknown, onEvent: (e: any) => void) => {
        onEvent({ type: 'content', content: '第一段' })
        onEvent({ type: 'content', content: '第二段' })
        onEvent({ type: 'done' })
      },
    )
    const wrapper = mount(WorkshopIndex)
    await (wrapper.vm as any).onSelectProject(1)
    await (wrapper.vm as any).generatePlot()
    expect(apiMocks.streamPlot).toHaveBeenCalledWith(
      { story: '初始故事' },
      expect.any(Function),
      expect.any(AbortSignal),
    )
    // 流式累计：两段 content 拼成完整剧情
    expect((wrapper.vm as any).plotText).toBe('第一段第二段')
    // done 后把累计剧情落库
    expect(apiMocks.updateProject).toHaveBeenCalledWith(1, { plot: '第一段第二段' })
  })

  it('② streamPlot error 事件：调用 ElMessage.error 展示消息', async () => {
    apiMocks.streamPlot.mockImplementation(
      async (_data: unknown, onEvent: (e: any) => void) => {
        onEvent({ type: 'error', message: '上游模型超时' })
      },
    )
    const { ElMessage } = await import('element-plus')
    const wrapper = mount(WorkshopIndex)
    await (wrapper.vm as any).onSelectProject(1)
    await (wrapper.vm as any).generatePlot()
    expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('上游模型超时')
    // 错误流程不应落库
    expect(apiMocks.updateProject).not.toHaveBeenCalled()
  })

  it('③ 生成分镜：generateStoryboard({plot}) 返回 Shot[] 后渲染 + updateProject', async () => {
    const shots = [
      { shot: 'S1', description: 'd', duration: '3s', movement: '固定', dialogue: '' },
    ]
    apiMocks.generateStoryboard.mockResolvedValue(envelope(shots))
    const wrapper = mount(WorkshopIndex)
    await (wrapper.vm as any).onSelectProject(1)
    // 先有剧情才能生成分镜
    ;(wrapper.vm as any).plotText = '已有剧情'
    await (wrapper.vm as any).generateStoryboard()
    expect(apiMocks.generateStoryboard).toHaveBeenCalledWith({ plot: '已有剧情' })
    expect((wrapper.vm as any).storyboard).toHaveLength(1)
    expect((wrapper.vm as any).storyboard[0].shot).toBe('S1')
    expect(apiMocks.updateProject).toHaveBeenCalledWith(1, { storyboard: shots })
  })

  it('④ 生成角色：generateCharacters({plot}) 返回 Character[] 后渲染 + updateProject', async () => {
    const chars = [{ name: '林月', role: '主角', description: 'd' }]
    apiMocks.generateCharacters.mockResolvedValue(envelope(chars))
    const wrapper = mount(WorkshopIndex)
    await (wrapper.vm as any).onSelectProject(1)
    ;(wrapper.vm as any).plotText = '已有剧情'
    await (wrapper.vm as any).generateCharacters()
    expect(apiMocks.generateCharacters).toHaveBeenCalledWith({ plot: '已有剧情' })
    expect((wrapper.vm as any).characters).toHaveLength(1)
    expect((wrapper.vm as any).characters[0].name).toBe('林月')
    expect(apiMocks.updateProject).toHaveBeenCalledWith(1, { characters: chars })
  })

  it('新建项目：createProject({}) 后刷新列表并切换到新项目', async () => {
    const newProject = { ...baseProject, id: 2, story: null }
    apiMocks.createProject.mockResolvedValue(envelope(newProject))
    apiMocks.getProject.mockResolvedValue(envelope(newProject))
    const wrapper = mount(WorkshopIndex)
    await flush() // 等 onMounted 的 listProjects 完成
    apiMocks.listProjects.mockClear()
    await (wrapper.vm as any).onCreateProject()
    expect(apiMocks.createProject).toHaveBeenCalledWith({})
    expect(apiMocks.listProjects).toHaveBeenCalled() // 刷新列表
    expect(apiMocks.getProject).toHaveBeenCalledWith(2) // 切换到新项目
    expect((wrapper.vm as any).projectId).toBe(2)
  })

  it('删除当前项目：deleteProject(id) 后刷新列表并清空当前选择', async () => {
    const wrapper = mount(WorkshopIndex)
    await (wrapper.vm as any).onSelectProject(1)
    apiMocks.listProjects.mockClear()
    await (wrapper.vm as any).onDeleteProject()
    expect(apiMocks.deleteProject).toHaveBeenCalledWith(1)
    expect(apiMocks.listProjects).toHaveBeenCalled()
    expect((wrapper.vm as any).projectId).toBeNull()
    expect((wrapper.vm as any).currentProject).toBeNull()
  })

  it('未选项目时点击保存/生成：提示警告且不发请求', async () => {
    const { ElMessage } = await import('element-plus')
    const wrapper = mount(WorkshopIndex)
    await flush()
    apiMocks.updateProject.mockClear()
    apiMocks.streamPlot.mockClear()
    await (wrapper.vm as any).saveStory()
    await (wrapper.vm as any).generatePlot()
    await (wrapper.vm as any).generateStoryboard()
    await (wrapper.vm as any).generateCharacters()
    expect(vi.mocked(ElMessage.warning)).toHaveBeenCalled()
    expect(apiMocks.updateProject).not.toHaveBeenCalled()
    expect(apiMocks.streamPlot).not.toHaveBeenCalled()
  })

  it('删除确认取消：不调 deleteProject，当前 projectId/currentProject 保持不变', async () => {
    const { ElMessageBox } = await import('element-plus')
    // 用户在确认框点了「取消」→ confirm reject
    vi.mocked(ElMessageBox.confirm).mockRejectedValueOnce('cancel')
    const wrapper = mount(WorkshopIndex)
    await (wrapper.vm as any).onSelectProject(1)
    apiMocks.deleteProject.mockClear()
    apiMocks.listProjects.mockClear()
    await (wrapper.vm as any).onDeleteProject()
    expect(vi.mocked(ElMessageBox.confirm)).toHaveBeenCalled()
    expect(apiMocks.deleteProject).not.toHaveBeenCalled()
    expect(apiMocks.listProjects).not.toHaveBeenCalled()
    // 当前选择保持不变
    expect((wrapper.vm as any).projectId).toBe(1)
    expect((wrapper.vm as any).currentProject).not.toBeNull()
    expect((wrapper.vm as any).currentProject.id).toBe(1)
  })
})

describe('colorFromName', () => {
  it('同名稳定同色', () => {
    expect(colorFromName('林月')).toBe(colorFromName('林月'))
  })
  it('空串回退到首色', () => {
    expect(colorFromName('')).toMatch(/^#[0-9a-f]{6}$/i)
  })
  it('不同名字取不同色', () => {
    // 8 色色板，这里取若干名字断言不全相同
    const colors = new Set(['林月', '影', '张三', '李四', '王五'].map(colorFromName))
    expect(colors.size).toBeGreaterThan(1)
  })
})
