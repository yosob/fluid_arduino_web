<template>
  <div class="device-control-page">
    <!-- 串口选择器 -->
    <div class="page-header">
      <SerialPortSelector />
    </div>

    <!-- 三栏布局 -->
    <el-row :gutter="20">
      <!-- 左侧：通道控制 -->
      <el-col :span="8">
        <div class="left-panel">
          <!-- 设备状态 -->
          <StatusIndicator />

          <!-- 通道 1 -->
          <ChannelPanel
            channel="ch1"
            title="通道 1"
          />

          <!-- 通道 2 -->
          <ChannelPanel
            channel="ch2"
            title="通道 2"
          />

          <!-- 紧急控制 -->
          <EmergencyStop />
        </div>
      </el-col>

      <!-- 中间：循环模式 -->
      <el-col :span="8">
        <div class="center-panel">
          <LoopManager />
        </div>
      </el-col>

      <!-- 右侧：通信日志 -->
      <el-col :span="8">
        <div class="right-panel">
          <LogViewer />
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import SerialPortSelector from '@/components/device/SerialPortSelector.vue'
import StatusIndicator from '@/components/device/StatusIndicator.vue'
import ChannelPanel from '@/components/device/ChannelPanel.vue'
import LoopManager from '@/components/device/LoopManager.vue'
import EmergencyStop from '@/components/device/EmergencyStop.vue'
import LogViewer from '@/components/device/LogViewer.vue'
</script>

<style scoped>
.device-control-page {
  width: 100%;
}

.page-header {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
}

.left-panel,
.center-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
