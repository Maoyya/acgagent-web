<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { FormInstance } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const pageReady = ref(false)
const form = ref({ username: '', password: '', email: '' })

onMounted(() => {
  requestAnimationFrame(() => {
    pageReady.value = true
  })
})

async function handleRegister() {
  await formRef.value?.validate()
  loading.value = true
  try {
    await authStore.register(form.value)
    router.push('/')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="stargate" :class="{ 'stargate--ready': pageReady }">
    <!-- 星空背景层 -->
    <div class="stars-layer">
      <div class="stars stars--sm"></div>
      <div class="stars stars--md"></div>
      <div class="stars stars--lg"></div>
    </div>

    <!-- 极光 -->
    <div class="aurora">
      <div class="aurora-band aurora-band--1"></div>
      <div class="aurora-band aurora-band--2"></div>
      <div class="aurora-band aurora-band--3"></div>
    </div>

    <!-- 流星 -->
    <div class="meteors">
      <div class="meteor meteor--1"></div>
      <div class="meteor meteor--2"></div>
      <div class="meteor meteor--3"></div>
    </div>

    <!-- 浮游光粒子 -->
    <div class="particles">
      <div v-for="i in 20" :key="i" class="particle" :style="{
        '--px': `${Math.random() * 100}%`,
        '--py': `${Math.random() * 100}%`,
        '--size': `${2 + Math.random() * 4}px`,
        '--duration': `${8 + Math.random() * 12}s`,
        '--delay': `${Math.random() * 8}s`,
        '--drift': `${-20 + Math.random() * 40}px`,
      }"></div>
    </div>

    <!-- 注册卡片 -->
    <div class="register-card">
      <div class="card-glow"></div>
      <div class="card-inner">
        <div class="card-accent-line"></div>

        <!-- 头部 -->
        <div class="card-header">
          <div class="logo-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 4L36 12V28L20 36L4 28V12L20 4Z" stroke="url(#reg-logo-grad)" stroke-width="1.5" fill="rgba(108,92,231,0.08)"/>
              <path d="M20 12L28 16V24L20 28L12 24V16L20 12Z" stroke="url(#reg-logo-grad)" stroke-width="1" opacity="0.5"/>
              <circle cx="20" cy="20" r="3" fill="url(#reg-logo-grad)" opacity="0.6"/>
              <defs>
                <linearGradient id="reg-logo-grad" x1="4" y1="4" x2="36" y2="36">
                  <stop stop-color="#6c5ce7"/>
                  <stop offset="1" stop-color="#a29bfe"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 class="card-title">加入创作世界</h1>
          <p class="card-subtitle">注册你的 AI 创作者身份</p>
        </div>

        <!-- 表单 -->
        <el-form
          ref="formRef"
          :model="form"
          class="register-form"
          @submit.prevent="handleRegister"
        >
          <div class="field-group">
            <label class="field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              用户名
            </label>
            <el-form-item prop="username" :rules="[{ required: true, message: '请输入用户名' }]">
              <el-input
                v-model="form.username"
                placeholder="起一个独特的名字"
                size="large"
              />
            </el-form-item>
          </div>

          <div class="field-group">
            <label class="field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              密码
            </label>
            <el-form-item prop="password" :rules="[{ required: true, message: '请输入密码' }]">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="设定你的密码"
                size="large"
                show-password
              />
            </el-form-item>
          </div>

          <div class="field-group">
            <label class="field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              邮箱
            </label>
            <el-form-item prop="email">
              <el-input
                v-model="form.email"
                placeholder="你的邮箱地址（选填）"
                size="large"
              />
            </el-form-item>
          </div>

          <el-button
            type="primary"
            :loading="loading"
            native-type="submit"
            class="submit-btn"
            size="large"
          >
            <span v-if="!loading">注 册</span>
            <span v-else>正在开启星途...</span>
          </el-button>
        </el-form>

        <!-- 底部 -->
        <div class="card-footer">
          <span class="footer-text">已有账号？</span>
          <router-link to="/login" class="footer-link">
            返回登录
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </router-link>
        </div>
      </div>
    </div>

    <!-- 底部署名 -->
    <div class="credits">
      <span>ACG Agent</span>
      <span class="credits-dot"></span>
      <span>AI Creation Workshop</span>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');

/* ===== 基础容器 ===== */
.stargate {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(170deg, #070b1a 0%, #0d1333 30%, #151a45 60%, #1a1040 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Noto Serif SC', 'PingFang SC', serif;
}

/* ===== 星空层 ===== */
.stars-layer {
  position: absolute;
  inset: 0;
}

.stars {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

.stars::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

.stars--sm::after {
  width: 1px;
  height: 1px;
  box-shadow:
    120px 40px #fff, 350px 80px #fff, 580px 30px #fff, 810px 70px #fff,
    1040px 50px #fff, 180px 180px #fff, 420px 210px #fff, 680px 170px #fff,
    930px 200px #fff, 60px 320px #fff, 310px 350px #fff, 560px 300px #fff,
    810px 340px #fff, 1060px 310px #fff, 130px 460px #fff, 380px 440px #fff,
    630px 480px #fff, 880px 450px #fff, 1130px 470px #fff, 50px 580px #fff,
    300px 560px #fff, 550px 600px #fff, 800px 570px #fff, 1050px 590px #fff,
    200px 700px #fff, 450px 680px #fff, 700px 720px #fff, 950px 690px #fff,
    250px 840px #fff, 500px 820px #fff, 750px 860px #fff, 1000px 830px #fff,
    100px 960px #fff, 350px 940px #fff, 600px 980px #fff, 850px 950px #fff,
    1100px 970px #fff, 150px 1080px #fff, 400px 1060px #fff;
  animation: twinkle-sm 4s ease-in-out infinite alternate;
}

.stars--md::after {
  width: 2px;
  height: 2px;
  box-shadow:
    200px 60px rgba(255,255,255,0.8), 500px 120px rgba(255,255,255,0.6),
    800px 90px rgba(200,180,255,0.7), 300px 260px rgba(255,220,200,0.7),
    650px 230px rgba(255,255,255,0.8), 950px 280px rgba(180,200,255,0.6),
    100px 400px rgba(255,255,255,0.7), 450px 380px rgba(255,200,220,0.6),
    750px 420px rgba(255,255,255,0.8), 1050px 390px rgba(200,200,255,0.7),
    250px 550px rgba(255,255,255,0.6), 600px 520px rgba(220,200,255,0.7),
    900px 560px rgba(255,255,255,0.8), 150px 700px rgba(255,180,200,0.6),
    500px 670px rgba(255,255,255,0.7), 850px 710px rgba(200,220,255,0.7),
    350px 850px rgba(255,255,255,0.8), 700px 830px rgba(255,200,255,0.6),
    1000px 860px rgba(255,255,255,0.7), 50px 1000px rgba(200,200,255,0.6);
  animation: twinkle-md 6s ease-in-out infinite alternate;
}

.stars--lg::after {
  width: 3px;
  height: 3px;
  box-shadow:
    400px 100px rgba(255,255,255,0.9), 900px 180px rgba(255,220,240,0.8),
    200px 450px rgba(220,200,255,0.9), 700px 500px rgba(255,255,255,0.8),
    1100px 350px rgba(255,200,220,0.8), 500px 750px rgba(255,255,255,0.9),
    100px 900px rgba(200,220,255,0.8), 850px 800px rgba(255,255,255,0.9);
  animation: twinkle-lg 8s ease-in-out infinite alternate;
}

@keyframes twinkle-sm { from { opacity: 0.4; } to { opacity: 1; } }
@keyframes twinkle-md { from { opacity: 0.5; } to { opacity: 0.9; } }
@keyframes twinkle-lg { from { opacity: 0.6; } to { opacity: 1; } }

/* ===== 极光 ===== */
.aurora {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.aurora-band {
  position: absolute;
  width: 200%;
  height: 40%;
  filter: blur(80px);
  opacity: 0.08;
}

.aurora-band--1 {
  top: -10%;
  left: -30%;
  background: linear-gradient(90deg, transparent, #6c5ce7, #a29bfe, transparent);
  animation: aurora-drift 20s ease-in-out infinite alternate;
}

.aurora-band--2 {
  top: 20%;
  right: -30%;
  background: linear-gradient(90deg, transparent, #a29bfe, #00b894, transparent);
  animation: aurora-drift 25s ease-in-out infinite alternate-reverse;
}

.aurora-band--3 {
  bottom: -5%;
  left: -20%;
  background: linear-gradient(90deg, transparent, #ff6b81, #6c5ce7, transparent);
  animation: aurora-drift 18s ease-in-out infinite alternate;
}

@keyframes aurora-drift {
  0% { transform: translateX(-10%) rotate(-5deg); }
  100% { transform: translateX(10%) rotate(5deg); }
}

/* ===== 流星 ===== */
.meteors {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.meteor {
  position: absolute;
  width: 2px;
  height: 2px;
  background: #fff;
  border-radius: 50%;
  opacity: 0;
}

.meteor::before {
  content: '';
  position: absolute;
  top: 50%;
  right: 0;
  width: 80px;
  height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.6));
  transform: translateY(-50%);
}

.meteor--1 {
  top: 15%;
  left: 70%;
  animation: meteor-fall 8s 2s ease-in infinite;
}

.meteor--2 {
  top: 5%;
  left: 40%;
  animation: meteor-fall 12s 5s ease-in infinite;
}

.meteor--3 {
  top: 25%;
  left: 85%;
  animation: meteor-fall 15s 9s ease-in infinite;
}

@keyframes meteor-fall {
  0% { opacity: 0; transform: translate(0, 0) rotate(-35deg); }
  1% { opacity: 1; }
  4% { opacity: 0; transform: translate(-300px, 200px) rotate(-35deg); }
  100% { opacity: 0; }
}

/* ===== 浮游粒子 ===== */
.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  left: var(--px);
  bottom: var(--py);
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(108,92,231,0.6), rgba(162,155,254,0.1));
  animation: particle-float var(--duration) var(--delay) ease-in-out infinite;
}

@keyframes particle-float {
  0%, 100% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  10% { opacity: 0.6; }
  50% {
    transform: translateY(-120px) translateX(var(--drift));
    opacity: 0.3;
  }
  90% { opacity: 0; }
  100% {
    transform: translateY(-240px) translateX(0);
    opacity: 0;
  }
}

/* ===== 注册卡片 ===== */
.register-card {
  position: relative;
  z-index: 10;
  width: 420px;
  max-width: 92vw;
  opacity: 0;
  transform: translateY(30px) scale(0.96);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.stargate--ready .register-card {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.card-glow {
  position: absolute;
  inset: -1px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(108,92,231,0.3), rgba(162,155,254,0.2), rgba(108,92,231,0.1));
  opacity: 0.5;
  filter: blur(1px);
  z-index: -1;
}

.card-inner {
  position: relative;
  background: rgba(15, 15, 40, 0.75);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 40px 36px 32px;
  overflow: hidden;
}

.card-accent-line {
  position: absolute;
  top: 0;
  left: 40px;
  right: 40px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #6c5ce7, #a29bfe, transparent);
  opacity: 0.8;
}

/* ===== 卡片头部 ===== */
.card-header {
  text-align: center;
  margin-bottom: 28px;
}

.logo-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 16px;
  animation: logo-breathe 4s ease-in-out infinite;
}

@keyframes logo-breathe {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(108,92,231,0.3)); }
  50% { transform: scale(1.05); filter: drop-shadow(0 0 16px rgba(108,92,231,0.5)); }
}

.card-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2px;
  margin-bottom: 6px;
  background: linear-gradient(135deg, #fff 30%, #d5ccff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.card-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 400;
  letter-spacing: 1px;
}

/* ===== 表单 ===== */
.register-form {
  margin-bottom: 8px;
}

.field-group {
  margin-bottom: 18px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.field-label svg {
  opacity: 0.6;
}

.register-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.register-form :deep(.el-form-item__error) {
  color: #a29bfe;
  padding-top: 4px;
  font-size: 12px;
}

.register-form :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  box-shadow: none;
  padding: 4px 14px;
  transition: all 0.3s ease;
}

.register-form :deep(.el-input__wrapper:hover) {
  border-color: rgba(108, 92, 231, 0.3);
  background: rgba(255, 255, 255, 0.06);
}

.register-form :deep(.el-input__wrapper.is-focus) {
  border-color: rgba(108, 92, 231, 0.5);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
}

.register-form :deep(.el-input__inner) {
  color: rgba(255, 255, 255, 0.85);
  font-family: 'DM Sans', 'PingFang SC', sans-serif;
  font-size: 14px;
}

.register-form :deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.2);
}

.register-form :deep(.el-input__password) {
  color: rgba(255, 255, 255, 0.3);
}

/* ===== 提交按钮 ===== */
.submit-btn {
  width: 100%;
  height: 46px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 4px;
  border: none;
  margin-top: 8px;
  background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
  box-shadow: 0 4px 20px rgba(108, 92, 231, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.submit-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.submit-btn:hover::before {
  transform: translateX(100%);
}

.submit-btn:hover {
  box-shadow: 0 6px 28px rgba(108, 92, 231, 0.45);
  transform: translateY(-1px);
}

.submit-btn:active {
  transform: translateY(0);
}

/* ===== 底部 ===== */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.footer-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
}

.footer-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #a29bfe;
  text-decoration: none;
  transition: all 0.2s;
}

.footer-link:hover {
  color: #6c5ce7;
  gap: 6px;
}

/* ===== 底部署名 ===== */
.credits {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.15);
  letter-spacing: 1px;
  z-index: 10;
  opacity: 0;
  transition: opacity 1s 1s ease;
}

.stargate--ready .credits {
  opacity: 1;
}

.credits-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(108, 92, 231, 0.4);
}
</style>
