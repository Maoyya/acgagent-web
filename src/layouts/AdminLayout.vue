<script setup lang="ts">
import { ref, computed, onMounted, type Component } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ChatBubble from '@/components/ChatBubble.vue'
import ChatPanel from '@/components/ChatPanel.vue'
import {
  Odometer,
  Monitor,
  Film,
  FolderOpened,
  Setting,
  User,
  Lock,
  Key,
  UserFilled,
  ChatLineSquare,
} from '@element-plus/icons-vue'

interface MenuItem {
  index: string
  title: string
  icon: Component
  roles?: string[]
  children?: MenuItem[]
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const sidebarCollapsed = ref(false)
const showChatPanel = ref(false)

const activeMenu = computed(() => route.path)

/** 用户显示名：取昵称或用户名的首字符，大写 */
const userDisplayName = computed(() => {
  const name = authStore.userInfo?.nickname || authStore.userInfo?.username || ''
  return name.charAt(0).toUpperCase()
})

/** 用户头像 URL，无头像时返回空字符串 */
const userAvatarUrl = computed(() => authStore.userInfo?.avatar || '')

/** 全部菜单项定义，roles 为空表示所有登录用户可见 */
const allMenuItems: MenuItem[] = [
  { index: '/dashboard', title: '概览', icon: Odometer },
  { index: '/agents', title: 'Agent管理', icon: Monitor, roles: ['admin'] },
  { index: '/prompts', title: '提示词模板', icon: ChatLineSquare },
  { index: '/workshop/new', title: '创作工坊', icon: Film },
  { index: '/assets', title: '素材库', icon: FolderOpened },
  {
    index: 'system', title: '系统管理', icon: Setting, roles: ['admin'],
    children: [
      { index: '/system/users', title: '用户管理', icon: User },
      { index: '/system/roles', title: '角色管理', icon: Lock },
      { index: '/system/permissions', title: '权限管理', icon: Key },
    ],
  },
  { index: '/profile', title: '个人中心', icon: UserFilled },
]

/** 根据当前用户角色过滤可见菜单项 */
const visibleMenuItems = computed(() => {
  const userRoles = authStore.userInfo?.roles || []
  return allMenuItems.filter(item => {
    if (!item.roles) return true
    return item.roles.some(r => userRoles.includes(r))
  })
})

/** 下拉菜单命令处理：退出登录或跳转个人中心 */
function handleCommand(command: string) {
  if (command === 'logout') {
    authStore.logout()
  } else if (command === 'profile') {
    router.push('/profile')
  }
}

/** 登录后若未拉取用户信息则自动获取 */
onMounted(() => {
  if (authStore.isLoggedIn && !authStore.userInfo) {
    authStore.fetchUserInfo()
  }
})
</script>

<template>
  <el-container class="admin-layout">
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
        <template v-for="item in visibleMenuItems" :key="item.index">
          <!-- 有子菜单的项渲染为 el-sub-menu -->
          <el-sub-menu v-if="item.children" :index="item.index">
            <template #title>
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </template>
            <el-menu-item
              v-for="child in item.children"
              :key="child.index"
              :index="child.index"
            >
              <el-icon><component :is="child.icon" /></el-icon>
              <template #title>{{ child.title }}</template>
            </el-menu-item>
          </el-sub-menu>
          <!-- 无子菜单的项渲染为 el-menu-item -->
          <el-menu-item v-else :index="item.index">
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <el-container>
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
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar v-if="userAvatarUrl" :size="32" :src="userAvatarUrl" />
              <el-avatar v-else :size="32" class="user-avatar">{{ userDisplayName }}</el-avatar>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>

    <!-- 悬浮对话气泡与面板 -->
    <ChatBubble v-model:showPanel="showChatPanel" />
    <ChatPanel v-model:visible="showChatPanel" />
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
