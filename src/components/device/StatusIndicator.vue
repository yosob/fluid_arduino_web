<template>
  <div class="status-indicator">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>📊 设备状态</span>
        </div>
      </template>

      <div class="status-content">
        <div class="status-item">
          <span class="label">硬件版本:</span>
          <span class="value">{{ deviceInfo.hardwareVersion }}</span>
        </div>

        <div class="status-item">
          <span class="label">固件版本:</span>
          <span class="value">{{ deviceInfo.firmwareVersion }}</span>
        </div>

        <div class="status-item">
          <span class="label">设备名称:</span>
          <span class="value">{{ deviceInfo.name }}</span>
        </div>

        <div class="status-item">
          <span class="label">连接状态:</span>
          <el-tag :type="connected ? 'success' : 'danger'">
            {{ connected ? '已连接 ✓' : '未连接' }}
          </el-tag>
        </div>

        <div class="status-item">
          <span class="label">工作模式:</span>
          <el-tag :type="workModeInfo.type" :disabled="!connected">
            {{ workModeInfo.text }}
          </el-tag>
        </div>

        <div class="status-item">
          <span class="label">心跳状态:</span>
          <el-tag
            :type="heartbeatStatus.type"
            :disabled="!connected"
          >
            {{ heartbeatStatus.text }}
          </el-tag>
        </div>

        <div v-if="heartbeatTimeout" class="warning">
          <el-alert
            type="warning"
            :closable="false"
            show-icon
          >
            心跳超时，设备可能已断开
          </el-alert>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import { useDeviceStore } from '@/stores/device'
import { storeToRefs } from 'pinia'

const connectionStore = useConnectionStore()
const deviceStore = useDeviceStore()

const { connected, deviceInfo, heartbeatTimeout, heartbeatEnabled } = storeToRefs(connectionStore)
const { workMode } = storeToRefs(deviceStore)

// 工作模式显示信息
const workModeInfo = computed(() => {
  if (!connected.value) {
    return { type: 'info', text: '未连接' }
  }

  // 0=指令模式(MANUAL), 1=循环模式(LOOP), 2=停止模式(STOP)
  const modeMap = {
    0: { type: 'primary', text: '🎮 指令模式' },
    1: { type: 'success', text: '🔄 循环模式' },
    2: { type: 'warning', text: '⏸ 停止模式' }
  }

  return modeMap[workMode.value] || { type: 'info', text: '未知模式' }
})

const heartbeatStatus = computed(() => {
  if (!connected.value) {
    return { type: 'info', text: '未连接' }
  }
  if (heartbeatTimeout.value) {
    return { type: 'danger', text: '超时 ✗' }
  }
  if (heartbeatEnabled.value) {
    return { type: 'success', text: '正常 ✓' }
  }
  return { type: 'warning', text: '已关闭' }
})
</script>

<style scoped>
.status-indicator {
  margin-bottom: 20px;
}

.card-header {
  font-weight: bold;
  font-size: 16px;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-weight: 500;
  color: #606266;
}

.value {
  font-family: monospace;
  color: #303133;
}

.warning {
  margin-top: 10px;
}
</style>
