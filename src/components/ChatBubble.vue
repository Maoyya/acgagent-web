<script setup lang="ts">
/**
 * 悬浮蓝色地球球体按钮，点击切换对话面板的显示状态。
 * 包含呼吸动画（box-shadow + scale）和地球纹理旋转动画。
 */
defineProps<{ showPanel: boolean }>()
const emit = defineEmits<{ 'update:showPanel': [value: boolean] }>()

/** 点击切换面板可见性 */
function togglePanel() {
  emit('update:showPanel', true)
}
</script>

<template>
  <Transition name="bubble-fade">
    <div
      v-show="!showPanel"
      class="chat-bubble"
      @click="togglePanel"
    >
      <div class="bubble-earth" />
    </div>
  </Transition>
</template>

<style scoped>
.chat-bubble {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  z-index: 9999;
  cursor: pointer;
  /* 蓝色球体 3D 高光 */
  background: radial-gradient(circle at 30% 30%, #4fc3f7, #0288d1, #01579b);
  animation: breathe 3s ease-in-out infinite;
  transition: box-shadow 0.3s;
  overflow: hidden;
}

.chat-bubble:hover {
  box-shadow: 0 0 50px rgba(2, 136, 209, 0.9);
}

/* 地球纹理叠加层，独立旋转 */
.bubble-earth {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent,
    rgba(255, 255, 255, 0.1)
  );
  animation: earthRotate 8s linear infinite;
  pointer-events: none;
}

@keyframes breathe {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(2, 136, 209, 0.4);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 40px rgba(2, 136, 209, 0.8);
    transform: scale(1.05);
  }
}

@keyframes earthRotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 面板打开时球体淡出 */
.bubble-fade-leave-active {
  transition: opacity 0.25s ease;
}

.bubble-fade-leave-to {
  opacity: 0;
}

.bubble-fade-enter-active {
  transition: opacity 0.25s ease;
}

.bubble-fade-enter-from {
  opacity: 0;
}
</style>
