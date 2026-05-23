# 全功能实现设计文档

日期：2026-05-24

## 概述

完成 acgagent-web 前端所有未实现页面的开发，对接后端已有 API，缺失 API 使用 Mock 数据。设计风格为精致极简（简约但不粗糙），基于 Element Plus 深度定制主题。

## 技术决策

- **UI 框架：** Element Plus 深度定制（CSS 变量覆盖默认主题）
- **布局：** 侧边栏管理后台布局（AdminLayout）
- **后端对接：** 现有 API 直接对接，缺失 API 用 Mock 数据
- **字体：** 中文系统默认，英文数字 DM Sans

## 设计语言

| 变量 | 值 | 用途 |
|------|----|------|
| `--color-primary` | `#e94560` | 强调色（珊瑚红），按钮/活跃状态 |
| `--color-sidebar` | `#1a1a2e` | 侧边栏背景（深邃墨蓝） |
| `--color-header` | `#16213e` | 顶栏背景 |
| `--color-bg` | `#f8f9fa` | 页面背景 |
| `--color-text` | `#2d3436` | 正文色 |
| `--color-text-secondary` | `#636e72` | 次要文字 |
| `--radius-base` | `8px` | 统一圆角 |
| `--radius-btn` | `6px` | 按钮圆角 |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.06)` | 轻阴影 |

## 路由结构

```
/login                    → 独立布局（已实现）
/register                 → 独立布局（已实现）
/                         → AdminLayout（新增）
  ├─ /dashboard           → 首页仪表盘
  ├─ /agents              → Agent 管理（CRUD）
  ├─ /chat                → 对话列表
  │   └─ /chat/:id        → 聊天详情（SSE 流式）
  ├─ /workshop/:id        → 创作工坊（Mock）
  └─ /assets              → 素材库（Mock）
/system                   → AdminLayout
  ├─ /system/users        → 用户管理（CRUD + 角色分配）
  ├─ /system/roles        → 角色管理（CRUD + 权限分配）
  └─ /system/permissions  → 权限管理（树形 CRUD）
```

## 文件结构（新增/修改）

```
src/
  layouts/
    AdminLayout.vue              ← 新增：侧边栏管理布局
  styles/
    variables.css                ← 新增：CSS 变量主题
    admin-theme.css              ← 新增：Element Plus 主题覆盖
  views/
    Dashboard.vue                ← 新增：仪表盘首页
    chat/
      List.vue                   ← 新增：对话列表
      Detail.vue                 ← 新增：聊天详情（SSE）
    agents/
      Index.vue                  ← 新增：Agent 管理列表
    workshop/
      Index.vue                  ← 新增：创作工坊（Mock）
    assets/
      Index.vue                  ← 修改：素材库（Mock）
    system/
      Users.vue                  ← 新增：用户管理
      Roles.vue                  ← 新增：角色管理
      Permissions.vue            ← 新增：权限管理
  components/
    chat/
      MessageBubble.vue          ← 新增：聊天气泡组件
      ChatInput.vue              ← 新增：聊天输入框组件
  api/
    user.ts                      ← 新增：用户 CRUD API
    role.ts                      ← 新增：角色 CRUD API
    permission.ts                ← 新增：权限 CRUD API
  types/
    user.ts                      ← 新增：用户类型
    role.ts                      ← 新增：角色类型
    permission.ts                ← 新增：权限类型
    index.ts                     ← 修改：增加新类型导出
  stores/
    chat.ts                      ← 新增：对话状态管理
  composables/
    useSSE.ts                    ← 新增：SSE 流式请求封装
  router/
    index.ts                     ← 修改：新增路由
```

## 模块设计

### P1：管理后台

#### 用户管理 `/system/users`

- **列表：** `el-table` 列：用户名、昵称、邮箱、手机、状态（el-tag）、创建时间、操作
- **搜索：** 用户名模糊搜索 + 状态下拉筛选
- **新增/编辑：** `el-dialog` 表单
- **分配角色：** `el-dialog` + `el-checkbox-group`，全量提交
- **删除：** `el-popconfirm`
- **状态切换：** `el-switch` + 确认后调用 PUT API
- **分页：** 前端分页（后端无分页接口）

#### 角色管理 `/system/roles`

- **列表：** 角色名、编码、排序、状态、备注、操作
- **新增/编辑：** `el-dialog` 表单
- **分配权限：** `el-dialog` + `el-tree`，基于 `parentId` 构建权限树，勾选后全量提交

#### 权限管理 `/system/permissions`

- **列表：** `el-table` 树形表格（`row-key="id"` + `:tree-props`）
- **列：** 权限名、编码、类型（菜单/按钮）、路径、图标、排序、状态、操作
- **新增/编辑：** `el-dialog`，上级权限用 `el-tree-select`

#### Agent 管理 `/agents`

- **列表：** 卡片布局（`el-card`），展示头像、名称、描述、模型、状态
- **新增/编辑：** `el-dialog` 大表单（API URL、API Key password 输入、模型、JSON 配置）
- **API Key：** 编辑时不回传 `******`，空值表示保持原值

### P2：聊天与首页

#### 仪表盘 `/dashboard`

- 欢迎区 + 3 张快捷操作卡片 + 最近对话列表

#### 对话列表 `/chat`

- 卡片网格，每张卡片：标题、Agent 名称、最后消息时间
- 新建对话：选择 Agent + 标题
- 删除确认

#### 聊天详情 `/chat/:id`

- 消息气泡：用户右对齐深色，AI 左对齐白色
- SSE 流式：`fetch` + `ReadableStream`，逐字渲染 + 闪烁光标
- 历史消息加载
- 发送时禁用输入，完成后恢复

### P3：Mock 页面

#### 创作工坊 `/workshop/:id`

- 5 步向导（故事梗概 → 剧情扩展 → 分镜生成 → 角色设计 → 视频生成）
- 每步用 Mock 数据展示，预留 API 对接接口
- 步骤条 `el-steps` + 内容区

#### 素材库 `/assets`

- 网格展示素材卡片（图片/视频）
- Mock 数据展示，预留 API 对接接口

## 后端 API 对接矩阵

| 模块 | API 文件 | 后端状态 |
|------|---------|---------|
| 认证 | `api/auth.ts` | 已实现 |
| 用户 | `api/user.ts` | 需新建，后端已有 |
| 角色 | `api/role.ts` | 需新建，后端已有 |
| 权限 | `api/permission.ts` | 需新建，后端已有 |
| Agent | `api/agent.ts` | 已实现 |
| 对话 | `api/chat.ts` | 已实现 |
| 工坊 | 无 | Mock |
| 素材 | 无 | Mock |
