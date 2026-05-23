<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

function handleLogout() {
  authStore.logout()
}
</script>

<template>
  <el-container class="layout">
    <el-header class="header">
      <div class="logo" @click="router.push('/')">ACG Agent</div>
      <div class="nav">
        <el-menu mode="horizontal" :ellipsis="false" router>
          <el-menu-item index="/">项目</el-menu-item>
          <el-menu-item index="/assets">素材库</el-menu-item>
        </el-menu>
      </div>
      <div class="actions">
        <el-button text @click="handleLogout">退出</el-button>
      </div>
    </el-header>
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>

<style scoped>
.layout {
  min-height: 100vh;
}
.header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color-light);
}
.logo {
  font-weight: 700;
  font-size: 18px;
  cursor: pointer;
  margin-right: 24px;
}
.nav {
  flex: 1;
}
</style>
