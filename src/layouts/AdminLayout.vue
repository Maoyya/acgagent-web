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
          <el-dropdown @command="handleLogout">
            <span class="user-info">
              <el-avatar :size="32" class="user-avatar">U</el-avatar>
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
