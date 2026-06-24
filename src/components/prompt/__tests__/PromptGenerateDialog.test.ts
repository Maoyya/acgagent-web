import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { http } from 'msw'
import { server } from '@/__tests__/server'
import { envelope } from '@/__tests__/handlers'
import PromptGenerateDialog from '../PromptGenerateDialog.vue'

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return { ...actual, ElMessage: { ...actual.ElMessage, warning: vi.fn(), error: vi.fn(), success: vi.fn() } }
})

const draftResp = {
  systemPrompt: '你是一名毒舌客服',
  mode: 'acg',
  moderation: { passed: true, violatedRules: [], reasons: [], confidence: 0.95, mode: 'acg' },
  estimate: { promptTokens: 120, estCompletionTokens: 0, model: 'deepseek-chat' },
}
const verdict = { passed: false, violatedRules: ['禁止二次元风格'], reasons: ['动漫夸张'], confidence: 0.9, mode: 'compliant' }

describe('PromptGenerateDialog', () => {
  beforeEach(() => server.resetHandlers())

  it('成功：emit draft（含 systemPrompt/mode，无 templateId）并关闭', async () => {
    server.use(http.post('/api/prompts/generate', () => envelope(draftResp, 200)))
    const wrapper = mount(PromptGenerateDialog, { props: { modelValue: true } })
    ;(wrapper.vm as any).fillInput('要一个毒舌客服\n回答简洁')
    await (wrapper.vm as any).runGenerate()
    const emitted = wrapper.emitted('draft')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toMatchObject({ systemPrompt: '你是一名毒舌客服', mode: 'acg' })
    expect((emitted![0][0] as any).templateId).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('被拦截(code=403)：进入 blocked 态展示 verdict，不 emit draft', async () => {
    server.use(http.post('/api/prompts/generate', () => envelope(verdict, 403, 'blocked')))
    const wrapper = mount(PromptGenerateDialog, { props: { modelValue: true } })
    ;(wrapper.vm as any).fillInput('一些违规要求')
    await (wrapper.vm as any).runGenerate()
    expect(wrapper.emitted('draft')).toBeUndefined()
    expect((wrapper.vm as any).phase).toBe('blocked')
    expect((wrapper.vm as any).blocked).toMatchObject({ passed: false })
  })

  it('空 hints 不发起请求', async () => {
    const { ElMessage } = await import('element-plus')
    server.use(http.post('/api/prompts/generate', () => envelope(draftResp)))
    const wrapper = mount(PromptGenerateDialog, { props: { modelValue: true } })
    await (wrapper.vm as any).runGenerate()
    expect(wrapper.emitted('draft')).toBeUndefined()
    expect(vi.mocked(ElMessage.warning)).toHaveBeenCalled()
  })

  it('关闭事件触发 reset：phase 回 input，blocked 清空，重开不残留旧 verdict', async () => {
    server.use(http.post('/api/prompts/generate', () => envelope(verdict, 403, 'blocked')))
    const wrapper = mount(PromptGenerateDialog, { props: { modelValue: true } })
    ;(wrapper.vm as any).fillInput('一些违规要求')
    await (wrapper.vm as any).runGenerate()
    expect((wrapper.vm as any).phase).toBe('blocked')
    expect((wrapper.vm as any).blocked).not.toBeNull()
    // el-dialog 的 close 事件（X / 取消 / 遮罩 / modelValue→false 均会触发）
    // 在 jsdom 下不走动画，直接 emit close 验证 @close=reset 接线
    await wrapper.findComponent({ name: 'ElDialog' }).vm.$emit('close')
    await nextTick()
    expect((wrapper.vm as any).phase).toBe('input')
    expect((wrapper.vm as any).blocked).toBeNull()
    // 重开：phase 仍为 input，不再呈现旧 verdict
    await wrapper.setProps({ modelValue: true })
    expect((wrapper.vm as any).phase).toBe('input')
    expect((wrapper.vm as any).blocked).toBeNull()
  })
})
