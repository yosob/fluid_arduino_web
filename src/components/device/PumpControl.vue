<template>
  <div class="pump-control">
    <el-card
      :class="{ 'is-running': isRunning, 'is-active': isActive }"
      @click="handleClick"
    >
      <div class="pump-header">
        <div class="pump-icon">
          <span class="icon">{{ icon }}</span>
        </div>

        <div class="pump-info">
          <div class="pump-name">{{ name }}</div>
          <div class="pump-status">
            <el-tag
              v-if="isRunning"
              type="success"
              size="small"
            >
              运行中 ✓
            </el-tag>
            <el-tag
              v-else
              type="info"
              size="small"
            >
              已停止
            </el-tag>
          </div>
        </div>
      </div>

      <!-- 设置PWM条（可拖动） -->
      <div class="pump-pwm-section">
        <div class="pwm-label">设置PWM</div>
        <div class="pump-pwm">
          <el-slider
            v-model="pwmValue"
            :min="0"
            :max="255"
            size="small"
            @change="handlePwmChange"
            @click.stop
          />
          <div class="pwm-display">{{ pwmValue }}</div>
        </div>
      </div>

      <!-- 当前实际PWM条（只读） -->
      <div class="pump-pwm-section">
        <div class="pwm-label">当前PWM</div>
        <div class="pump-pwm">
          <el-slider
            v-model="actualPwmValue"
            :min="0"
            :max="255"
            :disabled="true"
            size="small"
            @click.stop
          />
          <div class="pwm-display">{{ actualPwmValue }}</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDeviceStore } from '@/stores/device'
import { useSerial } from '@/composables/useSerial'
import { storeToRefs } from 'pinia'

const props = defineProps({
  channel: {
    type: String,
    required: true
  },
  pumpType: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '💨'
  }
})

const deviceStore = useDeviceStore()
const { startPump } = useSerial()
const { workMode } = storeToRefs(deviceStore)

const channelInfo = computed(() => deviceStore.channels[props.channel])
const isRunning = computed(() => channelInfo.value.isRunning && channelInfo.value.activePump === props.pumpType + 1)
const isActive = computed(() => channelInfo.value.activePump === props.pumpType + 1)

const pumpConfigs = computed(() => deviceStore.pumpConfigs[props.channel])
const actualPwmValues = computed(() => deviceStore.actualPwmValues[props.channel])
const pumpKey = computed(() => ['air', 'water1', 'water2'][props.pumpType])

// 设置的PWM值（用户可调整）
const pwmValue = ref(pumpConfigs.value[pumpKey.value])

// 实际的PWM值（从设备查询）
const actualPwmValue = computed(() => actualPwmValues.value[pumpKey.value])

// 监听配置变化
watch(
  () => pumpConfigs.value[pumpKey.value],
  (newValue) => {
    pwmValue.value = newValue
  }
)

async function handleClick() {
  // 检查是否在循环模式（workMode = 1）
  if (workMode.value === 1) {
    ElMessage.warning({
      message: '循环模式中不能手动控制',
      duration: 2000,
      offset: 100
    })
    return
  }

  if (isRunning.value) {
    // 如果正在运行，点击则停止
    // 注意：这里使用 stopChannel，需要传递通道号
    const channelNum = props.channel === 'ch1' ? 1 : 2
    await useSerial().stopChannel(channelNum)
  } else {
    // 如果未运行，点击则启动
    const channelNum = props.channel === 'ch1' ? 1 : 2
    await startPump(channelNum, props.pumpType, pwmValue.value)
  }
}

async function handlePwmChange(value) {
  // 检查是否在循环模式
  if (workMode.value === 1) {
    ElMessage.warning({
      message: '循环模式中不能手动控制',
      duration: 2000,
      offset: 100
    })
    return
  }

  // 更新配置
  deviceStore.updatePumpConfig(props.channel, props.pumpType, value)

  // 如果正在运行，实时更新 PWM
  if (isRunning.value) {
    const channelNum = props.channel === 'ch1' ? 1 : 2
    await startPump(channelNum, props.pumpType, value)
  }
}
</script>

<style scoped>
.pump-control {
  margin-bottom: 12px;
}

.pump-control :deep(.el-card) {
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.pump-control :deep(.el-card:hover) {
  border-color: #409eff;
  box-shadow: 0 2px 12px 0 rgba(64, 158, 255, 0.3);
}

.pump-control.is-running :deep(.el-card) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.pump-control.is-running :deep(.el-tag) {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.pump-control.is-active :deep(.el-card) {
  border-color: #67c23a;
}

.pump-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.pump-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.pump-info {
  flex: 1;
  min-width: 0;
}

.pump-name {
  font-weight: bold;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pump-pwm-section {
  margin-top: 8px;
}

.pwm-label {
  font-size: 11px;
  color: #909399;
  margin-bottom: 4px;
  font-weight: 500;
}

.pump-control.is-running .pwm-label {
  color: rgba(255, 255, 255, 0.8);
}

.pump-pwm {
  margin-top: 4px;
}

.pwm-display {
  text-align: center;
  font-size: 12px;
  margin-top: 4px;
  font-family: monospace;
  font-weight: bold;
}

/* 滑块样式优化 */
.pump-pwm :deep(.el-slider__runway) {
  height: 3px;
}

.pump-pwm :deep(.el-slider__button) {
  width: 10px;
  height: 10px;
}

/* 禁用状态的滑块样式 */
.pump-pwm :deep(.el-slider.is-disabled .el-slider__button) {
  background-color: #67c23a;
  border: 2px solid #67c23a;
}

.pump-pwm :deep(.el-slider.is-disabled .el-slider__runway) {
  background-color: #e1f3d8;
}
</style>
