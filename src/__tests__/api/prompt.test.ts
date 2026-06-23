import { describe, it, expect, beforeEach } from 'vitest'
import { http } from 'msw'
import { server } from '../server'
import { envelope } from '../handlers'
import {
  generatePrompt, beautifyPrompt,
  getTemplateList, createTemplate, updateTemplate,
  deleteTemplate, applyTemplateToAgent,
} from '@/api/prompt'

// MSW 的 http 命名空间方法名为小写（http.get/http.post ...），传入大写需转换
function mock(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, data: unknown, code = 200) {
  const handler = http[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete']
  server.use(handler(path, () => envelope(data, code)))
}

const tpl = { id: 1, userId: 7, name: 'n', systemPrompt: 's', mode: 'acg' as const, targetCapabilities: null, estPromptTokens: 10, status: 1, createdAt: '', updatedAt: '' }

describe('api/prompt', () => {
  beforeEach(() => server.resetHandlers())

  it('generatePrompt 携带 skipErrorHandler', async () => {
    mock('POST', '/api/prompts/generate', { systemPrompt: 'x' }, 403)
    // 403 不应抛（skipErrorHandler 生效）
    const res = await generatePrompt({ userHints: ['a'], mode: 'acg' })
    expect(res.data.code).toBe(403)
  })

  it('createTemplate 携带 skipErrorHandler（保存闸门 403）', async () => {
    mock('POST', '/api/prompts/templates', tpl, 403)
    const res = await createTemplate({ name: 'n', systemPrompt: 's', mode: 'acg' })
    expect(res.data.code).toBe(403)
  })

  it('updateTemplate 携带 skipErrorHandler', async () => {
    mock('PUT', '/api/prompts/templates/1', tpl, 403)
    const res = await updateTemplate(1, { name: 'n' })
    expect(res.data.code).toBe(403)
  })

  it('beautifyPrompt 正常 200 返回润色文本', async () => {
    mock('POST', '/api/prompts/beautify', { systemPrompt: 'refined' })
    const res = await beautifyPrompt({ systemPrompt: 'draft', agentId: 1, mode: 'acg' })
    expect(res.data.data.systemPrompt).toBe('refined')
  })

  it('getTemplateList 传 mode 查询参数', async () => {
    let capturedUrl = ''
    server.use(http.get('/api/prompts/templates', ({ request }) => {
      capturedUrl = request.url
      return envelope([tpl])
    }))
    await getTemplateList('compliant')
    expect(capturedUrl).toContain('mode=compliant')
  })

  it('deleteTemplate / applyTemplateToAgent 正常返回', async () => {
    mock('DELETE', '/api/prompts/templates/1', null)
    mock('POST', '/api/prompts/templates/1/apply/2', null)
    await expect(deleteTemplate(1)).resolves.toBeTruthy()
    await expect(applyTemplateToAgent(1, 2)).resolves.toBeTruthy()
  })

  it('isPublic 映射成请求体 public 键（保留字映射）', async () => {
    let capturedBody: any = null
    server.use(http.post('/api/prompts/templates', async ({ request }) => {
      capturedBody = await request.json()
      return envelope(tpl)
    }))
    await createTemplate({ name: 'n', systemPrompt: 's', mode: 'acg', isPublic: true })
    expect(capturedBody.public).toBe(true)
    expect(capturedBody.isPublic).toBeUndefined()
  })
})
