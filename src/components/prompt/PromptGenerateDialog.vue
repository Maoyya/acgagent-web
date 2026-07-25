<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { generatePromptStream } from '@/api/prompt'
import type { PromptMode } from '@/types'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  draft: [d: { systemPrompt: string; mode: PromptMode; caps?: string[] }]
}>()

// generate 已不再返回 moderation/403-blocked（合规闸门移到保存时），故无 blocked 态
type Phase = 'input' | 'streaming' | 'error'
const phase = ref<Phase>('input')
const generating = ref(false)
const hintsText = ref('')
const mode = ref<PromptMode>('acg')
const capsText = ref('')
// 流式累计的草稿文本，live-update 给用户看
const draftSystemPrompt = ref('')
const errorMsg = ref('')

const userHints = computed(() =>
  hintsText.value.split('\n').map((s) => s.trim()).filter(Boolean),
)
const caps = computed(() =>
  capsText.value.split(',').map((s) => s.trim()).filter(Boolean),
)

async function handleGenerate() {
  if (!userHints.value.length) {
    ElMessage.warning('请至少输入一条要求')
    return
  }
  generating.value = true
  draftSystemPrompt.value = ''
  errorMsg.value = ''
  phase.value = 'streaming'
  try {
    await generatePromptStream(
      {
        userHints: userHints.value,
        mode: mode.value,
        targetCapabilities: caps.value.length ? caps.value : undefined,
      },
      (e) => {
        if (e.type === 'content' && e.content) {
          // 增量 token 累加，实时渲染
          draftSystemPrompt.value += e.content
        } else if (e.type === 'done') {
          // 流结束：把累计草稿发给父组件（父组件打开编辑抽屉去保存）
          emit('draft', {
            systemPrompt: draftSystemPrompt.value,
            mode: mode.value,
            caps: caps.value.length ? caps.value : undefined,
          })
          emit('update:modelValue', false)
          reset()
        } else if (e.type === 'error') {
          errorMsg.value = e.message || '生成失败'
          phase.value = 'error'
        }
      },
    )
  } catch (err) {
    errorMsg.value = (err as Error).message || '生成失败'
    phase.value = 'error'
  } finally {
    generating.value = false
  }
}

function reset() {
  phase.value = 'input'
  hintsText.value = ''
  capsText.value = ''
  draftSystemPrompt.value = ''
  errorMsg.value = ''
}

function retry() {
  phase.value = 'input'
  errorMsg.value = ''
}

// 测试钩子（defineExpose 不影响生产）
defineExpose({
  phase,
  draftSystemPrompt,
  errorMsg,
  fillInput: (text: string) => { hintsText.value = text },
  runGenerate: handleGenerate,
  reset,
})
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="生成系统提示词"
    width="640px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @close="reset"
  >
    <!-- 输入态 -->
    <template v-if="phase === 'input'">
      <el-form label-position="top">
        <el-form-item label="要求（每行一条）">
          <el-input
            v-model="hintsText"
            type="textarea"
            :rows="5"
            placeholder="要一个毒舌但专业的客服&#10;回答偏简洁"
          />
        </el-form-item>
        <el-form-item label="能力标签（可选，逗号分隔）">
          <el-input v-model="capsText" placeholder="chat,rag" />
        </el-form-item>
      </el-form>
    </template>

    <!-- 流式生成中：实时显示累计草稿 -->
    <template v-else-if="phase === 'streaming'">
      <el-input
        v-model="draftSystemPrompt"
        type="textarea"
        :rows="12"
        readonly
        resize="none"
        placeholder="正在生成..."
      />
    </template>

    <!-- 错误态 -->
    <template v-else>
      <el-alert :title="errorMsg" type="error" :closable="false" show-icon />
    </template>

    <template #footer>
      <template v-if="phase === 'input'">
        <el-button @click="emit('update:modelValue', false)">取消</el-button>
        <el-button type="primary" :loading="generating" @click="handleGenerate">生成</el-button>
      </template>
      <template v-else-if="phase === 'streaming'">
        <el-button :loading="generating" disabled>生成中...</el-button>
      </template>
      <template v-else>
        <el-button type="primary" @click="retry">修改要求重试</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<style scoped>
</style>
