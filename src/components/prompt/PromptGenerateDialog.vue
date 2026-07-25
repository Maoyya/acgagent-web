<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { generatePrompt } from '@/api/prompt'
import type { PromptMode, ModerationVerdictVO } from '@/types'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  draft: [d: { systemPrompt: string; mode: PromptMode; caps?: string[] }]
}>()

type Phase = 'input' | 'blocked'
const phase = ref<Phase>('input')
const generating = ref(false)
const hintsText = ref('')
const mode = ref<PromptMode>('acg')
const capsText = ref('')
const blocked = ref<ModerationVerdictVO | null>(null)

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
  blocked.value = null
  try {
    const res = await generatePrompt({
      userHints: userHints.value,
      mode: mode.value,
      targetCapabilities: caps.value.length ? caps.value : undefined,
    })
    const env = res.data // skipErrorHandler 已开 → 完整信封
    if (env.code === 200) {
      const d = env.data
      emit('draft', { systemPrompt: d.systemPrompt, mode: d.mode, caps: caps.value.length ? caps.value : undefined })
      emit('update:modelValue', false)
      reset()
    } else if (env.code === 403) {
      // 后端 403 信封 data 为 ModerationVerdictVO（generatePrompt 单一返回类型无法区分 code 分支）
      blocked.value = env.data as unknown as ModerationVerdictVO
      phase.value = 'blocked'
    } else {
      ElMessage.error(env.message || '生成失败')
    }
  } finally {
    generating.value = false
  }
}

function reset() {
  phase.value = 'input'
  hintsText.value = ''
  capsText.value = ''
  blocked.value = null
}

function retry() {
  phase.value = 'input'
  blocked.value = null
}

// 测试钩子（defineExpose 不影响生产）
defineExpose({
  phase,
  blocked,
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

    <!-- 被拦截态 -->
    <template v-else>
      <el-alert title="提示词未通过合规校验" type="error" :closable="false" show-icon />
      <div v-if="blocked" class="verdict">
        <p><b>违规规则：</b>{{ blocked.violatedRules.join('；') || '—' }}</p>
        <p><b>原因：</b>{{ blocked.reasons.join('；') || '—' }}</p>
        <p><b>置信度：</b>{{ Math.round(blocked.confidence * 100) }}%</p>
      </div>
    </template>

    <template #footer>
      <template v-if="phase === 'input'">
        <el-button @click="emit('update:modelValue', false)">取消</el-button>
        <el-button type="primary" :loading="generating" @click="handleGenerate">生成</el-button>
      </template>
      <template v-else>
        <el-button type="primary" @click="retry">修改要求重试</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<style scoped>
.verdict { margin-top: 12px; font-size: 13px; line-height: 1.8; color: var(--color-text-secondary); }
</style>
