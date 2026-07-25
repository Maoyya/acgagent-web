import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

// Mock generatePromptStream：vi.hoisted 保证 mock 引用先于 vi.mock 工厂执行
const { generatePromptStreamMock } = vi.hoisted(() => ({
  generatePromptStreamMock: vi.fn(),
}))
vi.mock('@/api/prompt', () => ({
  generatePromptStream: generatePromptStreamMock,
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return { ...actual, ElMessage: { ...actual.ElMessage, warning: vi.fn(), error: vi.fn(), success: vi.fn() } }
})

import PromptGenerateDialog from '../PromptGenerateDialog.vue'

describe('PromptGenerateDialog', () => {
  beforeEach(() => {
    generatePromptStreamMock.mockClear()
    // 默认脚本：成功流
    generatePromptStreamMock.mockImplementation(async (_data, onEvent: (e: any) => void) => {
      onEvent({ type: 'content', content: '你是' })
      onEvent({ type: 'content', content: '一名毒舌客服' })
      onEvent({
        type: 'done',
        estimate: { promptTokens: 120, estCompletionTokens: 0, model: 'deepseek-chat' },
      })
    })
  })

  it('成功：累计 content 后 emit draft（含完整 systemPrompt/mode）并关闭', async () => {
    const wrapper = mount(PromptGenerateDialog, { props: { modelValue: true } })
    ;(wrapper.vm as any).fillInput('要一个毒舌客服\n回答简洁')
    await (wrapper.vm as any).runGenerate()
    // 流式累计：两段 content ('你是' + '一名毒舌客服') 拼成完整草稿后 emit
    const emitted = wrapper.emitted('draft')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toMatchObject({ systemPrompt: '你是一名毒舌客服', mode: 'acg' })
    expect((emitted![0][0] as any).templateId).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('error 事件：进入 error 态展示消息，不 emit draft', async () => {
    generatePromptStreamMock.mockImplementation(async (_data, onEvent: (e: any) => void) => {
      onEvent({ type: 'content', content: '部分' })
      onEvent({ type: 'error', message: '上游模型超时' })
    })
    const wrapper = mount(PromptGenerateDialog, { props: { modelValue: true } })
    ;(wrapper.vm as any).fillInput('一些要求')
    await (wrapper.vm as any).runGenerate()
    expect(wrapper.emitted('draft')).toBeUndefined()
    expect((wrapper.vm as any).phase).toBe('error')
    expect((wrapper.vm as any).errorMsg).toBe('上游模型超时')
  })

  it('空 hints 不发起请求', async () => {
    const { ElMessage } = await import('element-plus')
    const wrapper = mount(PromptGenerateDialog, { props: { modelValue: true } })
    await (wrapper.vm as any).runGenerate()
    expect(wrapper.emitted('draft')).toBeUndefined()
    expect(generatePromptStreamMock).not.toHaveBeenCalled()
    expect(vi.mocked(ElMessage.warning)).toHaveBeenCalled()
  })

  it('关闭事件触发 reset：phase 回 input，draft/error 清空，重开不残留', async () => {
    generatePromptStreamMock.mockImplementation(async (_data, onEvent: (e: any) => void) => {
      onEvent({ type: 'error', message: '失败' })
    })
    const wrapper = mount(PromptGenerateDialog, { props: { modelValue: true } })
    ;(wrapper.vm as any).fillInput('一些要求')
    await (wrapper.vm as any).runGenerate()
    expect((wrapper.vm as any).phase).toBe('error')
    expect((wrapper.vm as any).errorMsg).toBe('失败')
    // el-dialog 的 close 事件（X / 取消 / 遮罩 / modelValue→false 均会触发）
    // 在 jsdom 下不走动画，直接 emit close 验证 @close=reset 接线
    await wrapper.findComponent({ name: 'ElDialog' }).vm.$emit('close')
    await nextTick()
    expect((wrapper.vm as any).phase).toBe('input')
    expect((wrapper.vm as any).errorMsg).toBe('')
    expect((wrapper.vm as any).draftSystemPrompt).toBe('')
    // 重开：phase 仍为 input，不再呈现旧错误
    await wrapper.setProps({ modelValue: true })
    expect((wrapper.vm as any).phase).toBe('input')
  })
})
