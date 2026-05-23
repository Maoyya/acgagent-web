# 全功能实现执行计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成所有未实现页面（管理后台、聊天、工坊、素材库），对接后端 API，缺失 API 用 Mock 数据。

**Architecture:** 侧边栏管理布局（AdminLayout），Element Plus 深度定制主题，Pinia store 管理状态，SSE composable 处理流式聊天。

**Tech Stack:** Vue 3 Composition API + TypeScript + Element Plus + Pinia + Axios + fetch SSE

---

## Phase 0: 基础设施

### Task 1: 主题与 CSS 变量

**Files:**
- Create: `src/styles/variables.css`
- Create: `src/styles/admin-theme.css`
- Modify: `src/main.ts`

- [ ] **Step 1: 创建 CSS 变量文件**

```css
/* src/styles/variables.css */
:root {
  --color-primary: #e94560;
  --color-primary-light: #ff6b81;
  --color-primary-dark: #c0392b;
  --color-sidebar: #1a1a2e;
  --color-sidebar-hover: #16213e;
  --color-header: #16213e;
  --color-bg: #f8f9fa;
  --color-bg-card: #ffffff;
  --color-text: #2d3436;
  --color-text-secondary: #636e72;
  --color-text-light: #b2bec3;
  --color-border: #e9ecef;
  --color-success: #00b894;
  --color-warning: #fdcb6e;
  --color-danger: #e94560;
  --color-info: #74b9ff;
  --radius-base: 8px;
  --radius-btn: 6px;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --sidebar-width: 220px;
  --header-height: 60px;
}
```

- [ ] **Step 2: 创建 Element Plus 主题覆盖文件**

```css
/* src/styles/admin-theme.css */
@import './variables.css';

/* Element Plus 主题覆盖 */
:root {
  --el-color-primary: #e94560;
  --el-color-primary-light-3: #ff6b81;
  --el-color-primary-light-5: #f0909f;
  --el-color-primary-light-7: #f5b5bf;
  --el-color-primary-light-9: #fde8eb;
  --el-color-primary-dark-2: #bb384d;
  --el-border-radius-base: 6px;
  --el-border-radius-round: 20px;
  --el-font-family: 'DM Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* 全局基础样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'DM Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
}

/* DM Sans 字体引入 */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
```

- [ ] **Step 3: 在 main.ts 中引入主题**

在 `src/main.ts` 的 Element Plus CSS 导入之后添加主题文件导入：

```typescript
// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/admin-theme.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
```

- [ ] **Step 4: 提交**

```bash
git add src/styles/ src/main.ts
git commit -m "feat: add theme CSS variables and Element Plus customization"
```

---

### Task 2: 更新现有类型 + 新增类型定义

**Files:**
- Modify: `src/types/auth.ts` (TokenVO 增加 expiresIn)
- Modify: `src/types/agent.ts` (AgentVO 增加 avatar)
- Modify: `src/types/chat.ts` (MessageVO role 改为小写)
- Create: `src/types/user.ts`
- Create: `src/types/role.ts`
- Create: `src/types/permission.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: 更新 auth.ts 类型**

```typescript
/* src/types/auth.ts */
export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  email?: string
}

export interface TokenVO {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface RefreshTokenRequest {
  refreshToken: string
}
```

- [ ] **Step 2: 更新 agent.ts 类型**

```typescript
/* src/types/agent.ts */
export interface AgentVO {
  id: number
  name: string
  description: string | null
  avatar: string | null
  apiUrl: string
  apiKey: string
  model: string
  status: number
  configJson: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAgentRequest {
  name: string
  description?: string
  avatar?: string
  apiUrl: string
  apiKey: string
  model: string
  status?: number
  configJson?: string
}
```

- [ ] **Step 3: 更新 chat.ts 类型**

```typescript
/* src/types/chat.ts */
export interface ConversationVO {
  id: number
  userId: number
  agentId: number
  title: string
  createdAt: string
  updatedAt: string
}

export interface MessageVO {
  id: number
  conversationId: number
  role: 'user' | 'assistant'
  content: string
  tokens: number | null
  createdAt: string
}

export interface CreateConversationRequest {
  agentId: number
  title?: string
}

export interface SendMessageRequest {
  content: string
}
```

- [ ] **Step 4: 创建 user.ts 类型**

```typescript
/* src/types/user.ts */
export interface UserVO {
  id: number
  username: string
  nickname: string | null
  email: string | null
  phone: string | null
  avatar: string | null
  status: number
  createdAt: string
  updatedAt: string
}

export interface CreateUserRequest {
  username: string
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
  status?: number
}

export interface UpdateUserRequest {
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
  status?: number
}
```

- [ ] **Step 5: 创建 role.ts 类型**

```typescript
/* src/types/role.ts */
export interface RoleVO {
  id: number
  name: string
  code: string
  sort: number
  status: number
  remark: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateRoleRequest {
  name: string
  code: string
  sort?: number
  status?: number
  remark?: string
}

export interface UpdateRoleRequest {
  name?: string
  code?: string
  sort?: number
  status?: number
  remark?: string
}
```

- [ ] **Step 6: 创建 permission.ts 类型**

```typescript
/* src/types/permission.ts */
export interface PermissionVO {
  id: number
  parentId: number
  name: string
  code: string
  type: number
  path: string | null
  icon: string | null
  sort: number
  status: number
  createdAt: string
  updatedAt: string
}

export interface CreatePermissionRequest {
  parentId?: number
  name: string
  code: string
  type: number
  path?: string
  icon?: string
  sort?: number
  status?: number
}

export interface UpdatePermissionRequest {
  parentId?: number
  name?: string
  code?: string
  type?: number
  path?: string
  icon?: string
  sort?: number
  status?: number
}

export interface PermissionTreeNode extends PermissionVO {
  children: PermissionTreeNode[]
}
```

- [ ] **Step 7: 更新 index.ts 导出**

```typescript
/* src/types/index.ts */
export type { Result } from './api'
export type { LoginRequest, RegisterRequest, TokenVO, RefreshTokenRequest } from './auth'
export type { AgentVO, CreateAgentRequest } from './agent'
export type {
  ConversationVO,
  MessageVO,
  CreateConversationRequest,
  SendMessageRequest,
} from './chat'
export type { UserVO, CreateUserRequest, UpdateUserRequest } from './user'
export type { RoleVO, CreateRoleRequest, UpdateRoleRequest } from './role'
export type { PermissionVO, CreatePermissionRequest, UpdatePermissionRequest, PermissionTreeNode } from './permission'
```

- [ ] **Step 8: 提交**

```bash
git add src/types/
git commit -m "feat: update existing types and add user/role/permission types"
```

---

### Task 3: 新增 API 模块

**Files:**
- Create: `src/api/user.ts`
- Create: `src/api/role.ts`
- Create: `src/api/permission.ts`

- [ ] **Step 1: 创建用户 API**

```typescript
/* src/api/user.ts */
import request from '@/utils/request'
import type { Result, UserVO, CreateUserRequest, UpdateUserRequest } from '@/types'

export function getCurrentUser() {
  return request.get<Result<UserVO>>('/users/me')
}

export function getUserList() {
  return request.get<Result<UserVO[]>>('/users')
}

export function getUser(id: number) {
  return request.get<Result<UserVO>>(`/users/${id}`)
}

export function createUser(data: CreateUserRequest) {
  return request.post<Result<UserVO>>('/users', data)
}

export function updateUser(id: number, data: UpdateUserRequest) {
  return request.put<Result<UserVO>>(`/users/${id}`, data)
}

export function deleteUser(id: number) {
  return request.delete<Result<void>>(`/users/${id}`)
}

export function assignUserRoles(userId: number, roleIds: number[]) {
  return request.post<Result<void>>(`/users/${userId}/roles`, roleIds)
}

export function getUserRoleIds(userId: number) {
  return request.get<Result<number[]>>(`/users/${userId}/roles`)
}
```

- [ ] **Step 2: 创建角色 API**

```typescript
/* src/api/role.ts */
import request from '@/utils/request'
import type { Result, RoleVO, CreateRoleRequest, UpdateRoleRequest, PermissionVO } from '@/types'

export function getRoleList() {
  return request.get<Result<RoleVO[]>>('/roles')
}

export function getRole(id: number) {
  return request.get<Result<RoleVO>>(`/roles/${id}`)
}

export function createRole(data: CreateRoleRequest) {
  return request.post<Result<RoleVO>>('/roles', data)
}

export function updateRole(id: number, data: UpdateRoleRequest) {
  return request.put<Result<RoleVO>>(`/roles/${id}`, data)
}

export function deleteRole(id: number) {
  return request.delete<Result<void>>(`/roles/${id}`)
}

export function assignRolePermissions(roleId: number, permissionIds: number[]) {
  return request.post<Result<void>>(`/roles/${roleId}/permissions`, permissionIds)
}

export function getRolePermissions(roleId: number) {
  return request.get<Result<PermissionVO[]>>(`/roles/${roleId}/permissions`)
}
```

- [ ] **Step 3: 创建权限 API**

```typescript
/* src/api/permission.ts */
import request from '@/utils/request'
import type { Result, PermissionVO, CreatePermissionRequest, UpdatePermissionRequest } from '@/types'

export function getPermissionList() {
  return request.get<Result<PermissionVO[]>>('/permissions')
}

export function getPermission(id: number) {
  return request.get<Result<PermissionVO>>(`/permissions/${id}`)
}

export function createPermission(data: CreatePermissionRequest) {
  return request.post<Result<PermissionVO>>('/permissions', data)
}

export function updatePermission(id: number, data: UpdatePermissionRequest) {
  return request.put<Result<PermissionVO>>(`/permissions/${id}`, data)
}

export function deletePermission(id: number) {
  return request.delete<Result<void>>(`/permissions/${id}`)
}
```

- [ ] **Step 4: 提交**

```bash
git add src/api/
git commit -m "feat: add user, role, and permission API modules"
```

---

### Task 4: AdminLayout 布局组件

**Files:**
- Create: `src/layouts/AdminLayout.vue`

- [ ] **Step 1: 创建 AdminLayout**

```vue
<!-- src/layouts/AdminLayout.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  Odometer,
  Monitor,
  ChatDotRound,
  Film,
  FolderOpened,
  Setting,
  User,
  Lock,
  Key,
  SwitchButton,
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const sidebarCollapsed = ref(false)

const activeMenu = computed(() => route.path)

function handleLogout() {
  authStore.logout()
}
</script>

<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="sidebarCollapsed ? '64px' : '220px'" class="sidebar">
      <div class="sidebar-logo" @click="router.push('/dashboard')">
        <span v-if="!sidebarCollapsed" class="logo-text">ACG Agent</span>
        <span v-else class="logo-text-short">A</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="sidebarCollapsed"
        :collapse-transition="false"
        router
        class="sidebar-menu"
        background-color="transparent"
        text-color="rgba(255,255,255,0.7)"
        active-text-color="#ffffff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <template #title>概览</template>
        </el-menu-item>
        <el-menu-item index="/agents">
          <el-icon><Monitor /></el-icon>
          <template #title>Agent</template>
        </el-menu-item>
        <el-menu-item index="/chat">
          <el-icon><ChatDotRound /></el-icon>
          <template #title>对话</template>
        </el-menu-item>
        <el-divider style="border-color: rgba(255,255,255,0.1); margin: 8px 16px;" />
        <el-menu-item index="/workshop/new">
          <el-icon><Film /></el-icon>
          <template #title>创作工坊</template>
        </el-menu-item>
        <el-menu-item index="/assets">
          <el-icon><FolderOpened /></el-icon>
          <template #title>素材库</template>
        </el-menu-item>
        <el-divider style="border-color: rgba(255,255,255,0.1); margin: 8px 16px;" />
        <el-sub-menu index="system">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/system/users">
            <el-icon><User /></el-icon>
            <template #title>用户管理</template>
          </el-menu-item>
          <el-menu-item index="/system/roles">
            <el-icon><Lock /></el-icon>
            <template #title>角色管理</template>
          </el-menu-item>
          <el-menu-item index="/system/permissions">
            <el-icon><Key /></el-icon>
            <template #title>权限管理</template>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <!-- 右侧主区域 -->
    <el-container>
      <!-- 顶栏 -->
      <el-header class="header" :height="'60px'">
        <div class="header-left">
          <el-icon
            class="collapse-btn"
            @click="sidebarCollapsed = !sidebarCollapsed"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </el-icon>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleLogout">
            <span class="user-info">
              <el-avatar :size="32" class="user-avatar">
                {{ authStore.isLoggedIn ? 'U' : '' }}
              </el-avatar>
              <el-icon class="el-icon--right"><SwitchButton /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
}

.sidebar {
  background: var(--color-sidebar);
  transition: width 0.2s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sidebar-logo {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logo-text {
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  font-family: 'DM Sans', sans-serif;
  letter-spacing: -0.5px;
}

.logo-text-short {
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  font-family: 'DM Sans', sans-serif;
}

.sidebar-menu {
  border-right: none;
  flex: 1;
  overflow-y: auto;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 220px;
}

:deep(.el-menu-item.is-active) {
  background: rgba(233, 69, 96, 0.15) !important;
  border-right: 3px solid var(--color-primary);
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background: var(--color-sidebar-hover) !important;
}

.header {
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.collapse-btn {
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: color 0.2s;
}

.collapse-btn:hover {
  color: var(--color-text);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-avatar {
  background: var(--color-primary);
  color: #fff;
  font-weight: 600;
}

.main-content {
  background: var(--color-bg);
  padding: 24px;
  overflow-y: auto;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add src/layouts/AdminLayout.vue
git commit -m "feat: add AdminLayout with sidebar navigation"
```

---

### Task 5: 路由重构

**Files:**
- Modify: `src/router/index.ts`

- [ ] **Step 1: 重写路由，使用 AdminLayout 替代 DefaultLayout**

```typescript
/* src/router/index.ts */
import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/Login.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/auth/Register.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue') },
        { path: 'agents', name: 'Agents', component: () => import('@/views/agents/Index.vue') },
        { path: 'chat', name: 'ChatList', component: () => import('@/views/chat/List.vue') },
        { path: 'chat/:id', name: 'ChatDetail', component: () => import('@/views/chat/Detail.vue') },
        { path: 'workshop/:id', name: 'Workshop', component: () => import('@/views/workshop/Index.vue') },
        { path: 'assets', name: 'Assets', component: () => import('@/views/assets/Index.vue') },
        { path: 'system/users', name: 'Users', component: () => import('@/views/system/Users.vue') },
        { path: 'system/roles', name: 'Roles', component: () => import('@/views/system/Roles.vue') },
        { path: 'system/permissions', name: 'Permissions', component: () => import('@/views/system/Permissions.vue') },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem('accessToken')
  if (to.meta.requiresAuth && !token) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
  if ((to.name === 'Login' || to.name === 'Register') && token) {
    return { name: 'Dashboard' }
  }
})

export default router
```

- [ ] **Step 2: 提交**

```bash
git add src/router/index.ts
git commit -m "refactor: restructure routes with AdminLayout and new pages"
```

---

## Phase 1: P1 管理后台

### Task 6: 用户管理页面

**Files:**
- Create: `src/views/system/Users.vue`

- [ ] **Step 1: 创建用户管理页面**

完整的用户 CRUD 页面，包含：
- 搜索栏（用户名 + 状态筛选）
- el-table 表格（用户名、昵称、邮箱、手机、状态 tag、创建时间、操作列）
- 新增/编辑 dialog 表单
- 分配角色 dialog（checkbox-group）
- 删除 popconfirm
- 状态 el-switch 切换
- 前端分页

参考实现：调用 `src/api/user.ts` 中的 `getUserList`, `createUser`, `updateUser`, `deleteUser`, `assignUserRoles`, `getUserRoleIds`；调用 `src/api/role.ts` 中的 `getRoleList` 获取角色列表。搜索和分页在前端过滤。状态列使用 `el-tag`（`status === 1` 显示绿色"启用"，否则红色"禁用"），操作列包含编辑/删除/分配角色按钮。dialog 表单字段与 `CreateUserRequest` / `UpdateUserRequest` 对齐。

- [ ] **Step 2: 提交**

```bash
git add src/views/system/Users.vue
git commit -m "feat: add user management page with CRUD and role assignment"
```

---

### Task 7: 角色管理页面

**Files:**
- Create: `src/views/system/Roles.vue`

- [ ] **Step 1: 创建角色管理页面**

完整的角色 CRUD 页面，包含：
- el-table 表格（角色名、编码、排序、状态 tag、备注、操作列）
- 新增/编辑 dialog 表单
- 分配权限 dialog（el-tree 权限树）
- 删除 popconfirm

参考实现：调用 `src/api/role.ts` 中的全部函数；分配权限时调用 `getPermissionList` 构建树，`getRolePermissions` 获取已选权限，`assignRolePermissions` 全量提交。权限树使用 `el-tree`，`node-key="id"`，`:props="{ label: 'name', children: 'children' }"`，需要在加载时将扁平的 `PermissionVO[]` 通过 `parentId` 构建为 `PermissionTreeNode[]`。

- [ ] **Step 2: 提交**

```bash
git add src/views/system/Roles.vue
git commit -m "feat: add role management page with CRUD and permission assignment"
```

---

### Task 8: 权限管理页面

**Files:**
- Create: `src/views/system/Permissions.vue`

- [ ] **Step 1: 创建权限管理页面**

树形权限管理页面，包含：
- el-table 树形表格（`row-key="id"`, `:tree-props="{ children: 'children', hasChildren: 'hasChildren' }"`）
- 列：权限名、编码、类型（菜单/按钮 el-tag）、路径、图标、排序、状态、操作
- 新增/编辑 dialog 表单，上级权限用 `el-tree-select`

参考实现：调用 `src/api/permission.ts` 中的全部函数。列表数据通过 `buildPermissionTree()` 将扁平结构转为树形。新增时 `parentId` 默认为 0（顶级），选择上级时用 `el-tree-select`。类型列：`type === 1` 显示"菜单"，`type === 2` 显示"按钮"。

- [ ] **Step 2: 提交**

```bash
git add src/views/system/Permissions.vue
git commit -m "feat: add permission management page with tree table"
```

---

### Task 9: Agent 管理页面

**Files:**
- Create: `src/views/agents/Index.vue`

- [ ] **Step 1: 创建 Agent 管理页面**

卡片式 Agent 管理页面，包含：
- 顶部操作栏（搜索 + 新增按钮）
- 卡片网格布局，每张卡片：头像占位、名称、描述、模型名、状态 tag
- 新增/编辑 dialog 大表单（名称、描述、API URL、API Key password 输入、模型、状态、JSON 配置 textarea）
- API Key 编辑策略：输入框 placeholder 显示 "******"，空值提交时传 "******" 保持不变

参考实现：调用 `src/api/agent.ts` 中的全部函数。卡片使用 `el-card` + CSS Grid `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`。编辑时 API Key 输入框 `type="password"`，提交时如果为空则传 `"******"`。

- [ ] **Step 2: 提交**

```bash
git add src/views/agents/Index.vue
git commit -m "feat: add agent management page with card layout"
```

---

## Phase 2: P2 聊天与首页

### Task 10: Chat Store + SSE Composable

**Files:**
- Create: `src/stores/chat.ts`
- Create: `src/composables/useSSE.ts`

- [ ] **Step 1: 创建 chat store**

```typescript
/* src/stores/chat.ts */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getConversations,
  getMessages,
  createConversation,
  deleteConversation,
} from '@/api/chat'
import type { ConversationVO, MessageVO } from '@/types'

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<ConversationVO[]>([])
  const currentMessages = ref<MessageVO[]>([])
  const loading = ref(false)

  async function fetchConversations() {
    loading.value = true
    try {
      const res = await getConversations()
      conversations.value = res.data.data
    } finally {
      loading.value = false
    }
  }

  async function fetchMessages(conversationId: number) {
    const res = await getMessages(conversationId)
    currentMessages.value = res.data.data
  }

  async function addConversation(data: { agentId: number; title?: string }) {
    const res = await createConversation(data)
    const conversation = res.data.data
    conversations.value.unshift(conversation)
    return conversation
  }

  async function removeConversation(id: number) {
    await deleteConversation(id)
    conversations.value = conversations.value.filter((c) => c.id !== id)
  }

  function addMessage(message: MessageVO) {
    currentMessages.value.push(message)
  }

  function updateLastAssistantMessage(content: string) {
    const lastMsg = currentMessages.value[currentMessages.value.length - 1]
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.content = content
    }
  }

  return {
    conversations,
    currentMessages,
    loading,
    fetchConversations,
    fetchMessages,
    addConversation,
    removeConversation,
    addMessage,
    updateLastAssistantMessage,
  }
})
```

- [ ] **Step 2: 创建 SSE composable**

```typescript
/* src/composables/useSSE.ts */
import { ref } from 'vue'

/**
 * SSE 流式请求封装，用于对话消息发送
 * @param url - 请求 URL
 * @param body - 请求体
 * @param onChunk - 每次接收到数据块时的回调
 * @returns 控制对象，包含 abort 方法和 streaming 状态
 */
export function useSSE() {
  const streaming = ref(false)
  let abortController: AbortController | null = null

  async function send(
    url: string,
    body: Record<string, unknown>,
    onChunk: (text: string) => void,
    onDone?: () => void,
    onError?: (error: Error) => void,
  ) {
    abortController = new AbortController()
    streaming.value = true

    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        onChunk(fullText)
      }

      onDone?.()
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        onError?.(error as Error)
      }
    } finally {
      streaming.value = false
      abortController = null
    }
  }

  function abort() {
    abortController?.abort()
    streaming.value = false
  }

  return { streaming, send, abort }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/stores/chat.ts src/composables/useSSE.ts
git commit -m "feat: add chat store and SSE composable"
```

---

### Task 11: 聊天 UI 组件

**Files:**
- Create: `src/components/chat/MessageBubble.vue`
- Create: `src/components/chat/ChatInput.vue`

- [ ] **Step 1: 创建消息气泡组件**

```vue
<!-- src/components/chat/MessageBubble.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { MessageVO } from '@/types'

const props = defineProps<{ message: MessageVO; streaming?: boolean }>()

const isUser = computed(() => props.message.role === 'user')
</script>

<template>
  <div class="message" :class="{ 'message--user': isUser, 'message--assistant': !isUser }">
    <div class="message-avatar">
      <div v-if="isUser" class="avatar avatar--user">U</div>
      <div v-else class="avatar avatar--assistant">AI</div>
    </div>
    <div class="message-content">
      <div class="message-bubble">
        {{ message.content }}
        <span v-if="streaming" class="cursor">|</span>
      </div>
      <div class="message-time">{{ message.createdAt }}</div>
    </div>
  </div>
</template>

<style scoped>
.message {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  max-width: 80%;
}

.message--user {
  flex-direction: row-reverse;
  margin-left: auto;
}

.message--assistant {
  margin-right: auto;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.avatar--user {
  background: var(--color-primary);
  color: #fff;
}

.avatar--assistant {
  background: var(--color-sidebar);
  color: #fff;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: var(--radius-base);
  line-height: 1.6;
  font-size: 14px;
  word-break: break-word;
  white-space: pre-wrap;
}

.message--user .message-bubble {
  background: var(--color-primary);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message--assistant .message-bubble {
  background: var(--color-bg-card);
  color: var(--color-text);
  border-bottom-left-radius: 4px;
  box-shadow: var(--shadow-sm);
}

.message-time {
  font-size: 12px;
  color: var(--color-text-light);
  margin-top: 4px;
}

.message--user .message-time {
  text-align: right;
}

.cursor {
  animation: blink 1s step-end infinite;
  font-weight: 100;
}

@keyframes blink {
  50% { opacity: 0; }
}
</style>
```

- [ ] **Step 2: 创建聊天输入框组件**

```vue
<!-- src/components/chat/ChatInput.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ send: [content: string] }>()

const input = ref('')

function handleSubmit() {
  const text = input.value.trim()
  if (!text || props.disabled) return
  emit('send', text)
  input.value = ''
}
</script>

<template>
  <div class="chat-input">
    <el-input
      v-model="input"
      type="textarea"
      :rows="2"
      :disabled="disabled"
      placeholder="输入消息..."
      resize="none"
      @keydown.enter.exact.prevent="handleSubmit"
    />
    <el-button
      type="primary"
      :disabled="disabled || !input.trim()"
      @click="handleSubmit"
      class="send-btn"
    >
      发送
    </el-button>
  </div>
</template>

<style scoped>
.chat-input {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  padding: 16px 20px;
  background: var(--color-bg-card);
  border-top: 1px solid var(--color-border);
  border-radius: 0 0 var(--radius-base) var(--radius-base);
}

.chat-input :deep(.el-textarea__inner) {
  border-radius: var(--radius-btn);
  font-size: 14px;
}

.send-btn {
  flex-shrink: 0;
  height: 40px;
  border-radius: var(--radius-btn);
}

.send-btn:disabled {
  opacity: 0.5;
}
</style>
```

- [ ] **Step 3: 提交**

```bash
git add src/components/chat/
git commit -m "feat: add chat message bubble and input components"
```

---

### Task 12: 仪表盘页面

**Files:**
- Create: `src/views/Dashboard.vue`

- [ ] **Step 1: 创建仪表盘页面**

欢迎区 + 3 张快捷操作卡片 + 最近对话列表。调用 `useChatStore().fetchConversations()` 和 `getAgentList()` 展示数据。快捷卡片点击跳转到对应路由。最近对话展示最近 5 条，可点击继续对话。

- [ ] **Step 2: 提交**

```bash
git add src/views/Dashboard.vue
git commit -m "feat: add dashboard page with quick actions and recent conversations"
```

---

### Task 13: 对话列表页面

**Files:**
- Create: `src/views/chat/List.vue`

- [ ] **Step 1: 创建对话列表页面**

卡片网格布局展示对话列表。每张卡片：对话标题、Agent ID、创建时间。新建对话 dialog（选择 Agent 下拉 + 标题输入）。删除确认。调用 `useChatStore` 和 `getAgentList`。

- [ ] **Step 2: 提交**

```bash
git add src/views/chat/List.vue
git commit -m "feat: add conversation list page"
```

---

### Task 14: 聊天详情页面

**Files:**
- Create: `src/views/chat/Detail.vue`

- [ ] **Step 1: 创建聊天详情页面**

全屏聊天界面。顶部显示对话标题和返回按钮。中间区域渲染消息列表（使用 `MessageBubble` 组件，支持滚动到底部）。底部 `ChatInput` 组件。发送消息时：
1. 将用户消息 push 到 `currentMessages`
2. 创建空的 assistant 消息 push 到 `currentMessages`
3. 调用 `useSSE().send()` 流式接收，通过 `updateLastAssistantMessage` 实时更新内容
4. 完成后停止光标闪烁

调用 `useChatStore().fetchMessages(route.params.id)` 加载历史。

- [ ] **Step 2: 提交**

```bash
git add src/views/chat/Detail.vue
git commit -m "feat: add chat detail page with SSE streaming"
```

---

## Phase 3: P3 Mock 页面

### Task 15: 创作工坊页面

**Files:**
- Create: `src/views/workshop/Index.vue`

- [ ] **Step 1: 创建创作工坊页面**

5 步向导页面，使用 `el-steps` + 内容区：
1. 故事梗概输入（textarea + AI 扩展按钮）
2. 剧情扩展预览（Markdown 渲染 + 编辑）
3. 分镜生成（卡片列表展示镜头）
4. 角色设计（角色卡片展示）
5. 视频生成（视频预览卡片）

每步使用 Mock 数据，预留 API 对接接口。步骤之间通过上一步/下一步按钮切换，每步有重新生成按钮。

- [ ] **Step 2: 提交**

```bash
git add src/views/workshop/Index.vue
git commit -m "feat: add workshop page with 5-step wizard (mock data)"
```

---

### Task 16: 素材库页面

**Files:**
- Modify: `src/views/assets/Index.vue`

- [ ] **Step 1: 重写素材库页面**

网格展示素材卡片（图片/视频），支持类型筛选（全部/图片/视频），Mock 数据展示。每张卡片显示缩略图、名称、类型标签、创建时间。

- [ ] **Step 2: 提交**

```bash
git add src/views/assets/Index.vue
git commit -m "feat: add assets library page with mock data"
```

---

## Phase 4: 清理

### Task 17: 删除旧文件 + 验证

**Files:**
- Delete: `src/views/Home.vue` (已被 Dashboard.vue 替代)
- Delete: `src/views/project/Create.vue` (已废弃)
- Delete: `src/views/project/Workshop.vue` (已迁移到 workshop/Index.vue)
- Keep: `src/layouts/DefaultLayout.vue` (可选保留)

- [ ] **Step 1: 删除废弃页面，运行类型检查**

```bash
rm src/views/Home.vue
rm -rf src/views/project/
npx vue-tsc -b
```

- [ ] **Step 2: 修复类型错误（如有）**

- [ ] **Step 3: 运行 dev server 验证所有页面可访问**

```bash
npm run dev
```

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: remove deprecated views and verify build"
```

---

## 执行注意事项

1. 每个页面都是独立的 Vue SFC，可并行开发
2. Mock 数据直接写在组件内，等后端 API 就绪后替换
3. 权限树构建函数 `buildPermissionTree` 在 `Permissions.vue` 和 `Roles.vue` 中都需要，考虑提取到 `src/utils/permission.ts`
4. SSE 接口的错误处理要区分 AbortError（用户取消）和真实错误
5. 前端分页使用 `computed` 过滤 `el-table` 的 `data` 属性
