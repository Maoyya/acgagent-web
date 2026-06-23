import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { http } from 'msw'
import { server } from '@/__tests__/server'
import { envelope } from '@/__tests__/handlers'
import AgentSelectDialog from '../AgentSelectDialog.vue'

const agents = [
  { id: 1, name: 'ChatBot', description: null, avatar: null, apiUrl: 'u', apiKey: 'k', model: 'm', status: 1, category: 'CHAT', configJson: null, createdAt: '', updatedAt: '' },
  { id: 2, name: 'VideoBot', description: null, avatar: null, apiUrl: 'u', apiKey: 'k', model: 'm', status: 1, category: 'VIDEO', configJson: null, createdAt: '', updatedAt: '' },
]

describe('AgentSelectDialog', () => {
  beforeEach(() => {
    server.use(http.get('/api/agents', () => envelope(agents)))
  })

  it('挂载即拉取 Agent 列表', async () => {
    const wrapper = mount(AgentSelectDialog, { props: { modelValue: true } })
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).agents).toHaveLength(2)
  })

  it('confirm 选定后 emit select 与关闭', async () => {
    const wrapper = mount(AgentSelectDialog, { props: { modelValue: true } })
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    // 直接调用组件内部方法验证契约（组件未暴露时通过 DOM 也可）
    ;(wrapper.vm as any).confirm(2)
    const emitted = wrapper.emitted('select')
    expect(emitted).toBeTruthy()
    expect(emitted![0]).toEqual([2])
  })
})
