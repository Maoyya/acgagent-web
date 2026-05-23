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
