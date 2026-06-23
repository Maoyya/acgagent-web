import { describe, it, expect, vi, beforeEach } from 'vitest'

// 必须在 import request 之前 mock 依赖
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

const { ElMessage } = await import('element-plus')
const { default: request } = await import('@/utils/request')
import { http, HttpResponse } from 'msw'
import { server } from '../server'

function mockEndpoint(path: string, code: number, data: unknown, message = '') {
  server.use(http.post(path, () => HttpResponse.json({ code, message, data })))
}

describe('request skipErrorHandler', () => {
  beforeEach(() => {
    vi.mocked(ElMessage.error).mockClear()
  })

  it('默认：非 200 弹 toast 并 reject', async () => {
    mockEndpoint('/api/probe-default', 403, { x: 1 }, 'blocked')
    await expect(request.post('/probe-default')).rejects.toThrow('blocked')
    expect(ElMessage.error).toHaveBeenCalledTimes(1)
  })

  it('skipErrorHandler=true：403 不弹 toast、不 reject，返回完整信封', async () => {
    mockEndpoint('/api/probe-skip', 403, { passed: false }, 'blocked')
    const res = await request.post('/probe-skip', {}, { skipErrorHandler: true })
    expect(ElMessage.error).not.toHaveBeenCalled()
    expect(res.data).toEqual({ code: 403, message: 'blocked', data: { passed: false } })
  })

  it('skipErrorHandler=true：200 正常返回', async () => {
    mockEndpoint('/api/probe-ok', 200, { ok: true })
    const res = await request.post('/probe-ok', {}, { skipErrorHandler: true })
    expect(res.data.data).toEqual({ ok: true })
  })
})
