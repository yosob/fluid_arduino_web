<template>
  <div class="emergency-stop">
    <el-button
      type="danger"
      size="large"
      :icon="WarningFilled"
      @click="handleEmergencyStop"
    >
      🛑 紧急停止所有泵
    </el-button>
  </div>
</template>

<script setup>
import { useSerial } from '@/composables/useSerial'
import { WarningFilled } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const { stopAll } = useSerial()

async function handleEmergencyStop() {
  try {
    await ElMessageBox.confirm(
      '确定要紧急停止所有泵吗？此操作将立即停止所有通道的运行。',
      '紧急停止确认',
      {
        confirmButtonText: '确定停止',
        cancelButtonText: '取消',
        type: 'error',
        distinguishCancelAndClose: true
      }
    )

    const success = await stopAll()
    if (success) {
      ElMessage.success('紧急停止命令已发送')
    } else {
      ElMessage.error('发送紧急停止命令失败')
    }
  } catch (error) {
    // 用户取消
    console.log('取消紧急停止')
  }
}
</script>

<style scoped>
.emergency-stop {
  margin-bottom: 20px;
}

.emergency-stop :deep(.el-button) {
  width: 100%;
  height: 60px;
  font-size: 20px;
  font-weight: bold;
}
</style>
