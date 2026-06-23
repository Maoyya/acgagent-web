# 系统提示词生成功能 — 前端系分（Spec）

> 版本：1.1.0 | 日期：2026-06-23（v1.1 对齐后端 v1.1 流程重构） | 所属项目：acgagent-web（Vue 3 + TS + Element Plus）
> 状态：待评审 → 通过后进入 writing-plans
> 关联：Java 后端 spec `acgagent/docs/superpowers/specs/2026-06-21-prompt-generation-java-design.md`（v1.1）；changelog `acgagent/docs/changelogs/2026-06-22-prompt-generation-v1.1-flow.md`

> **v1.1 修订（对齐后端 2026-06-22）：**
> 1. **generate 不再落库**：只返回草稿（systemPrompt + moderation + estimate），**无 templateId、不写 DB**。前端不能当"已保存"。
> 2. **新增 beautify（美化）**：`POST /api/prompts/beautify`，草稿 + agentId → 用所选 Agent 的 LLM 润色 → 返回润色后文本。不校验、不落库。
> 3. **保存闸门**：`create`/`update` 落库前过 `/moderate`，blocked → `Result(403,"blocked",verdict)` 不落库。**前端 create/update 也要走 `skipErrorHandler` 处理 403**。
> 4. **统一落库点**：流程 = 生成草稿 →（美化 / 手改）→ 提交(create)过闸门 → 落库。三条来源（generate/beautify/手写）都经 create 落库。

---

## 1. 目标与背景

后端 v1.1 在 Java 侧实现「系统提示词生成」全链路（挂在 `/api/prompts`）：generate 出草稿、beautify 用所选 Agent 的 LLM 润色、模板双维度 CRUD（保存前过 moderation 闸门）、moderate/estimate 封装、apply-to-agent。本文档设计 acgagent-web 前端对应逻辑。

前端不做任何 LLM/合规/估算逻辑，只调 Java 接口、渲染结果、按 RBAC 门禁 UI。

### 1.1 关键决策（前端侧）

| # | 决策点 | 选择 | 理由 |
|---|---|---|---|
| 1 | 页面可见性 | **所有登录用户可见**（非 admin-only） | 后端模板双维度，普通用户也能生成、美化、拥有私有模板；路由不加 `meta.roles`。apply / 设为公共 admin-only（见 §7） |
| 2 | 403-blocked 处理 | **给 `request.ts` 加 `skipErrorHandler` 请求级开关**；generate + create + update 三处显式携带 | 后端 `403 blocked` 是合法业务结果带 verdict（generate 草稿违规 / 保存闸门拦截），不能被全局拦截器当错误弹 toast+reject。surgical，opt-in |
| 3 | `public` 保留字 | TS 字段命名 `isPublic`，API 层映射成请求体 `public` 键 | `public` 是 TS/JS 保留字，不宜直传；API 函数集中转换 |
| 4 | generate 不落库（v1.1） | **generate 只产草稿**，草稿喂给编辑抽屉；落库统一到 create（过闸门） | 对齐后端 v1.1 #12；解耦"生产"与"保存" |
| 5 | 美化(beautify) 入口 | **放在编辑抽屉内**（对当前草稿美化），选 Agent 复用 `AgentSelectDialog` | 就近操作；apply 也用同一 picker |
| 6 | 组件拆分 | `PromptGenerateDialog`（草稿）+ `PromptEditDrawer`（编辑/美化/复检/复估/保存-闸门）+ `AgentSelectDialog`（复用）+ apply 复用 AgentSelectDialog | 编辑抽屉是唯一"作者面"，处理三条来源 + 保存闸门；picker 复用避免重复 |
| 7 | 列表筛选 | 顶部 mode 下拉 + 关键词搜索；公共/私有用 tag | 与 Agent 管理页一致 |
| 8 | 菜单位置 | 顶层菜单项「提示词模板」紧跟 Agent 管理，不加 `roles` | 决策 1 |
| 9 | 校验风格 | 集中式 `computed<FormRules>` + `validate().catch(()=>false)` | 参考 system/Users.vue |

> 决策 1 产品权衡：普通用户的私有模板当前**无直接消费方**（apply 是 admin-only，路由层后端 v1.1 已放弃；用户改手动选 Agent 做 beautify）。忠实翻译双维度模型 → 给普通用户可见页面，管理自己的生成/美化产物。若评审认为普通用户暂不需要入口，可改 admin-only（加 `meta.roles:['admin']`），其余设计不变。**默认按忠实翻译（可见）。**

---

## 2. 范围

### 2.1 本期实现（前端侧）

1. **生成草稿**：`PromptGenerateDialog` — 输入 hints/mode/能力 → 调 generate → 成功产草稿（喂给编辑抽屉）/ 被拦截展示 verdict → 可重试
2. **编辑抽屉（作者面）**：`PromptEditDrawer` — 编辑 systemPrompt/name/mode/status/isPublic(admin)；美化(beautify，选 Agent)、复检(moderate)、复估(estimate)；**保存(create/update)过闸门**，blocked 展示 verdict 不关抽屉
3. **模板列表与 CRUD**：`views/prompts/Index.vue` — 列表（mode 筛选 + 搜索）、删除（owner/admin）
4. **apply-to-agent（admin）**：复用 `AgentSelectDialog` 选 Agent → 确认应用
5. **request.ts 改造**：支持 `skipErrorHandler`
6. **路由 + 菜单 + 类型 + API 模块**

### 2.2 不在本期范围

- 后端 / Python 侧任何实现
- 「后端路由 Agent」前端配置（后端 v1.1 已放弃）
- 模板版本管理、协作编辑、批量操作（YAGNI）

---

## 3. 文件分布（严格沿用现有结构）

```
src/
├─ types/
│  ├─ prompt.ts                      （新）
│  └─ index.ts                       （改：re-export）
├─ api/
│  └─ prompt.ts                      （新）
├─ utils/
│  └─ request.ts                     （改：skipErrorHandler + 类型增强）
├─ views/
│  └─ prompts/
│     └─ Index.vue                   （新：列表 + CRUD + 编排）
├─ components/
│  └─ prompt/
│     ├─ PromptGenerateDialog.vue    （新：hints → 草稿，不落库）
│     ├─ PromptEditDrawer.vue        （新：编辑/美化/复检/复估/保存-闸门）
│     └─ AgentSelectDialog.vue       （新：复用 Agent 选择，beautify+apply 共用）
├─ router/index.ts                   （改：加 /prompts 路由）
└─ layouts/AdminLayout.vue           （改：菜单加「提示词模板」）
```

---

## 4. 类型定义（`src/types/prompt.ts`）

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

/** beautify 响应（v1.1：润色后文本；字段名待后端最终确认，暂定 systemPrompt） */
export interface PromptBeautifyResponseVO {
  systemPrompt: string
}

/** 模板视图对象（后端 PromptTemplateVO） */
export interface PromptTemplateVO {
  id: number
  userId: number | null          // null = 公共模板
  name: string
  systemPrompt: string
  mode: PromptMode
  targetCapabilities: string[] | null
  estPromptTokens: number | null
  status: number                 // 1-启用 0-禁用
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

/** moderate / estimate 请求 */
export interface PromptModerateRequest {
  systemPrompt: string
  mode?: PromptMode
}
export interface PromptEstimateRequest {
  systemPrompt: string
  model?: string
}

/** 手建/更新入参（后端字段 `public` 保留字 → TS isPublic，API 映射） */
export interface PromptTemplateRequest {
  name?: string
  systemPrompt?: string
  mode?: PromptMode
  targetCapabilities?: string[]
  status?: number
  isPublic?: boolean
}
```

`types/index.ts` 追加：

```typescript
export type {
  PromptMode, PromptTemplateVO, PromptGenerateResponseVO, PromptBeautifyResponseVO,
  ModerationVerdictVO, CostEstimateVO,
  PromptGenerateRequest, PromptBeautifyRequest, PromptModerateRequest, PromptEstimateRequest,
  PromptTemplateRequest,
} from './prompt'
export { PromptModeLabels } from './prompt'
```

---

## 5. API 层（`src/api/prompt.ts`）与 request.ts 改造

### 5.1 request.ts 改造（surgical，核心）

```typescript
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorHandler?: boolean
  }
}

request.interceptors.response.use(
  (response) => {
    // 调用方显式跳过 → 原样返回完整响应，由调用方自判 code（generate/保存闸门的 403-blocked 是业务结果）
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
  // error 分支不变
)
```

> 跳过时返回 axios `response`，调用方读 `res.data.code` / `res.data.data`。不改任何既有调用。

### 5.2 api/prompt.ts

```typescript
import request from '@/utils/request'
import type {
  Result, PromptTemplateVO, PromptTemplateRequest,
  PromptGenerateRequest, PromptGenerateResponseVO,
  PromptBeautifyRequest, PromptBeautifyResponseVO,
  PromptModerateRequest, ModerationVerdictVO,
  PromptEstimateRequest, CostEstimateVO, PromptMode,
} from '@/types'

/** generate 草稿：403-blocked 是业务结果（草稿违规），跳过全局错误处理 */
export function generatePrompt(data: PromptGenerateRequest) {
  return request.post<Result<PromptGenerateResponseVO>>('/prompts/generate', data, {
    skipErrorHandler: true,
  })
}

/** beautify 美化（v1.1）：草稿 + agentId → 该 Agent LLM 润色 → 文本；不校验/不落库 */
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

---

## 6. 权限模型（前端 UI 门禁）

前端不做鉴权决策（后端强制），只做 UI 门禁。复用 `useAuthStore`。

| 动作 | 前端显示条件 | 依据 |
|---|---|---|
| 进入页面 | 所有登录用户 | 路由无 `meta.roles` |
| 看到全部模板 | 后端已按身份过滤返回 | 后端 §6.3 |
| 编辑/删除某模板 | `tpl.userId === currentUserId \|\| isAdmin` | owner-or-admin |
| 抽屉内「设为公共」开关 | `isAdmin` | 普通用户置 public → 403 |
| 抽屉内「美化」/复检/复估 | 所有用户 | 登录即可（美化用任意 Agent 的 LLM） |
| apply-to-agent | `isAdmin` | 后端 admin-only |

```typescript
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)
const currentUserId = computed(() => authStore.userInfo?.id ?? null)
function canManage(tpl: PromptTemplateVO): boolean {
  return isAdmin.value || tpl.userId === currentUserId.value
}
```

---

## 7. 视图与组件设计

### 7.1 `views/prompts/Index.vue`（主页 + 编排）

沿用 `agents/Index.vue` + `system/Users.vue` 模式。

**职责：** 列表 + 筛选 + 删除 + 打开 generate/edit/apply。**不直接处理保存闸门**（交给抽屉）。

```typescript
const templates = ref<PromptTemplateVO[]>([])
const filterMode = ref<PromptMode | ''>('')
const searchKeyword = ref('')
const filteredTemplates = computed(() => { /* mode + keyword 过滤 */ })

// generate 对话框
const generateVisible = ref(false)
// 编辑抽屉（手动新建 / 编辑 / 接收 generate 草稿）
const drawerVisible = ref(false)
const editingTpl = ref<PromptTemplateVO | null>(null)     // 编辑时传 VO；null=新建
const draftSeed = ref<{ systemPrompt: string; mode: PromptMode; caps?: string[] } | null>(null)  // generate 草稿喂入

// apply（复用 AgentSelectDialog）
const applyVisible = ref(false)
const applyTemplate = ref<PromptTemplateVO | null>(null)

// generate 草稿 → 关 generate 对话框，开抽屉注入草稿
function onDraft(draft) {
  generateVisible.value = false
  editingTpl.value = null
  draftSeed.value = draft
  drawerVisible.value = true
}
// 手动新建
function handleAdd() { editingTpl.value = null; draftSeed.value = null; drawerVisible.value = true }
// 编辑既有
function handleEdit(tpl) { editingTpl.value = tpl; draftSeed.value = null; drawerVisible.value = true }
```

**Template 结构：**
```
.page-header: 标题「提示词模板」 + .toolbar [搜索框 | mode 下拉 | 「手动新建」 | 「生成提示词」(主按钮)]
列表（v-loading）: 卡片/行 = 名称 | mode tag | 公共/私有 tag(userId===null→公共) | estPromptTokens | 状态点
  操作: [编辑][应用到Agent(仅admin)][删除(可管理时)]
空状态
<PromptGenerateDialog v-model="generateVisible" @draft="onDraft" />
<PromptEditDrawer v-model="drawerVisible" :template="editingTpl" :seed="draftSeed" @saved="fetchTemplates" />
<AgentSelectDialog v-model="applyVisible" title="选择要应用的 Agent" @select="onApplyAgent" />
```

### 7.2 `components/prompt/PromptGenerateDialog.vue`（草稿，不落库）

```typescript
type Phase = 'input' | 'blocked'
const phase = ref<Phase>('input')
const generating = ref(false)
const hintsText = ref('')
const mode = ref<PromptMode>('acg')
const capsText = ref('')
const blocked = ref<ModerationVerdictVO | null>(null)
const emit = defineEmits<{ draft: [d: { systemPrompt: string; mode: PromptMode; caps?: string[] }] }>()

const userHints = computed(() => hintsText.value.split('\n').map(s=>s.trim()).filter(Boolean))

async function handleGenerate() {
  if (!userHints.value.length) { ElMessage.warning('请至少输入一条要求'); return }
  generating.value = true
  try {
    const res = await generatePrompt({
      userHints: userHints.value,
      mode: mode.value,
      targetCapabilities: capsText.value.split(',').map(s=>s.trim()).filter(Boolean) || undefined,
    })
    const env = res.data                       // skipErrorHandler 已开 → 完整信封
    if (env.code === 200) {
      const d = env.data
      // v1.1：只产草稿，不落库。把草稿喂给编辑抽屉（含 estimate 缓存可透传）
      emit('draft', { systemPrompt: d.systemPrompt, mode: d.mode,
                      caps: /* targetCapabilities 原样回传 */ })
    } else if (env.code === 403) {
      blocked.value = env.data                 // verdict
      phase.value = 'blocked'
    } else {
      ElMessage.error(env.message || '生成失败')
    }
  } finally { generating.value = false }
}
```

**Template 两态：** input（多行 hints + mode radio + 可选能力 + 生成按钮）；blocked（violatedRules/reasons/confidence + 「修改要求重试」回到 input）。成功直接 emit 关闭，**无"已保存"提示**（v1.1 不落库）。

### 7.3 `components/prompt/PromptEditDrawer.vue`（作者面 + 保存闸门，核心）

三条来源统一入口：手动新建（空）、编辑既有（VO）、generate 草稿（seed）。

```typescript
const props = defineProps<{ template: PromptTemplateVO | null; seed: {...} | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const form = ref({ name: '', systemPrompt: '', mode: 'acg' as PromptMode, status: true, isPublic: false })
const formRules = computed<FormRules>(() => ({ /* name required + max128; systemPrompt required */ }))
const saving = ref(false)
const gateVerdict = ref<ModerationVerdictVO | null>(null)   // 保存闸门拦截展示
const moderateResult = ref<ModerationVerdictVO | null>(null)
const estimateResult = ref<CostEstimateVO | null>(null)
const beautifyVisible = ref(false)

// 初始化：编辑→填 VO；seed→填草稿；空→默认
watch(() => [props.template, props.seed], () => { /* 填充 form + 清 gateVerdict */ }, { immediate: true })

// 美化：选 Agent → 用该 Agent LLM 润色当前草稿
function onBeautifyAgent(agentId: number) {
  beautifyVisible.value = false
  beautifyPrompt({ systemPrompt: form.value.systemPrompt, agentId, mode: form.value.mode })
    .then(res => { form.value.systemPrompt = res.data.data.systemPrompt; gateVerdict.value = null; ElMessage.success('美化完成') })
}

// 保存：过闸门，blocked 不关抽屉
async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true; gateVerdict.value = null
  try {
    const body = { name, systemPrompt, mode, status: status?1:0, isPublic: isAdmin ? isPublic : undefined }
    const res = props.template
      ? await updateTemplate(props.template.id, body)
      : await createTemplate(body)
    const env = res.data
    if (env.code === 200) { ElMessage.success(props.template ? '更新成功' : '保存成功'); emit('saved'); emit('update:modelValue', false) }
    else if (env.code === 403) { gateVerdict.value = env.data }   // 闸门拦截，展示 verdict，不关抽屉
    else { ElMessage.error(env.message || '保存失败') }
  } finally { saving.value = false }
}
```

**Template 区块：**
- 表单：name / systemPrompt(textarea，大) / mode(radio) / status(switch) / isPublic(switch，仅 admin)
- 操作行：[美化(beautify) → 开 AgentSelectDialog] [复检(moderate) → 填 moderateResult] [复估(estimate) → 填 estimateResult]
- **保存闸门 verdict 区**：`v-if="gateVerdict"` 警示展示 violatedRules/reasons/confidence，提示「提示词未通过合规校验，请修改后保存」
- moderate / estimate 结果区（就近展示）
- footer：取消 / 保存(loading)
- 内嵌 `<AgentSelectDialog v-model="beautifyVisible" title="选择用于美化的 Agent" @select="onBeautifyAgent" />`

### 7.4 `components/prompt/AgentSelectDialog.vue`（复用）

```typescript
const props = defineProps<{ modelValue: boolean; title?: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; select: [agentId: number] }>()
const agents = ref<AgentVO[]>([])
onMounted(async () => { const res = await getAgentList(); agents.value = res.data.data })
// 选定 → emit('select', id); emit('update:modelValue', false)
```

Template：`el-dialog` + `el-select`(agent 列表) + 确认。beautify 与 apply 共用，仅 title 不同。

---

## 8. 路由与菜单

### 8.1 路由（`router/index.ts` children 追加，紧跟 agents）

```typescript
{ path: 'prompts', name: 'Prompts', component: () => import('@/views/prompts/Index.vue') },
```

> 不加 `meta.roles`（决策 1）。`requiresAuth` 由父级 `/` 继承。

### 8.2 菜单（`AdminLayout.vue` allMenuItems，紧跟 Agent 管理后）

```typescript
{ index: '/prompts', title: '提示词模板', icon: ChatLineSquare },   // 无 roles
```

---

## 9. 错误处理矩阵

| 场景 | Result code | 前端处理 |
|---|---|---|
| generate 成功（草稿） | 200 | emit 草稿 → 进抽屉 |
| generate 草稿被拦 | **403 blocked + verdict** | skipErrorHandler → 不弹 toast、不 reject → blocked 态展示 verdict |
| 美化成功 | 200 | 回填 systemPrompt |
| 美化 Agent 不存在 | 404 | 全局拦截器弹 + reject |
| 保存(create/update) 闸门通过 | 200 | 落库成功，关抽屉，刷新列表 |
| **保存闸门拦截** | **403 blocked + verdict** | **skipErrorHandler → 不弹 toast、不 reject → 抽屉内 gateVerdict 区展示 verdict，不关抽屉** |
| 保存时 Python /moderate 不可用 | 500 | 全局拦截器弹 + reject（强一致，保存失败） |
| mode 非法 | 400 | 全局拦截器弹 + reject（表单 radio 已限定，正常不触发） |
| 越权改/删他人私有、普通用户置 public | 403 "权限不足" | 全局拦截器弹 + reject（真错误） |
| apply 目标 Agent 不存在 | 404 | 全局拦截器弹 + reject |

> **403-blocked（业务）与 403-forbidden（错误）同为 code=403**：generate/create/update 走 `skipErrorHandler` 由调用方据 `message==='blocked'`/code + data 区分进 verdict 展示；其余 403 走全局拦截器当错误弹。路径不同互不干扰。

---

## 10. 测试（Vitest，验证意图）

| 用例 | 验证意图 |
|---|---|
| `generatePrompt_blocked_不弹toast且返回verdict` | mock 403 → 不 reject、无 ElMessage，能取 verdict | 403-blocked 是业务结果 |
| `generatePrompt_success_无templateId` | mock 200 → 响应无 templateId、是草稿 | v1.1 不落库 |
| `createTemplate_blocked_返回verdict不落库` | mock create 回 403 → 不 reject、能取 verdict | 保存闸门 |
| `createTemplate_success_落库` | mock 200 → 返回 VO | 闸门放行 |
| `toPublicBody_isPublic映射为public键` | `{isPublic:true}` → body 含 `public` 无 `isPublic` | 保留字映射 |
| `request.skipErrorHandler_跳过全局错误处理` | 带 skipErrorHandler 非 200 不触发 ElMessage/reject | 开关生效 |
| `PromptGenerateDialog_blocked进blocked态` | mock 403 → phase==='blocked' | 状态机 |
| `PromptGenerateDialog_success_emit draft无templateId` | mock 200 → emit('draft') 且草稿无 templateId | 草稿 |
| `PromptEditDrawer_保存闸门拦截展示gateVerdict不关抽屉` | mock create 403 → gateVerdict 有值、抽屉仍开 | 闸门 UI |
| `PromptEditDrawer_保存成功emit saved并关` | mock 200 → emit('saved') + 关 | 成功路径 |
| `AgentSelectDialog_加载列表并emit select` | 挂载→拉列表；选定→emit(id) | 复用组件 |
| `canManage_ownerOrAdmin` | 自己/admin 可管理；他人私有不可 | RBAC 门禁 |

> mock 边界：`@/api/prompt` 与 `request`（MSW 拦截 HTTP），不 mock 被测组件内部。

---

## 11. 对现有代码的改动（surgical）

| 文件 | 改动 | 性质 |
|---|---|---|
| `utils/request.ts` | `skipErrorHandler` + `AxiosRequestConfig` 增强（~5 行） | 小改，opt-in，不影响既有调用 |
| `types/index.ts` | re-export prompt 类型/标签 | 纯新增 |
| `router/index.ts` | 加 1 条路由 | 纯新增 |
| `layouts/AdminLayout.vue` | allMenuItems 加 1 条 + icon import | 纯新增 |
| 其余 types/api/views/components | 全新文件 | 纯新增 |

> 不改现有业务逻辑、auth store、agent 模块。apply 复用 `getAgentList` 只读。

---

## 12. 假设与待办

- **假设**：后端 `/api/prompts/**` 经 Gateway 既有 `lb://acg-chat` 路由可达（含 v1.1 新增 `/beautify`，同前缀自动覆盖，changelog 已确认无网关变更）。Vite dev `/api→:8080` 已覆盖。
- **假设**：后端按 v1.1 契约实现（generate 草稿无 templateId、beautify 端点、create/update 403 闸门、信封 `{code,message,data}`）。后端尚未实现时前端以 mock/MSW 联调。
- **假设**：`PromptBeautifyResponseVO` 字段名为 `{ systemPrompt: string }` —— **plan 阶段以后端最终 VO 为准**（changelog 仅说"返回润色后文本"）。
- **假设**：`authStore.userInfo.id` 在页面渲染时已就绪；apply/门禁判断用 `?? null` 兜底。
- **跨仓库依赖**（同后端）：beautify 与保存闸门依赖 Python spec v1.1；Python 未实现前 generate/beautify/moderate/estimate 端到端 blocked，**模板 create/update 闸门也需 Python `/moderate` 在线**。前端需对保存 500（Python 挂）有明确错误提示。
- **待办（plan 阶段确认）**：决策 1 产品取舍（普通用户可见 vs admin-only）；`PromptBeautifyResponseVO` 字段名；是否需 changelog。
- **未来扩展**：模板版本/协作；批量应用。

---

## 13. 与后端 spec 的字段/语义对照（自检）

| 后端 v1.1 | 前端 | 一致性 |
|---|---|---|
| generate 草稿**无 templateId** | `PromptGenerateResponseVO` 无 templateId | ✅ §4 |
| generate 不落库 | 草稿 emit 给抽屉，不"已保存" | ✅ §7.2 |
| `POST /beautify`（草稿+agentId→文本） | `beautifyPrompt` + 抽屉内美化 | ✅ §5.2/§7.3 |
| create/update **保存闸门 403** | `skipErrorHandler` + gateVerdict 展示 | ✅ §5.2/§7.3/§9 |
| `PromptTemplateRequest.public` | `isPublic` → `toPublicBody` 映射 `public` | ✅ §5.2 |
| `mode` value `acg`/`compliant` | `PromptMode` | ✅ |
| apply admin-only | 按钮 `isAdmin` 门禁 | ✅ §6 |
| list 双维度可见性 | 后端过滤，前端直渲 | ✅ |
