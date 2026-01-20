<template>
  <el-dialog
    v-model="dialogVisible"
    title="编辑时间段"
    width="500px"
    :before-close="handleClose"
  >
    <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
      <!-- 开始时间 -->
      <el-form-item label="开始时间" prop="start">
        <el-input-number
          v-model="formData.start"
          :min="0"
          :max="maxDuration"
          :step="0.1"
          :precision="1"
          controls-position="right"
        />
        <span style="margin-left: 8px">秒</span>
      </el-form-item>

      <!-- 结束时间 -->
      <el-form-item label="结束时间" prop="end">
        <el-input-number
          v-model="formData.end"
          :min="0"
          :max="maxDuration"
          :step="0.1"
          :precision="1"
          controls-position="right"
        />
        <span style="margin-left: 8px">秒</span>
      </el-form-item>

      <!-- 泵类型 -->
      <el-form-item label="泵类型" prop="pump">
        <el-select v-model="formData.pump" placeholder="请选择泵类型">
          <el-option label="💨 气泵" value="air" />
          <el-option label="💧 液泵1" value="water1" />
          <el-option label="💧 液泵2" value="water2" />
          <el-option label="⏹️ 停止" value="off" />
        </el-select>
      </el-form-item>

      <!-- PWM 值 -->
      <el-form-item
        v-if="formData.pump !== 'off'"
        label="PWM 值"
        prop="pwm"
      >
        <el-input-number
          v-model="formData.pwm"
          :min="0"
          :max="255"
          :step="1"
          controls-position="right"
        />
        <span style="margin-left: 8px">0-255</span>
      </el-form-item>

      <!-- 时长信息 -->
      <el-form-item label="时长">
        <span>{{ duration }} 秒</span>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleDelete" type="danger" :icon="Delete">
          删除
        </el-button>
        <el-button @click="handleCopy" :icon="CopyDocument">
          复制
        </el-button>
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSave" :icon="Check">
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, CopyDocument, Check } from '@element-plus/icons-vue'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  segment: {
    type: Object,
    default: () => null
  },
  maxDuration: {
    type: Number,
    default: 60
  }
})

// Emits
const emit = defineEmits(['update:visible', 'save', 'delete', 'copy'])

// Refs
const formRef = ref(null)
const dialogVisible = ref(false)

// Form data
const formData = reactive({
  start: 0,
  end: 1,
  pump: 'air',
  pwm: 200
})

// 表单验证规则
const rules = {
  start: [
    { required: true, message: '请输入开始时间', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value < 0) {
          callback(new Error('开始时间不能小于0'))
        } else if (value >= formData.end) {
          callback(new Error('开始时间必须小于结束时间'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  end: [
    { required: true, message: '请输入结束时间', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value > props.maxDuration) {
          callback(new Error(`结束时间不能超过${props.maxDuration}秒`))
        } else if (value <= formData.start) {
          callback(new Error('结束时间必须大于开始时间'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  pump: [
    { required: true, message: '请选择泵类型', trigger: 'change' }
  ],
  pwm: [
    { required: true, message: '请输入PWM值', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value < 0 || value > 255) {
          callback(new Error('PWM值必须在0-255之间'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 计算时长
const duration = computed(() => {
  return (formData.end - formData.start).toFixed(1)
})

// 监听 visible 变化
watch(() => props.visible, (newVal) => {
  dialogVisible.value = newVal
  if (newVal && props.segment) {
    // 如果有传入时间段数据，填充表单（转换 store 格式 → 显示格式）
    formData.start = props.segment.startTime || props.segment.start || 0
    formData.end = props.segment.endTime || props.segment.end || 1
    formData.pump = pumpTypeToPump(props.segment.pumpType || props.segment.pump)
    formData.pwm = props.segment.pwm || 200
  } else if (newVal) {
    // 否则使用默认值
    resetForm()
  }
})

// 监听 dialogVisible 变化
watch(dialogVisible, (newVal) => {
  emit('update:visible', newVal)
})

// 重置表单
function resetForm() {
  formData.start = 0
  formData.end = 1
  formData.pump = 'air'
  formData.pwm = 200
  formRef.value?.clearValidate()
}

// 关闭对话框
function handleClose() {
  dialogVisible.value = false
  resetForm()
}

// 泵类型映射：pumpType (number) → pump (string)
const pumpTypeToPump = (pumpType) => {
  const mapping = {
    0: 'air',
    1: 'water1',
    2: 'water2',
    255: 'off'
  }
  return mapping[pumpType] || 'off'
}

// 泵类型映射：pump (string) → pumpType (number)
const pumpToPumpType = (pump) => {
  const mapping = {
    'air': 0,
    'water1': 1,
    'water2': 2,
    'off': 255
  }
  return mapping[pump] ?? 255
}

// 保存
function handleSave() {
  formRef.value?.validate((valid) => {
    if (valid) {
      emit('save', {
        id: props.segment?.id || Date.now(),
        startTime: formData.start,    // ← 转换为 store 格式
        endTime: formData.end,        // ← 转换为 store 格式
        pumpType: pumpToPumpType(formData.pump),  // ← 转换为 store 格式
        pwm: formData.pwm
      })
      dialogVisible.value = false
      ElMessage.success('保存成功')
    } else {
      ElMessage.error('请检查表单输入')
      return false
    }
  })
}

// 删除
function handleDelete() {
  emit('delete', props.segment?.id)
  dialogVisible.value = false
  ElMessage.success('删除成功')
}

// 复制
function handleCopy() {
  emit('copy', {
    ...props.segment,
    id: Date.now(),
    startTime: formData.end,    // ← 转换为 store 格式
    endTime: formData.end + (formData.end - formData.start)  // ← 转换为 store 格式
  })
  dialogVisible.value = false
  ElMessage.success('复制成功')
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-input-number) {
  width: 200px;
}
</style>
