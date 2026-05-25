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
      maxlength="32000"
      show-word-limit
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
</style>
