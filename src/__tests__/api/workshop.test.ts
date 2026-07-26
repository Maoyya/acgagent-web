import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../server'
import { envelope } from '../handlers'
import {
  createProject, listProjects, getProject, updateProject, deleteProject,
  generateStoryboard, generateCharacters, streamPlot,
} from '@/api/workshop'

// MSW 的 http 命名空间方法名为小写（http.get/http.post ...），传入大写需转换
function mock(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, data: unknown, code = 200) {
  const handler = http[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete']
  server.use(handler(path, () => envelope(data, code)))
}

const project = {
  id: 1, userId: 7, title: 't',
  story: null, plot: null, storyboard: null, characters: null,
  createdAt: '', updatedAt: '',
}

describe('api/workshop CRUD', () => {
  beforeEach(() => server.resetHandlers())

  it('createProject POST /workshop/projects 返回新建项目', async () => {
    mock('POST', '/api/workshop/projects', project)
    const res = await createProject({ title: 't' })
    expect(res.data.data.id).toBe(1)
  })

  it('listProjects GET /workshop/projects 返回项目数组', async () => {
    mock('GET', '/api/workshop/projects', [project])
    const res = await listProjects()
    expect(res.data.data).toHaveLength(1)
  })

  it('getProject GET /workshop/projects/:id', async () => {
    mock('GET', '/api/workshop/projects/1', project)
    const res = await getProject(1)
    expect(res.data.data.id).toBe(1)
  })

  it('updateProject PUT /workshop/projects/:id', async () => {
    mock('PUT', '/api/workshop/projects/1', { ...project, title: 't2' })
    const res = await updateProject(1, { title: 't2' })
    expect(res.data.data.title).toBe('t2')
  })

  it('deleteProject DELETE /workshop/projects/:id', async () => {
    mock('DELETE', '/api/workshop/projects/1', null)
    await expect(deleteProject(1)).resolves.toBeTruthy()
  })

  it('generateStoryboard POST /workshop/storyboard 返回 Shot[]', async () => {
    const shots = [{ shot: 'S1', description: 'd', duration: '3s', movement: '固定', dialogue: '' }]
    mock('POST', '/api/workshop/storyboard', shots)
    const res = await generateStoryboard({ plot: 'p' })
    expect(res.data.data).toHaveLength(1)
    expect(res.data.data[0].shot).toBe('S1')
  })

  it('generateCharacters POST /workshop/characters 返回 Character[]', async () => {
    const chars = [{ name: 'n', role: '主角', description: 'd' }]
    mock('POST', '/api/workshop/characters', chars)
    const res = await generateCharacters({ plot: 'p' })
    expect(res.data.data[0].name).toBe('n')
  })
})

describe('api/workshop streamPlot (SSE)', () => {
  beforeEach(() => server.resetHandlers())

  it('按 \\n\\n 切块解析 data: 载荷并逐事件回调', async () => {
    const events = [
      { type: 'content', content: 'Hello ' },
      { type: 'content', content: 'World' },
      { type: 'done' },
    ]
    const body = events.map((e) => `data: ${JSON.stringify(e)}`).join('\n\n')
    server.use(http.post('/api/workshop/plot', () => {
      return new HttpResponse(body, { headers: { 'content-type': 'text/event-stream' } })
    }))

    const received: typeof events = []
    await streamPlot({ story: 's' }, (e) => received.push(e))
    expect(received).toEqual(events)
  })

  it('忽略非 data: 行与无法解析的载荷', async () => {
    // 混入注释行、空 data:、非法 JSON；只应有 1 个合法事件被回调
    const body = [
      ': comment line',
      'event: message',
      'data:',
      'data: not-json',
      'data: {"type":"content","content":"ok"}',
    ].join('\n')
    server.use(http.post('/api/workshop/plot', () => {
      return new HttpResponse(body, { headers: { 'content-type': 'text/event-stream' } })
    }))

    const received: string[] = []
    await streamPlot({ story: 's' }, (e) => received.push(e.content ?? ''))
    expect(received).toEqual(['ok'])
  })

  it('HTTP 非 2xx 抛错', async () => {
    server.use(http.post('/api/workshop/plot', () => new HttpResponse('err', { status: 500 })))
    await expect(streamPlot({ story: 's' }, () => {})).rejects.toThrow('HTTP 500')
  })
})
