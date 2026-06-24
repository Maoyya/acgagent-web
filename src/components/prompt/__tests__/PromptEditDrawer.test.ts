import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { http } from 'msw'
import { server } from '@/__tests__/server'
import { envelope } from '@/__tests__/handlers'
import { createPinia, setActivePinia } from 'pinia'
import PromptEditDrawer from '../PromptEditDrawer.vue'

const { useAuthStore } = await import('@/stores/auth')

const tpl = { id: 9, userId: 7, name: 'n', systemPrompt: 's', mode: 'acg' as const, targetCapabilities: null, estPromptTokens: 10, status: 1, createdAt: '', updatedAt: '' }

function makeStoreAdmin() {
  setActivePinia(createPinia())
  const store = useAuthStore()
  ;(store as any).userInfo = { id: 7, roles: ['admin'] }
  return store
}

describe('PromptEditDrawer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    server.resetHandlers()
  })

  it('保存闸门通过(200)：emit saved 并关闭', async () => {
    server.use(http.post('/api/prompts/templates', () => envelope(tpl, 200)))
    const wrapper = mount(PromptEditDrawer, {
      props: { modelValue: true, template: null, seed: { systemPrompt: '草稿', mode: 'acg' } },
    })
    ;(wrapper.vm as any).setName('新模板')
    await (wrapper.vm as any).runSave()
    expect(wrapper.emitted('saved')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('保存闸门拦截(403)：设 gateVerdict，不关、不 emit saved', async () => {
    const verdict = { passed: false, violatedRules: ['违规'], reasons: ['x'], confidence: 0.9, mode: 'compliant' as const }
    server.use(http.post('/api/prompts/templates', () => envelope(verdict, 403, 'blocked')))
    const wrapper = mount(PromptEditDrawer, {
      props: { modelValue: true, template: null, seed: { systemPrompt: '违规草稿', mode: 'acg' } },
    })
    ;(wrapper.vm as any).setName('坏模板')
    await (wrapper.vm as any).runSave()
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect((wrapper.vm as any).gateVerdict).toMatchObject({ passed: false })
  })

  it('美化成功：回填 systemPrompt', async () => {
    server.use(http.post('/api/prompts/beautify', () => envelope({ systemPrompt: '润色后' })))
    makeStoreAdmin()
    const wrapper = mount(PromptEditDrawer, {
      props: { modelValue: true, template: null, seed: { systemPrompt: '草稿', mode: 'acg' } },
    })
    await (wrapper.vm as any).applyBeautify(1)
    expect((wrapper.vm as any).form.systemPrompt).toBe('润色后')
  })

  it('seed.caps 流入 create body 的 targetCapabilities', async () => {
    let capturedBody: any = null
    server.use(http.post('/api/prompts/templates', async ({ request }) => {
      capturedBody = await request.json()
      return envelope(tpl, 200)
    }))
    const wrapper = mount(PromptEditDrawer, {
      props: { modelValue: true, template: null, seed: { systemPrompt: '草稿', mode: 'acg', caps: ['chat', 'rag'] } },
    })
    expect((wrapper.vm as any).form.targetCapabilities).toBe('chat,rag')
    ;(wrapper.vm as any).setName('带能力标签的模板')
    await (wrapper.vm as any).runSave()
    expect(capturedBody.targetCapabilities).toEqual(['chat', 'rag'])
  })
})
