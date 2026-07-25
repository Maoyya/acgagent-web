import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { http } from 'msw'
import { server } from '@/__tests__/server'
import { envelope } from '@/__tests__/handlers'
import { createPinia, setActivePinia } from 'pinia'
import PromptIndex from '../Index.vue'
import type { PromptTemplateVO } from '@/types'

const { useAuthStore } = await import('@/stores/auth')

const list: PromptTemplateVO[] = [
  { id: 1, userId: null, name: '公共聊天', systemPrompt: 'a', mode: 'acg', targetCapabilities: null, estPromptTokens: 5, status: 1, createdAt: '', updatedAt: '' },
  { id: 2, userId: 7, name: '我的视频', systemPrompt: 'b', mode: 'compliant', targetCapabilities: null, estPromptTokens: 5, status: 1, createdAt: '', updatedAt: '' },
  { id: 3, userId: 8, name: '别人的', systemPrompt: 'c', mode: 'acg', targetCapabilities: null, estPromptTokens: 5, status: 1, createdAt: '', updatedAt: '' },
]

describe('prompts Index', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    server.resetHandlers()
    server.use(http.get('/api/prompts/templates', () => envelope(list)))
    server.use(http.get('/api/agents', () => envelope([])))
  })

  it('挂载加载列表', async () => {
    const wrapper = mount(PromptIndex)
    await new Promise((r) => setTimeout(r, 0))
    expect((wrapper.vm as any).templates).toHaveLength(3)
  })

  it('canManage：自己的或公共(admin)可管理，他人私有不可', async () => {
    const store = useAuthStore()
    ;(store as any).userInfo = { id: 7, roles: ['user'] }
    const wrapper = mount(PromptIndex)
    await new Promise((r) => setTimeout(r, 0))
    expect((wrapper.vm as any).canManage(list[1])).toBe(true)  // 自己的
    expect((wrapper.vm as any).canManage(list[2])).toBe(false) // 别人的私有
    ;(store as any).userInfo = { id: 7, roles: ['admin'] }
    expect((wrapper.vm as any).canManage(list[2])).toBe(true)  // admin 可管任意
  })
})
