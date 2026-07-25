<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { createTemplate, updateTemplate, beautifyPrompt, moderatePrompt, estimatePrompt } from '@/api/prompt'
import { useAuthStore } from '@/stores/auth'
import type { PromptTemplateVO, PromptMode, ModerationVerdictVO, CostEstimateVO } from '@/types'
import AgentSelectDialog from './AgentSelectDialog.vue'

const props = defineProps<{
  modelValue: boolean
  template: PromptTemplateVO | null
  seed: { systemPrompt: string; mode: PromptMode; caps?: string[] } | null
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

const formRef = ref<FormInstance>()
const form = ref({
  name: '',
  systemPrompt: '',
  mode: 'acg' as PromptMode,
  targetCapabilities: '',
  status: true,
  isPublic: false,
})
const saving = ref(false)
const beautifyVisible = ref(false)
const gateVerdict = ref<ModerationVerdictVO | null>(null)
const moderateResult = ref<ModerationVerdictVO | null>(null)
const estimateResult = ref<CostEstimateVO | null>(null)

const formRules = computed<FormRules>(() => ({
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { max: 128, message: '名称不超过 128 字', trigger: 'blur' },
  ],
  systemPrompt: [{ required: true, message: '请输入系统提示词', trigger: 'blur' }],
}))

const isEdit = computed(() => !!props.template)

/** 初始化：编辑→填 VO；seed→填草稿；空→默认 */
function syncForm() {
  gateVerdict.value = null
  moderateResult.value = null
  estimateResult.value = null
  if (props.template) {
    form.value = {
      name: props.template.name,
      systemPrompt: props.template.systemPrompt,
      mode: props.template.mode,
      targetCapabilities: props.template.targetCapabilities?.join(',') ?? '',
      status: props.template.status === 1,
      isPublic: props.template.userId === null,
    }
  } else if (props.seed) {
    form.value = {
      name: '',
      systemPrompt: props.seed.systemPrompt,
      mode: props.seed.mode,
      targetCapabilities: props.seed.caps?.join(',') ?? '',
      status: true,
      isPublic: false,
    }
  } else {
    form.value = { name: '', systemPrompt: '', mode: 'acg', targetCapabilities: '', status: true, isPublic: false }
  }
}
watch(() => [props.template, props.seed], syncForm, { immediate: true })

async function handleSave() {
  // jsdom 下 form-item 注册可能滞后一帧，等一拍再校验
  await nextTick()
  // validate 可能 reject，吞掉以保证不误拦
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  gateVerdict.value = null
  try {
    const caps = form.value.targetCapabilities
      .split(',').map((s) => s.trim()).filter(Boolean)
    const body = {
      name: form.value.name,
      systemPrompt: form.value.systemPrompt,
      mode: form.value.mode,
      targetCapabilities: caps.length ? caps : undefined,
      status: form.value.status ? 1 : 0,
      isPublic: isAdmin.value ? form.value.isPublic : undefined,
    }
    const res = isEdit.value
      ? await updateTemplate(props.template!.id, body)
      : await createTemplate(body)
    const env = res.data
    if (env.code === 200) {
      ElMessage.success(isEdit.value ? '更新成功' : '保存成功')
      emit('saved')
      emit('update:modelValue', false)
    } else if (env.code === 403) {
      // 信封单返回类型无法表达 403 variant；此分支 data 实为 ModerationVerdictVO
      gateVerdict.value = env.data as unknown as ModerationVerdictVO
    } else {
      ElMessage.error(env.message || '保存失败')
    }
  } finally {
    saving.value = false
  }
}

async function applyBeautify(agentId: number) {
  beautifyVisible.value = false
  try {
    const res = await beautifyPrompt({ systemPrompt: form.value.systemPrompt, agentId, mode: form.value.mode })
    form.value.systemPrompt = res.data.data.systemPrompt
    gateVerdict.value = null
    ElMessage.success('美化完成')
  } catch {
    // 拦截器已弹 toast
  }
}

async function runModerate() {
  try {
    moderateResult.value = (await moderatePrompt({ systemPrompt: form.value.systemPrompt, mode: form.value.mode })).data.data
  } catch { /* 拦截器已弹 */ }
}

async function runEstimate() {
  try {
    estimateResult.value = (await estimatePrompt({ systemPrompt: form.value.systemPrompt })).data.data
  } catch { /* 拦截器已弹 */ }
}

defineExpose({
  form,
  gateVerdict,
  setName: (n: string) => { form.value.name = n },
  runSave: handleSave,
  applyBeautify,
})
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    :title="isEdit ? '编辑模板' : '编辑提示词'"
    size="520px"
    direction="rtl"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-position="top">
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="模板名称" maxlength="128" show-word-limit />
      </el-form-item>
      <el-form-item label="系统提示词" prop="systemPrompt">
        <el-input v-model="form.systemPrompt" type="textarea" :rows="10" placeholder="系统提示词正文" />
      </el-form-item>
      <el-form-item label="能力标签（可选，逗号分隔）">
        <el-input v-model="form.targetCapabilities" placeholder="chat,rag" />
      </el-form-item>
      <el-form-item label="状态">
        <el-switch v-model="form.status" active-text="启用" inactive-text="禁用" />
      </el-form-item>
      <el-form-item v-if="isAdmin" label="设为公共模板">
        <el-switch v-model="form.isPublic" active-text="公共" inactive-text="私有" />
      </el-form-item>

      <!-- 工具行 -->
      <div class="tool-row">
        <el-button size="small" @click="beautifyVisible = true">美化（选 Agent LLM）</el-button>
        <el-button size="small" @click="runModerate">复检</el-button>
        <el-button size="small" @click="runEstimate">复估</el-button>
      </div>

      <!-- 复检 / 复估结果 -->
      <el-alert
        v-if="moderateResult"
        :title="moderateResult.passed ? '复检通过' : '复检未通过'"
        :type="moderateResult.passed ? 'success' : 'warning'"
        :closable="false"
        show-icon
        style="margin-top: 12px"
      />
      <el-alert
        v-if="estimateResult"
        :title="`估算 prompt token: ${estimateResult.promptTokens}（${estimateResult.model}）`"
        type="info"
        :closable="false"
        show-icon
        style="margin-top: 8px"
      />

      <!-- 保存闸门 verdict -->
      <el-alert
        v-if="gateVerdict"
        type="error"
        :closable="false"
        show-icon
        title="提示词未通过合规校验，未保存。请修改后重试"
        style="margin-top: 12px"
      >
        <div v-if="gateVerdict" style="font-size: 13px; line-height: 1.7">
          <p>违规规则：{{ gateVerdict.violatedRules.join('；') || '—' }}</p>
          <p>原因：{{ gateVerdict.reasons.join('；') || '—' }}</p>
          <p>置信度：{{ Math.round(gateVerdict.confidence * 100) }}%</p>
        </div>
      </el-alert>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>

    <!-- v-if 懒挂载：避免 onMounted 无谓拉取 /api/agents（测试未 mock 时也不报错） -->
    <AgentSelectDialog v-if="beautifyVisible" v-model="beautifyVisible" title="选择用于美化的 Agent" @select="applyBeautify" />
  </el-drawer>
</template>

<style scoped>
.tool-row { display: flex; gap: 8px; margin: 8px 0; }
</style>
