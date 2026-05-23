# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 构建与运行

```bash
# 安装依赖
npm install

# 开发服务器（http://localhost:5173，/api 代理到 localhost:8080）
npm run dev

# 类型检查
npm run type-check

# 生产构建（先类型检查再构建）
npm run build

# 预览生产构建
npm run preview
```

暂未配置测试框架、Linter 或 Formatter。

## 技术栈

- **Vue 3**（Composition API，`<script setup lang="ts">`）+ **Vite 8**
- **TypeScript**（strict 模式，vue-tsc 类型检查）
- **Vue Router 5** — History 模式，路由守卫鉴权
- **Pinia 3** — 状态管理（setup 函数式 store）
- **Element Plus** — UI 组件库
- **Axios** — HTTP 客户端，JWT 拦截器封装在 `src/utils/request.ts`
- **@element-plus/icons-vue** — 图标库

## 项目结构

```
src/
  main.ts              — 应用入口，注册 Pinia/Router/ElementPlus
  App.vue              — 根组件（<router-view>）
  api/                 — 按业务域划分的 API 模块（auth、agent、chat）
  assets/              — 静态资源
  components/          — 公共组件
  composables/         — Vue 组合式函数
  layouts/             — 布局组件（DefaultLayout 含顶部导航）
  router/index.ts      — 路由定义 + 鉴权守卫
  stores/              — Pinia 状态仓库（auth.ts 管理 JWT 和用户状态）
  styles/              — 全局样式
  types/               — TypeScript 类型定义（api.ts、auth.ts、agent.ts、chat.ts）
  utils/               — 工具函数（request.ts 为 axios 封装）
  views/               — 页面组件
    auth/              — Login.vue、Register.vue
    project/           — Create.vue、Workshop.vue
    assets/            — Index.vue
```

路径别名：`@/` → `src/`

## 后端 API

Spring Boot 后端（`acgAgent`）运行在 `http://localhost:8080`。Vite 开发服务器自动将 `/api` 请求代理到后端。

**响应格式：** `{code: number, message: string, data: T}` — 所有 API 请求通过 `src/utils/request.ts` 发出，自动解包响应体并处理 401 跳转登录。

**认证方式：** JWT Bearer Token 存储在 localStorage（`accessToken`、`refreshToken`）。请求拦截器自动附加 Token；响应拦截器处理 401 自动登出。

**核心接口：**

| 路径 | 鉴权 | 说明 |
|------|------|------|
| `POST /api/auth/register` | 否 | 注册 |
| `POST /api/auth/login` | 否 | 登录，返回 Token 对 |
| `POST /api/auth/refresh` | 否 | 刷新 Token |
| `GET /api/agents` | 否 | Agent 列表 |
| `POST/PUT/DELETE /api/agents/*` | 是 | Agent 增删改 |
| `POST /api/chat/conversations` | 是 | 创建对话 |
| `GET /api/chat/conversations` | 是 | 对话列表 |
| `POST /api/chat/conversations/:id/send` | 是 | SSE 流式消息 |
| `GET /api/users/*` | 是 | 用户 CRUD + RBAC |
| `GET /api/roles/*` | 是 | 角色 CRUD + 权限分配 |
| `GET /api/permissions/*` | 是 | 权限 CRUD |

**SSE 流式接口：** `POST /api/chat/conversations/:id/send` 返回 SseEmitter，前端使用 `EventSource` 或 `fetch` 流式读取。

## 路由

| 路由 | 页面组件 | 鉴权 | 说明 |
|------|---------|------|------|
| `/login` | auth/Login.vue | 否 | 登录页 |
| `/register` | auth/Register.vue | 否 | 注册页 |
| `/` | Home.vue | 是 | 项目列表（嵌套在 DefaultLayout 中） |
| `/project/create` | project/Create.vue | 是 | 创建项目 |
| `/project/:id` | project/Workshop.vue | 是 | 5 步创作工坊 |
| `/assets` | assets/Index.vue | 是 | 素材库 |

登录/注册页独立布局，其余页面嵌套在 `DefaultLayout`（顶部导航 + `<router-view>`）中。

## 产品背景

ACG Agent 是一个 AI 视频创作工坊。用户输入故事梗概，AI 自动完成：

1. **剧情扩展** — AI 将梗概扩展为完整剧情（SSE 流式输出）
2. **分镜生成** — AI 拆分镜头，生成镜头描述/运动/时长/对白
3. **角色设计** — AI 生成角色外貌描述
4. **图片生成** — AI 绘制角色三视图和分镜场景图
5. **视频生成** — Seedance 2.0 根据图片生成视频片段

每一步都支持预览、编辑、重新生成和确认后才进入下一步。

## 开发规约

- **禁止自动提交代码：** 不要执行 `git commit` 或 `git push`，所有代码变更由用户自行审查后提交
- API 响应统一使用 `{code, message, data}` 信封格式，通过 `request.ts` 解包
- Commit 消息使用约定式提交：`feat:`、`fix:`、`refactor:`、`chore:`
- 功能开发在 `web_dev` 分支，稳定后合并到 `master`
- 组件使用 `<script setup lang="ts">` + Composition API + strict TypeScript
- Pinia store 使用 setup 函数式写法（非 Options API）
- 新增接口：先在 `src/types/` 加类型定义，再在 `src/api/` 加请求函数

## 测试规约

### 测试框架

- **单元测试 / 组件测试：** Vitest（与 Vite 共享配置，零额外构建开销）
- **E2E 测试：** Playwright（跨浏览器，支持 Vue DevTools 插件生态）

安装参考：

```bash
# 单元 + 组件测试
npm install -D vitest @vue/test-utils @vitest/coverage-v8 jsdom

# E2E 测试
npm install -D @playwright/test
```

### 测试目录结构

```
src/
  __tests__/              # 通用单元测试
    utils/
      request.test.ts     # 工具函数测试
  components/
    __tests__/            # 组件测试就近放置
      MyComponent.test.ts
  views/
    __tests__/            # 页面组件测试就近放置
      Login.test.ts
e2e/                      # E2E 测试独立目录
  auth.spec.ts
  workshop.spec.ts
```

### 命名规范

- 测试文件：`<源文件名>.test.ts`（单元/组件）或 `<模块>.spec.ts`（E2E）
- 测试目录：就近放置（`__tests__/`），与源文件同级或同目录下
- `describe` 分组：使用被测函数/组件名，如 `describe('useAuthStore', () => {})`
- `it` / `test` 描述：使用中文描述业务行为，如 `it('应在 Token 过期时自动跳转登录页', () => {})`

### 测试分层策略

| 层级 | 覆盖范围 | 工具 | 运行频率 |
|------|---------|------|---------|
| **单元测试** | 工具函数、composables、store 逻辑 | Vitest + jsdom | 每次提交 |
| **组件测试** | Vue 组件渲染、交互事件、props/emit | Vitest + @vue/test-utils | 每次提交 |
| **API 集成测试** | 请求拦截器、Token 刷新、错误处理 | Vitest + MSW（Mock Service Worker） | 每次提交 |
| **E2E 测试** | 关键业务流程（登录→创建→工坊→聊天） | Playwright | 合并前 / CI |

### 编写要求

- **测试行为，不测实现：** 验证输入输出和副作用，不测私有方法或内部变量
- **Mock 边界清晰：** 只 mock 外部依赖（API 请求、路由），不 mock 被测模块内部的函数
- **MSW 模拟 API：** 使用 Mock Service Worker 拦截 HTTP 请求，返回符合 `{code, message, data}` 格式的 mock 数据
- **每个测试独立：** 不依赖执行顺序，使用 `beforeEach` 重置状态（特别是 Pinia store）
- **SSE 测试：** 对流式接口使用 `ReadableStream` mock 或 MSW 的流式响应模拟

### 覆盖率要求

```bash
# 运行覆盖率
npx vitest run --coverage
```

- 工具函数（`src/utils/`）：≥ 80%
- Store（`src/stores/`）：≥ 70%
- 组件（`src/components/`、`src/views/`）：≥ 50%（核心交互路径必须覆盖）
- 新增功能必须附带对应测试，不允许覆盖率下降

### 运行命令（建议添加到 package.json scripts）

```bash
# 单元/组件测试
npm run test              # vitest（watch 模式）
npm run test:run          # vitest run（单次执行）
npm run test:coverage     # 带覆盖率报告

# E2E 测试
npm run test:e2e          # playwright test
npm run test:e2e:ui       # playwright test --ui（可视化调试）
```

## 代码注释规约

### 基本原则

- **代码即文档：** 良好的命名和类型定义优于注释。如果代码本身足够清晰，不需要额外注释
- **注释说明"为什么"，不注释"是什么"：** 关注业务意图、设计决策、边界原因，不重复代码逻辑
- **注释语言：** 中文为主，技术术语保留英文

### 何时必须注释

| 场景 | 示例 |
|------|------|
| 非显而易见的业务逻辑 | `// 后端返回 401 时视为 Token 过期，需要清理本地状态并跳转` |
| Hack / Workaround | `// Element Plus 2.x 的 el-select 在虚拟滚动模式下不触发 change 事件，手动 dispatch` |
| 性能关键路径的取舍 | `// 这里用浅拷贝而非深拷贝，因为只有一级属性会被修改` |
| 外部依赖的行为约束 | `// SSE 连接超时设为 30s，后端 SseEmitter 的 timeout 配置为 60s` |
| 类型断言 / any 的原因 | `// MSW 的 handlers 类型不完全兼容 fetch，此处使用 any 避免 propagated 类型错误` |
| 临时方案 / TODO | `// TODO: 等后端实现分页接口后替换为真实分页逻辑 (#123)` |

### JSDoc 规范

公共 API 函数和复杂 composables 使用 JSDoc：

```typescript
/**
 * 发送聊天消息并以 SSE 流式接收响应
 * @param conversationId - 对话 ID
 * @param content - 用户消息内容
 * @param onChunk - 每接收一段流式文本时的回调
 * @returns AbortController，调用 `.abort()` 可取消流式请求
 */
export function sendStreamMessage(
  conversationId: string,
  content: string,
  onChunk: (text: string) => void,
): AbortController {
  // ...
}
```

- 公共工具函数（`src/utils/` 导出函数）：必须写 JSDoc
- Composables（`src/composables/` 导出函数）：必须写 JSDoc
- Store 的 action：建议写 JSDoc（至少描述副作用）
- 组件 props：通过 TypeScript 类型定义自文档化，复杂 props 补充注释
- 内部辅助函数、事件处理函数：不需要 JSDoc

### 组件注释

Vue SFC 不强制写顶层注释，以下情况需要：

```vue
<!-- 多步表单/复杂布局：用 HTML 注释标注区域 -->
<!-- 第一步：故事梗概输入 -->
<section v-if="currentStep === 1">
  ...
</section>

<!-- 第二步：剧情扩展预览 -->
<section v-if="currentStep === 2">
  ...
</section>
```

### 禁止的注释

- **注释掉的代码：** 用 Git 管理历史，不要注释掉代码块。删除即可
- **无意义的分隔线：** `// ========== 工具函数 ==========`
- **重复代码语义的注释：** `// 设置 loading 为 true` → `loading.value = true`
- **署名注释：** `// by 张三 2024-01-01`，Git blame 已有此信息
