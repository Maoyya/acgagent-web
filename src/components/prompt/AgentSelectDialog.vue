<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getAgentList } from '@/api/agent'
import type { AgentVO } from '@/types'

const props = defineProps<{ modelValue: boolean; title?: string }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [agentId: number]
}>()

const agents = ref<AgentVO[]>([])
const selectedAgentId = ref<number | null>(null)
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res = await getAgentList()
    agents.value = res.data.data ?? []
  } catch {
    ElMessage.error('加载 Agent 列表失败')
  } finally {
    loading.value = false
  }
})

/** 选定 agentId（供测试与确定按钮共用） */
function confirm(agentId: number | null = selectedAgentId.value) {
  if (agentId == null) {
    ElMessage.warning('请选择一个 Agent')
    return
  }
  emit('select', agentId)
  emit('update:modelValue', false)
}

defineExpose({ agents, confirm })
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title ?? '选择 Agent'"
    width="420px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-select
      v-model="selectedAgentId"
      placeholder="选择 Agent"
      :loading="loading"
      filterable
      style="width: 100%"
    >
      <el-option
        v-for="a in agents"
        :key="a.id"
        :label="a.name"
        :value="a.id"
      />
    </el-select>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirm()">确定</el-button>
    </template>
  </el-dialog>
</template>
