# 系统提示词生成功能 — 前端实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 acgagent-web 实现「系统提示词模板」功能：生成草稿 → 美化 → 保存（过闸门）→ 双维度模板 CRUD → admin apply-to-agent。

**Architecture:** Vue 3 `<script setup>` + Element Plus + Pinia。新增 `prompt` 域（types/api/views/components），复用既有 `useAuthStore` RBAC。关键点是 `request.ts` 加 `skipErrorHandler` 让 generate/create/update 的 `403 blocked`（合法业务结果，带 moderation verdict）不被全局拦截器当错误处理。

**Tech Stack:** Vue 3.5, TypeScript 6 (strict), Vite 8, Element Plus 2.14, Pinia 3, Vue Router 5, Axios 1.16；测试：Vitest + @vue/test-utils + jsdom + MSW。

**Design Spec:** `docs/superpowers/specs/2026-06-23-prompt-generation-frontend-design.md`（v1.1，对齐后端 v1.1）

---

## Global Constraints

- **测试：全程 TDD**（用户已确认）。先写失败测试 → 实现 → 通过。覆盖率按 CLAUDE.md：utils ≥80%、组件 ≥50%。
- **命名/路径**：`@/ → src/` 别名。types/api 单数 `prompt.ts`；views 复数 `prompts/`；components `prompt/`。
- **响应解包**：`res.data`（axios body）再 `.data`（Result payload）。带 `skipErrorHandler` 时 `res.data` 是完整 `Result` 信封，调用方自判 `code`。
- **`public` 保留字**：TS 字段一律用 `isPublic`，API 层 `toPublicBody` 映射成请求体 `public` 键。
- **提交规范**：约定式提交 `feat:`/`fix:`/`chore:`/`test:`。**按项目 CLAUDE.md「禁止自动提交」，每个 Task 末尾的 commit 步骤是审查检查点 —— 由人审查后再提交**，不自动 commit/push。
- **类型检查**：每步改完跑 `npm run type-check`（vue-tsc），不得引入新错误（基线有 4 个既有错误：ChatPanel `abort` 未用、AdminLayout `SwitchButton` 未用、`crypto.ts` md5、Dashboard `idx` 未用 —— 这些是既有问题，不在本计划修复范围，也不得新增同类）。
- **后端契约**：依赖后端 v1.1（generate 草稿无 templateId、beautify 端点、create/update 403 闸门）。后端未实现时用 MSW mock 联调。
- **风格**：沿用 `views/agents/Index.vue`、`views/system/Users.vue` 模式；集中式 `computed<FormRules>` + `validate().catch(()=>false)`；CSS 变量 `var(--color-*)`。

---

## File Structure

```
src/
  types/prompt.ts                       (新) 类型 + PromptModeLabels
  types/index.ts                        (改) re-export
  api/prompt.ts                         (新) 9 个请求函数 + toPublicBody
  utils/request.ts                      (改) skipErrorHandler + 类型增强
  views/prompts/Index.vue               (新) 列表 + CRUD + 编排
  components/prompt/AgentSelectDialog.vue       (新) 复用 Agent 选择
  components/prompt/PromptGenerateDialog.vue    (新) hints → 草稿
  components/prompt/PromptEditDrawer.vue        (新) 编辑/美化/复检/复估/保存-闸门
  router/index.ts                       (改) 加 /prompts 路由
  layouts/AdminLayout.vue               (改) 菜单加项
  __tests__/setup.ts                    (新) Vitest 全局 setup（MSW server + ElementPlus）
  __tests__/handlers.ts                 (新) MSW handlers
  __tests__/utils/toPublicBody.test.ts          (新)
  __tests__/utils/request.test.ts               (新)
  components/prompt/__tests__/*.test.ts         (新) 组件测试
  views/prompts/__tests__/Index.test.ts         (新)
vitest.config.ts                        (新)
```

---

## Task 1: 测试基础设施（Vitest + jsdom + MSW）

**Files:**
- Create: `vitest.config.ts`
- Create: `src/__tests__/setup.ts`
- Create: `src/__tests__/handlers.ts`
- Modify: `package.json`（scripts + devDeps）

**Interfaces:**
- Produces: `npm run test:run`（vitest run）、`npm run test:coverage`；全局 `vi`；`src/__tests__/setup.ts` 导出 MSW `server` 与 `resetHandlers`。

- [ ] **Step 1: 安装依赖**

```bash
npm install -D vitest @vue/test-utils jsdom msw @vitest/coverage-v8
```

- [ ] **Step 2: 创建 vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**', 'src/api/**', 'src/components/prompt/**', 'src/views/prompts/**'],
    },
  },
})
```

- [ ] **Step 3: 创建 MSW handlers 骨架** (`src/__tests__/handlers.ts`)

```typescript
import { http, HttpResponse } from 'msw'

/** 信封助手：后端 {code,message,data} 格式 */
export function envelope<T>(data: T, code = 200, message = 'success') {
  return HttpResponse.json({ code, message, data })
}

/** 各 Task 往 handlers 数组追加自己的 mock 端点 */
export const handlers = [
  // 占位；后续 Task 在此数组追加 http.post/http.get
]
```

- [ ] **Step 4: 创建全局 setup** (`src/__tests__/setup.ts`)

```typescript
import { config } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { server } from './server'
import { afterEach, beforeAll, afterAll } from 'vitest'

// 组件测试全局注册 Element Plus
config.global.plugins = [[ElementPlus, {}]]

// MSW server（单独文件，避免 setup↔handlers 循环依赖）
export { server } from './server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

- [ ] **Step 5: 创建 MSW server 文件** (`src/__tests__/server.ts`)

```typescript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

- [ ] **Step 6: 加 test scripts 到 package.json**

在 `"scripts"` 内追加（保留现有 scripts）：

```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 7: 写一个冒烟测试验证设施可用** (`src/__tests__/smoke.test.ts`)

```typescript
import { describe, it, expect } from 'vitest'

describe('vitest setup', () => {
  it('应正确执行断言', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 8: 运行测试，预期通过**

Run: `npm run test:run`
Expected: PASS，`smoke.test.ts` 1 passed。

- [ ] **Step 9: Checkpoint — 审查后提交**

```bash
git add vitest.config.ts package.json package-lock.json src/__tests__/
git commit -m "chore: 搭建 Vitest + jsdom + MSW 测试基础设施"
```

---

## Task 2: 类型定义（`src/types/prompt.ts`）

**Files:**
- Create: `src/types/prompt.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `PromptMode`, `PromptModeLabels`, `ModerationVerdictVO`, `CostEstimateVO`, `PromptGenerateResponseVO`, `PromptBeautifyResponseVO`, `PromptTemplateVO`, `PromptGenerateRequest`, `PromptBeautifyRequest`, `PromptModerateRequest`, `PromptEstimateRequest`, `PromptTemplateRequest`。

- [ ] **Step 1: 创建 `src/types/prompt.ts`**

```typescript
/** 生成模式：acg-二次元, compliant-合规（后端 PromptMode 枚举 value） */
export type PromptMode = 'acg' | 'compliant'

export const PromptModeLabels: Record<PromptMode, string> = {
  acg: '二次元',
  compliant: '合规',
}

/** moderation 裁决（generate 拦截 / moderate 返回 / 保存闸门拦截） */
export interface ModerationVerdictVO {
  passed: boolean
  violatedRules: string[]
  reasons: string[]
  confidence: number
  mode: PromptMode
}

/** 消耗估算 */
export interface CostEstimateVO {
  promptTokens: number
  estCompletionTokens: number
  model: string
}

/** generate 成功响应（v1.1：无 templateId，纯草稿） */
export interface PromptGenerateResponseVO {
  systemPrompt: string
  mode: PromptMode
  moderation: ModerationVerdictVO
  estimate: CostEstimateVO
}

/** beautify 响应（v1.1：润色后文本；字段名以后端最终 VO 为准，暂定 systemPrompt） */
export interface PromptBeautifyResponseVO {
  systemPrompt: string
}

/** 模板视图对象（后端 PromptTemplateVO） */
export interface PromptTemplateVO {
  id: number
  userId: number | null // null = 公共模板
  name: string
  systemPrompt: string
  mode: PromptMode
  targetCapabilities: string[] | null
  estPromptTokens: number | null
  status: number // 1-启用 0-禁用
  createdAt: string
  updatedAt: string
}

/** generate 请求 */
export interface PromptGenerateRequest {
  userHints: string[]
  mode: PromptMode
  targetCapabilities?: string[]
}

/** beautify 请求（v1.1） */
export interface PromptBeautifyRequest {
  systemPrompt: string
  agentId: number
  mode?: PromptMode
}

/** moderate 请求 */
export interface PromptModerateRequest {
  systemPrompt: string
  mode?: PromptMode
}

/** estimate 请求 */
export interface PromptEstimateRequest {
  systemPrompt: string
  model?: string
}

/** 手建/更新入参（后端 `public` 保留字 → TS isPublic，API 映射） */
export interface PromptTemplateRequest {
  name?: string
  systemPrompt?: string
  mode?: PromptMode
  targetCapabilities?: string[]
  status?: number
  isPublic?: boolean
}
```

- [ ] **Step 2: 在 `src/types/index.ts` 追加 re-export**

在文件末尾追加：

```typescript
export type {
  PromptMode, PromptTemplateVO, PromptGenerateResponseVO, PromptBeautifyResponseVO,
  ModerationVerdictVO, CostEstimateVO,
  PromptGenerateRequest, PromptBeautifyRequest, PromptModerateRequest, PromptEstimateRequest,
  PromptTemplateRequest,
} from './prompt'
export { PromptModeLabels } from './prompt'
```

- [ ] **Step 3: 类型检查通过（不引入新错误）**

Run: `npm run type-check`
Expected: 仅 4 个既有错误（abort/SwitchButton/crypto/idx），无 prompt 相关错误。

- [ ] **Step 4: Checkpoint — 审查后提交**

```bash
git add src/types/prompt.ts src/types/index.ts
git commit -m "feat: 新增 prompt 域类型定义"
```

---

## Task 3: request.ts 加 skipErrorHandler

**Files:**
- Modify: `src/utils/request.ts`
- Test: `src/__tests__/utils/request.test.ts`

**Interfaces:**
- Produces: `AxiosRequestConfig.skipErrorHandler?: boolean`；带该开关的请求，响应拦截器原样返回 axios response（不弹 toast、不 reject）。

- [ ] **Step 1: 写失败测试** (`src/__tests__/utils/request.test.ts`)

```typescript
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
```

- [ ] **Step 2: 运行测试，预期失败**

Run: `npx vitest run src/__tests__/utils/request.test.ts`
Expected: FAIL（`skipErrorHandler` 类型不存在 / 行为未实现，403 被 reject）。

- [ ] **Step 3: 实现 — 改 `src/utils/request.ts`**

完整文件（在原文件基础上加类型增强 + 拦截器开关判断）：

```typescript
import axios from 'axios'
import type { Result } from '@/types'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 类型增强：允许请求级声明「跳过全局错误处理」（generate/保存闸门的 403-blocked 是业务结果）
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorHandler?: boolean
  }
}

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    // 调用方显式跳过 → 原样返回完整响应，由调用方自判 code
    if (response.config.skipErrorHandler) {
      return response
    }
    const res = response.data as Result<unknown>
    if (res.code !== 200) {
      ElMessage.error(res.message || '请求失败')
      if (res.code === 401) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        router.push('/login')
      }
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      router.push('/login')
    }
    ElMessage.error(error.message || '网络错误')
    return Promise.reject(error)
  },
)

export default request
```

- [ ] **Step 4: 运行测试，预期通过**

Run: `npx vitest run src/__tests__/utils/request.test.ts`
Expected: PASS，3 个用例全绿。

- [ ] **Step 5: 全量测试 + 类型检查**

Run: `npm run test:run && npm run type-check`
Expected: 测试全绿；type-check 仍只有 4 个既有错误。

- [ ] **Step 6: Checkpoint — 审查后提交**

```bash
git add src/utils/request.ts src/__tests__/utils/request.test.ts
git commit -m "feat: request 加 skipErrorHandler 请求级开关"
```

---

## Task 4: API 层（`src/api/prompt.ts`）

**Files:**
- Create: `src/api/prompt.ts`
- Test: `src/__tests__/api/prompt.test.ts`

**Interfaces:**
- Consumes: Task 2 类型；Task 3 `skipErrorHandler`。
- Produces: `generatePrompt`、`beautifyPrompt`、`moderatePrompt`、`estimatePrompt`、`getTemplateList`、`getTemplate`、`createTemplate`、`updateTemplate`、`deleteTemplate`、`applyTemplateToAgent`（均返回 `AxiosResponse<Result<T>>`）。

- [ ] **Step 1: 写失败测试** (`src/__tests__/api/prompt.test.ts`)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../server'
import { envelope } from '../handlers'
import {
  generatePrompt, beautifyPrompt, moderatePrompt, estimatePrompt,
  getTemplateList, getTemplate, createTemplate, updateTemplate,
  deleteTemplate, applyTemplateToAgent,
} from '@/api/prompt'
import type { PromptTemplateRequest } from '@/types'

function mock(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, data: unknown, code = 200) {
  server.use(http[method](path, () => envelope(data, code)))
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
```

- [ ] **Step 2: 运行测试，预期失败**

Run: `npx vitest run src/__tests__/api/prompt.test.ts`
Expected: FAIL（`@/api/prompt` 不存在）。

- [ ] **Step 3: 实现 `src/api/prompt.ts`**

```typescript
import request from '@/utils/request'
import type {
  Result, PromptTemplateVO, PromptTemplateRequest,
  PromptGenerateRequest, PromptGenerateResponseVO,
  PromptBeautifyRequest, PromptBeautifyResponseVO,
  PromptModerateRequest, ModerationVerdictVO,
  PromptEstimateRequest, CostEstimateVO, PromptMode,
} from '@/types'

/** generate 草稿：403-blocked（草稿违规）是业务结果，跳过全局错误处理 */
export function generatePrompt(data: PromptGenerateRequest) {
  return request.post<Result<PromptGenerateResponseVO>>('/prompts/generate', data, {
    skipErrorHandler: true,
  })
}

/** beautify 美化（v1.1）：草稿 + agentId → 该 Agent LLM 润色；不校验/不落库 */
export function beautifyPrompt(data: PromptBeautifyRequest) {
  return request.post<Result<PromptBeautifyResponseVO>>('/prompts/beautify', data)
}

export function moderatePrompt(data: PromptModerateRequest) {
  return request.post<Result<ModerationVerdictVO>>('/prompts/moderate', data)
}

export function estimatePrompt(data: PromptEstimateRequest) {
  return request.post<Result<CostEstimateVO>>('/prompts/estimate', data)
}

export function getTemplateList(mode?: PromptMode) {
  return request.get<Result<PromptTemplateVO[]>>('/prompts/templates', {
    params: mode ? { mode } : undefined,
  })
}

export function getTemplate(id: number) {
  return request.get<Result<PromptTemplateVO>>(`/prompts/templates/${id}`)
}

/** create（统一提交，三条来源）：保存闸门可能返回 403-blocked，跳过全局错误处理 */
export function createTemplate(data: PromptTemplateRequest) {
  return request.post<Result<PromptTemplateVO>>('/prompts/templates', toPublicBody(data), {
    skipErrorHandler: true,
  })
}

/** update：保存闸门同样可能 403-blocked */
export function updateTemplate(id: number, data: PromptTemplateRequest) {
  return request.put<Result<PromptTemplateVO>>(`/prompts/templates/${id}`, toPublicBody(data), {
    skipErrorHandler: true,
  })
}

export function deleteTemplate(id: number) {
  return request.delete<Result<void>>(`/prompts/templates/${id}`)
}

export function applyTemplateToAgent(templateId: number, agentId: number) {
  return request.post<Result<void>>(`/prompts/templates/${templateId}/apply/${agentId}`)
}

/** isPublic → public 键映射；其余透传 */
function toPublicBody(data: PromptTemplateRequest): Record<string, unknown> {
  const { isPublic, ...rest } = data
  return isPublic === undefined ? rest : { ...rest, public: isPublic }
}
```

- [ ] **Step 4: 运行测试，预期通过**

Run: `npx vitest run src/__tests__/api/prompt.test.ts`
Expected: PASS。

- [ ] **Step 5: Checkpoint — 审查后提交**

```bash
git add src/api/prompt.ts src/__tests__/api/prompt.test.ts
git commit -m "feat: 新增 prompt API 模块（generate/beautify/CRUD/apply）"
```

---

## Task 5: AgentSelectDialog（复用 Agent 选择）

**Files:**
- Create: `src/components/prompt/AgentSelectDialog.vue`
- Test: `src/components/prompt/__tests__/AgentSelectDialog.test.ts`

**Interfaces:**
- Consumes: `getAgentList`（`@/api/agent`）；`AgentVO`。
- Produces: props `modelValue: boolean`、`title?: string`；emits `update:modelValue`、`select(agentId: number)`。beautify 与 apply 共用。

- [ ] **Step 1: 写失败测试** (`src/components/prompt/__tests__/AgentSelectDialog.test.ts`)

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
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
```

> 注：Element Plus `el-dialog`/`el-select` 在 jsdom 下 popper 不可见，测试以「数据加载 + emit 契约」为主，不深测 DOM 交互。

- [ ] **Step 2: 运行测试，预期失败**

Run: `npx vitest run src/components/prompt/__tests__/AgentSelectDialog.test.ts`
Expected: FAIL（组件不存在）。

- [ ] **Step 3: 实现 `src/components/prompt/AgentSelectDialog.vue`**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getAgentList } from '@/api/agent'
import type { AgentVO } from '@/types'

const props = defineProps<{ modelValue: boolean; title?: string }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [agentId: number]
}>()

const agents = ref<AgentVO[]>([])
const selectedAgentId = ref<number | null>(null)
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res = await getAgentList()
    agents.value = res.data.data ?? []
  } catch {
    ElMessage.error('加载 Agent 列表失败')
  } finally {
    loading.value = false
  }
})

/** 选定 agentId（供测试与确定按钮共用） */
function confirm(agentId: number | null = selectedAgentId.value) {
  if (agentId == null) {
    ElMessage.warning('请选择一个 Agent')
    return
  }
  emit('select', agentId)
  emit('update:modelValue', false)
}

defineExpose({ agents, confirm })
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title ?? '选择 Agent'"
    width="420px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-select
      v-model="selectedAgentId"
      placeholder="选择 Agent"
      :loading="loading"
      filterable
      style="width: 100%"
    >
      <el-option
        v-for="a in agents"
        :key="a.id"
        :label="a.name"
        :value="a.id"
      />
    </el-select>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirm()">确定</el-button>
    </template>
  </el-dialog>
</template>
```

- [ ] **Step 4: 运行测试，预期通过**

Run: `npx vitest run src/components/prompt/__tests__/AgentSelectDialog.test.ts`
Expected: PASS。

- [ ] **Step 5: Checkpoint — 审查后提交**

```bash
git add src/components/prompt/AgentSelectDialog.vue src/components/prompt/__tests__/
git commit -m "feat: 新增 AgentSelectDialog 复用组件"
```

---

## Task 6: PromptGenerateDialog（hints → 草稿，不落库）

**Files:**
- Create: `src/components/prompt/PromptGenerateDialog.vue`
- Test: `src/components/prompt/__tests__/PromptGenerateDialog.test.ts`

**Interfaces:**
- Consumes: `generatePrompt`。
- Produces: props `modelValue: boolean`；emits `update:modelValue`、`draft`（草稿对象 `{ systemPrompt, mode, caps? }`）。成功不"已保存"（v1.1 不落库）。

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
})
```

- [ ] **Step 2: 运行测试，预期失败**

Run: `npx vitest run src/components/prompt/__tests__/PromptGenerateDialog.test.ts`
Expected: FAIL（组件不存在；`fillInput`/`runGenerate`/`phase`/`blocked` 未定义）。

- [ ] **Step 3: 实现 `src/components/prompt/PromptGenerateDialog.vue`**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { generatePrompt } from '@/api/prompt'
import { PromptModeLabels } from '@/types'
import type { PromptMode, ModerationVerdictVO } from '@/types'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  draft: [d: { systemPrompt: string; mode: PromptMode; caps?: string[] }]
}>()

type Phase = 'input' | 'blocked'
const phase = ref<Phase>('input')
const generating = ref(false)
const hintsText = ref('')
const mode = ref<PromptMode>('acg')
const capsText = ref('')
const blocked = ref<ModerationVerdictVO | null>(null)

const userHints = computed(() =>
  hintsText.value.split('\n').map((s) => s.trim()).filter(Boolean),
)
const caps = computed(() =>
  capsText.value.split(',').map((s) => s.trim()).filter(Boolean),
)

async function handleGenerate() {
  if (!userHints.value.length) {
    ElMessage.warning('请至少输入一条要求')
    return
  }
  generating.value = true
  blocked.value = null
  try {
    const res = await generatePrompt({
      userHints: userHints.value,
      mode: mode.value,
      targetCapabilities: caps.value.length ? caps.value : undefined,
    })
    const env = res.data // skipErrorHandler 已开 → 完整信封
    if (env.code === 200) {
      const d = env.data
      emit('draft', { systemPrompt: d.systemPrompt, mode: d.mode, caps: caps.value.length ? caps.value : undefined })
      emit('update:modelValue', false)
      reset()
    } else if (env.code === 403) {
      blocked.value = env.data
      phase.value = 'blocked'
    } else {
      ElMessage.error(env.message || '生成失败')
    }
  } finally {
    generating.value = false
  }
}

function reset() {
  phase.value = 'input'
  hintsText.value = ''
  capsText.value = ''
  blocked.value = null
}

function retry() {
  phase.value = 'input'
  blocked.value = null
}

// 测试钩子（defineExpose 不影响生产）
defineExpose({
  phase,
  blocked,
  fillInput: (text: string) => { hintsText.value = text },
  runGenerate: handleGenerate,
})
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="生成系统提示词"
    width="640px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <!-- 输入态 -->
    <template v-if="phase === 'input'">
      <el-form label-position="top">
        <el-form-item label="要求（每行一条）">
          <el-input
            v-model="hintsText"
            type="textarea"
            :rows="5"
            placeholder="要一个毒舌但专业的客服&#10;回答偏简洁"
          />
        </el-form-item>
        <el-form-item label="生成模式">
          <el-radio-group v-model="mode">
            <el-radio v-for="(label, key) in PromptModeLabels" :key="key" :value="key">{{ label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="能力标签（可选，逗号分隔）">
          <el-input v-model="capsText" placeholder="chat,rag" />
        </el-form-item>
      </el-form>
    </template>

    <!-- 被拦截态 -->
    <template v-else>
      <el-alert title="提示词未通过合规校验" type="error" :closable="false" show-icon />
      <div v-if="blocked" class="verdict">
        <p><b>违规规则：</b>{{ blocked.violatedRules.join('；') || '—' }}</p>
        <p><b>原因：</b>{{ blocked.reasons.join('；') || '—' }}</p>
        <p><b>置信度：</b>{{ Math.round(blocked.confidence * 100) }}%</p>
      </div>
    </template>

    <template #footer>
      <template v-if="phase === 'input'">
        <el-button @click="emit('update:modelValue', false)">取消</el-button>
        <el-button type="primary" :loading="generating" @click="handleGenerate">生成</el-button>
      </template>
      <template v-else>
        <el-button type="primary" @click="retry">修改要求重试</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<style scoped>
.verdict { margin-top: 12px; font-size: 13px; line-height: 1.8; color: var(--color-text-secondary); }
</style>
```

- [ ] **Step 4: 运行测试，预期通过**

Run: `npx vitest run src/components/prompt/__tests__/PromptGenerateDialog.test.ts`
Expected: PASS，3 个用例。

- [ ] **Step 5: Checkpoint — 审查后提交**

```bash
git add src/components/prompt/PromptGenerateDialog.vue src/components/prompt/__tests__/PromptGenerateDialog.test.ts
git commit -m "feat: PromptGenerateDialog 草稿生成（不落库，支持被拦截重试）"
```

---

## Task 7: PromptEditDrawer（作者面 + 保存闸门）

**Files:**
- Create: `src/components/prompt/PromptEditDrawer.vue`
- Test: `src/components/prompt/__tests__/PromptEditDrawer.test.ts`

**Interfaces:**
- Consumes: `createTemplate`/`updateTemplate`/`beautifyPrompt`/`moderatePrompt`/`estimatePrompt`；`useAuthStore`；`AgentSelectDialog`；Task 2 类型。
- Produces: props `modelValue: boolean`、`template: PromptTemplateVO | null`、`seed: { systemPrompt: string; mode: PromptMode; caps?: string[] } | null`；emits `update:modelValue`、`saved`。
- 行为：保存(create/update)过闸门 —— 200 关闭并 `saved`；**403 设 gateVerdict 不关**；美化经 AgentSelectDialog 选 Agent 后回填 systemPrompt。

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
})
```

- [ ] **Step 2: 运行测试，预期失败**

Run: `npx vitest run src/components/prompt/__tests__/PromptEditDrawer.test.ts`
Expected: FAIL（组件不存在）。

- [ ] **Step 3: 实现 `src/components/prompt/PromptEditDrawer.vue`**

```vue
<script setup lang="ts">
import { ref, computed, watch, type FormInstance, type FormRules } from 'vue'
import { ElMessage } from 'element-plus'
import { createTemplate, updateTemplate, beautifyPrompt, moderatePrompt, estimatePrompt } from '@/api/prompt'
import { useAuthStore } from '@/stores/auth'
import { PromptModeLabels } from '@/types'
import type { PromptTemplateVO, PromptMode, ModerationVerdictVO, CostEstimateVO } from '@/types'
import AgentSelectDialog from './AgentSelectDialog.vue'

const props = defineProps<{
  modelValue: boolean
  template: PromptTemplateVO | null
  seed: { systemPrompt: string; mode: PromptMode; caps?: string[] } | null
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

const formRef = ref<FormInstance>()
const form = ref({
  name: '',
  systemPrompt: '',
  mode: 'acg' as PromptMode,
  status: true,
  isPublic: false,
})
const saving = ref(false)
const beautifyVisible = ref(false)
const gateVerdict = ref<ModerationVerdictVO | null>(null)
const moderateResult = ref<ModerationVerdictVO | null>(null)
const estimateResult = ref<CostEstimateVO | null>(null)

const formRules = computed<FormRules>(() => ({
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { max: 128, message: '名称不超过 128 字', trigger: 'blur' },
  ],
  systemPrompt: [{ required: true, message: '请输入系统提示词', trigger: 'blur' }],
}))

const isEdit = computed(() => !!props.template)

/** 初始化：编辑→填 VO；seed→填草稿；空→默认 */
function syncForm() {
  gateVerdict.value = null
  moderateResult.value = null
  estimateResult.value = null
  if (props.template) {
    form.value = {
      name: props.template.name,
      systemPrompt: props.template.systemPrompt,
      mode: props.template.mode,
      status: props.template.status === 1,
      isPublic: props.template.userId === null,
    }
  } else if (props.seed) {
    form.value = {
      name: '',
      systemPrompt: props.seed.systemPrompt,
      mode: props.seed.mode,
      status: true,
      isPublic: false,
    }
  } else {
    form.value = { name: '', systemPrompt: '', mode: 'acg', status: true, isPublic: false }
  }
}
watch(() => [props.template, props.seed], syncForm, { immediate: true })

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  gateVerdict.value = null
  try {
    const body = {
      name: form.value.name,
      systemPrompt: form.value.systemPrompt,
      mode: form.value.mode,
      status: form.value.status ? 1 : 0,
      isPublic: isAdmin.value ? form.value.isPublic : undefined,
    }
    const res = isEdit.value
      ? await updateTemplate(props.template!.id, body)
      : await createTemplate(body)
    const env = res.data
    if (env.code === 200) {
      ElMessage.success(isEdit.value ? '更新成功' : '保存成功')
      emit('saved')
      emit('update:modelValue', false)
    } else if (env.code === 403) {
      gateVerdict.value = env.data // 闸门拦截，不关抽屉
    } else {
      ElMessage.error(env.message || '保存失败')
    }
  } finally {
    saving.value = false
  }
}

async function applyBeautify(agentId: number) {
  beautifyVisible.value = false
  try {
    const res = await beautifyPrompt({ systemPrompt: form.value.systemPrompt, agentId, mode: form.value.mode })
    form.value.systemPrompt = res.data.data.systemPrompt
    gateVerdict.value = null
    ElMessage.success('美化完成')
  } catch {
    // 拦截器已弹 toast
  }
}

async function runModerate() {
  try {
    moderateResult.value = (await moderatePrompt({ systemPrompt: form.value.systemPrompt, mode: form.value.mode })).data.data
  } catch { /* 拦截器已弹 */ }
}

async function runEstimate() {
  try {
    estimateResult.value = (await estimatePrompt({ systemPrompt: form.value.systemPrompt })).data.data
  } catch { /* 拦截器已弹 */ }
}

defineExpose({
  form,
  gateVerdict,
  setName: (n: string) => { form.value.name = n },
  runSave: handleSave,
  applyBeautify,
})
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    :title="isEdit ? '编辑模板' : '编辑提示词'"
    size="520px"
    direction="rtl"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-position="top">
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="模板名称" maxlength="128" show-word-limit />
      </el-form-item>
      <el-form-item label="系统提示词" prop="systemPrompt">
        <el-input v-model="form.systemPrompt" type="textarea" :rows="10" placeholder="系统提示词正文" />
      </el-form-item>
      <el-form-item label="模式" prop="mode">
        <el-radio-group v-model="form.mode">
          <el-radio v-for="(label, key) in PromptModeLabels" :key="key" :value="key">{{ label }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="状态">
        <el-switch v-model="form.status" active-text="启用" inactive-text="禁用" />
      </el-form-item>
      <el-form-item v-if="isAdmin" label="设为公共模板">
        <el-switch v-model="form.isPublic" active-text="公共" inactive-text="私有" />
      </el-form-item>

      <!-- 工具行 -->
      <div class="tool-row">
        <el-button size="small" @click="beautifyVisible = true">美化（选 Agent LLM）</el-button>
        <el-button size="small" @click="runModerate">复检</el-button>
        <el-button size="small" @click="runEstimate">复估</el-button>
      </div>

      <!-- 复检 / 复估结果 -->
      <el-alert
        v-if="moderateResult"
        :title="moderateResult.passed ? '复检通过' : '复检未通过'"
        :type="moderateResult.passed ? 'success' : 'warning'"
        :closable="false"
        show-icon
        style="margin-top: 12px"
      />
      <el-alert
        v-if="estimateResult"
        :title="`估算 prompt token: ${estimateResult.promptTokens}（${estimateResult.model}）`"
        type="info"
        :closable="false"
        show-icon
        style="margin-top: 8px"
      />

      <!-- 保存闸门 verdict -->
      <el-alert
        v-if="gateVerdict"
        type="error"
        :closable="false"
        show-icon
        title="提示词未通过合规校验，未保存。请修改后重试"
        style="margin-top: 12px"
      >
        <div v-if="gateVerdict" style="font-size: 13px; line-height: 1.7">
          <p>违规规则：{{ gateVerdict.violatedRules.join('；') || '—' }}</p>
          <p>原因：{{ gateVerdict.reasons.join('；') || '—' }}</p>
          <p>置信度：{{ Math.round(gateVerdict.confidence * 100) }}%</p>
        </div>
      </el-alert>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>

    <AgentSelectDialog v-model="beautifyVisible" title="选择用于美化的 Agent" @select="applyBeautify" />
  </el-drawer>
</template>

<style scoped>
.tool-row { display: flex; gap: 8px; margin: 8px 0; }
</style>
```

- [ ] **Step 4: 运行测试，预期通过**

Run: `npx vitest run src/components/prompt/__tests__/PromptEditDrawer.test.ts`
Expected: PASS，3 个用例。

- [ ] **Step 5: Checkpoint — 审查后提交**

```bash
git add src/components/prompt/PromptEditDrawer.vue src/components/prompt/__tests__/PromptEditDrawer.test.ts
git commit -m "feat: PromptEditDrawer 编辑/美化/复检/保存闸门"
```

---

## Task 8: 模板列表页（`views/prompts/Index.vue`）

**Files:**
- Create: `src/views/prompts/Index.vue`
- Test: `src/views/prompts/__tests__/Index.test.ts`

**Interfaces:**
- Consumes: Task 4 API；Task 5/6/7 组件；`useAuthStore`；`getAgentList`（apply）。
- Produces: `/prompts` 页面 —— 列表 + mode/关键词筛选 + 删除 + 编排 generate/edit/apply。

- [ ] **Step 1: 写失败测试**（聚焦筛选 + 编排契约）

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
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

  it('mode 筛选生效', async () => {
    const wrapper = mount(PromptIndex)
    await new Promise((r) => setTimeout(r, 0))
    ;(wrapper.vm as any).filterMode = 'compliant'
    expect((wrapper.vm as any).filteredTemplates.map((t: PromptTemplateVO) => t.id)).toEqual([2])
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
```

- [ ] **Step 2: 运行测试，预期失败**

Run: `npx vitest run src/views/prompts/__tests__/Index.test.ts`
Expected: FAIL（页面不存在）。

- [ ] **Step 3: 实现 `src/views/prompts/Index.vue`**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getTemplateList, deleteTemplate, applyTemplateToAgent } from '@/api/prompt'
import { useAuthStore } from '@/stores/auth'
import { PromptModeLabels } from '@/types'
import type { PromptTemplateVO, PromptMode } from '@/types'
import PromptGenerateDialog from '@/components/prompt/PromptGenerateDialog.vue'
import PromptEditDrawer from '@/components/prompt/PromptEditDrawer.vue'
import AgentSelectDialog from '@/components/prompt/AgentSelectDialog.vue'

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)
const currentUserId = computed(() => authStore.userInfo?.id ?? null)

const templates = ref<PromptTemplateVO[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const filterMode = ref<PromptMode | ''>('')

const filteredTemplates = computed(() => {
  let list = templates.value
  if (filterMode.value) list = list.filter((t) => t.mode === filterMode.value)
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim().toLowerCase()
    list = list.filter((t) => t.name.toLowerCase().includes(kw))
  }
  return list
})

/** 当前用户是否可编辑/删除该模板（owner 或 admin） */
function canManage(tpl: PromptTemplateVO): boolean {
  return isAdmin.value || tpl.userId === currentUserId.value
}

async function fetchTemplates() {
  loading.value = true
  try {
    const res = await getTemplateList()
    templates.value = res.data.data ?? []
  } catch {
    ElMessage.error('加载模板列表失败')
  } finally {
    loading.value = false
  }
}

// --- generate ---
const generateVisible = ref(false)
// --- 编辑抽屉 ---
const drawerVisible = ref(false)
const editingTpl = ref<PromptTemplateVO | null>(null)
const draftSeed = ref<{ systemPrompt: string; mode: PromptMode; caps?: string[] } | null>(null)

function onDraft(draft: { systemPrompt: string; mode: PromptMode; caps?: string[] }) {
  editingTpl.value = null
  draftSeed.value = draft
  drawerVisible.value = true
}
function handleAdd() {
  editingTpl.value = null
  draftSeed.value = null
  drawerVisible.value = true
}
function handleEdit(tpl: PromptTemplateVO) {
  editingTpl.value = tpl
  draftSeed.value = null
  drawerVisible.value = true
}

// --- apply (admin) ---
const applyVisible = ref(false)
const applyingTpl = ref<PromptTemplateVO | null>(null)
function handleApply(tpl: PromptTemplateVO) {
  applyingTpl.value = tpl
  applyVisible.value = true
}
async function onApplyAgent(agentId: number) {
  if (!applyingTpl.value) return
  try {
    await applyTemplateToAgent(applyingTpl.value.id, agentId)
    ElMessage.success('已应用到该 Agent')
  } catch { /* 拦截器已弹 */ }
}

async function handleDelete(tpl: PromptTemplateVO) {
  await deleteTemplate(tpl.id)
  ElMessage.success('删除成功')
  await fetchTemplates()
}

fetchTemplates()
</script>

<template>
  <div class="prompt-page">
    <div class="page-header">
      <h2 class="page-title">提示词模板</h2>
      <div class="toolbar">
        <el-input v-model="searchKeyword" placeholder="搜索名称" clearable style="width: 200px" />
        <el-select v-model="filterMode" placeholder="全部模式" clearable style="width: 140px">
          <el-option v-for="(label, key) in PromptModeLabels" :key="key" :label="label" :value="key" />
        </el-select>
        <el-button @click="handleAdd">手动新建</el-button>
        <el-button type="primary" @click="generateVisible = true">生成提示词</el-button>
      </div>
    </div>

    <div v-loading="loading" class="tpl-list">
      <el-card v-for="tpl in filteredTemplates" :key="tpl.id" class="tpl-card" shadow="hover">
        <div class="tpl-head">
          <span class="tpl-name">{{ tpl.name }}</span>
          <el-tag size="small" :type="tpl.mode === 'acg' ? 'success' : 'warning'">
            {{ PromptModeLabels[tpl.mode] }}
          </el-tag>
          <el-tag size="small" :type="tpl.userId === null ? 'danger' : 'info'">
            {{ tpl.userId === null ? '公共' : '私有' }}
          </el-tag>
          <span class="tpl-tokens" v-if="tpl.estPromptTokens != null">~{{ tpl.estPromptTokens }} tokens</span>
        </div>
        <div class="tpl-actions">
          <el-button text size="small" @click="handleEdit(tpl)" v-if="canManage(tpl)">编辑</el-button>
          <el-button text size="small" type="primary" @click="handleApply(tpl)" v-if="isAdmin">应用到 Agent</el-button>
          <el-popconfirm title="确定删除该模板吗？" @confirm="handleDelete(tpl)" v-if="canManage(tpl)">
            <template #reference>
              <el-button text size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </div>
      </el-card>
      <div v-if="!loading && filteredTemplates.length === 0" class="empty-state">
        暂无模板，点击「生成提示词」或「手动新建」
      </div>
    </div>

    <PromptGenerateDialog v-model="generateVisible" @draft="onDraft" />
    <PromptEditDrawer
      v-model="drawerVisible"
      :template="editingTpl"
      :seed="draftSeed"
      @saved="fetchTemplates"
    />
    <AgentSelectDialog v-model="applyVisible" title="选择要应用的 Agent" @select="onApplyAgent" />
  </div>
</template>

<style scoped>
.prompt-page { padding: 24px; background: var(--color-bg-card); border-radius: var(--radius-base); box-shadow: var(--shadow-sm); }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 600; color: var(--color-text); }
.toolbar { display: flex; gap: 12px; }
.tpl-list { display: flex; flex-direction: column; gap: 12px; min-height: 200px; }
.tpl-card :deep(.el-card__body) { padding: 16px; }
.tpl-head { display: flex; align-items: center; gap: 8px; }
.tpl-name { font-weight: 600; color: var(--color-text); }
.tpl-tokens { margin-left: auto; font-size: 12px; color: var(--color-text-secondary); }
.tpl-actions { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--color-border); display: flex; justify-content: flex-end; gap: 4px; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 48px 0; font-size: 14px; }
</style>
```

- [ ] **Step 4: 运行测试，预期通过**

Run: `npx vitest run src/views/prompts/__tests__/Index.test.ts`
Expected: PASS，3 个用例。

- [ ] **Step 5: Checkpoint — 审查后提交**

```bash
git add src/views/prompts/ src/views/prompts/__tests__/
git commit -m "feat: 提示词模板列表页（筛选/CRUD/编排）"
```

---

## Task 9: 路由与菜单接入

**Files:**
- Modify: `src/router/index.ts`
- Modify: `src/layouts/AdminLayout.vue`

**Interfaces:**
- Produces: `/prompts` 路由（无 `meta.roles`，所有登录用户可见）；侧边栏菜单项「提示词模板」。

- [ ] **Step 1: 改 `src/router/index.ts`** —— 在 `agents` 路由后追加一行

定位 `path: 'agents'` 那一行，在其后追加：

```typescript
{ path: 'prompts', name: 'Prompts', component: () => import('@/views/prompts/Index.vue') },
```

- [ ] **Step 2: 改 `src/layouts/AdminLayout.vue`**

(a) 在 `<script setup>` 的 icon import 块加入图标（与现有图标同来源），例如：

```typescript
import {
  Odometer, Monitor, Film, FolderOpened, Setting, User, Lock, Key,
  UserFilled, SwitchButton, ChatLineSquare,
} from '@element-plus/icons-vue'
```

(b) 在 `allMenuItems` 数组里，紧跟 Agent 管理项之后插入（**无 `roles`**，所有登录用户可见）：

```typescript
{ index: '/prompts', title: '提示词模板', icon: ChatLineSquare },
```

- [ ] **Step 3: 类型检查通过**

Run: `npm run type-check`
Expected: 仅 4 个既有错误；无 router/menu 相关新错误。

- [ ] **Step 4: 手动联调（后端就绪时）**

Run: `npm run dev`
- 登录后侧边栏见「提示词模板」
- 进入 `/prompts`，列表加载（后端 `/api/prompts/templates`）
- 「生成提示词」→ 输入要求 → 草稿进编辑抽屉 → 保存（被拦截时显示 verdict）
- admin 可见「应用到 Agent」

> 后端未实现时，MSW 仅用于单测；dev 下会收到真实 404/500，属预期（联调待后端 v1.1 上线）。

- [ ] **Step 5: 全量测试回归**

Run: `npm run test:run`
Expected: 全绿。

- [ ] **Step 6: Checkpoint — 审查后提交**

```bash
git add src/router/index.ts src/layouts/AdminLayout.vue
git commit -m "feat: 接入 /prompts 路由与菜单"
```

---

## 验收清单（全部 Task 完成后）

- [ ] `npm run test:run` 全绿；`npm run test:coverage` 达 utils/api ≥80%、组件 ≥50%
- [ ] `npm run type-check` 无新增错误（基线 4 个既有错误）
- [ ] `npm run build` 成功（生产构建先类型检查再构建）
- [ ] 后端 v1.1 就绪后手动联调：generate 草稿（无 templateId）→ 美化 → 保存闸门（403 展示 verdict 不关）→ CRUD → admin apply
- [ ] 普通用户仅见公共+自己私有；admin 见全部；越权改/删后端 403 时前端拦截器正确弹错
- [ ] changelog（若按 CLAUDE.md 变更管理要求）：记录新增页面/路由 + request.ts 行为变更
