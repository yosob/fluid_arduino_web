<template>
  <div class="app">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1 class="title">液动控制系统 v1.5</h1>
        </div>
      </el-header>

      <el-main>
        <div class="main-content">
          <!-- 选项卡 -->
          <el-tabs v-model="activeTab" type="border-card" class="page-tabs">
            <!-- 设备控制页面 -->
            <el-tab-pane label="设备控制" name="device">
              <DeviceControlPage />
            </el-tab-pane>

            <!-- 固件升级页面 -->
            <el-tab-pane name="firmware">
              <template #label>
                <span>💾 固件升级</span>
              </template>
              <FirmwareUpdateSimple />
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-main>

      <el-footer>
        <div class="footer-content">
          <span>液动工具包项目组 © 2025</span>
          <span class="version">Web 上位机 v1.5</span>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useHeartbeat } from '@/composables/useHeartbeat'
import { useConnectionStore } from '@/stores/connection'
import { storeToRefs } from 'pinia'
import DeviceControlPage from '@/components/DeviceControlPage.vue'
import FirmwareUpdateSimple from '@/components/FirmwareUpdateSimple.vue'

const activeTab = ref('device')
const { start: startHeartbeat, stop: stopHeartbeat } = useHeartbeat()
const connectionStore = useConnectionStore()
const { connected } = storeToRefs(connectionStore)

// 监听连接状态，自动启动/停止心跳
function handleConnectionChange(isConnected) {
  if (isConnected) {
    startHeartbeat()
  } else {
    stopHeartbeat()
  }
}

onMounted(() => {
  // 监听连接状态变化
  connectionStore.$subscribe((mutation, state) => {
    if (mutation.events.key === 'connected') {
      handleConnectionChange(state.connected)
    }
  })
})

onUnmounted(() => {
  stopHeartbeat()
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.el-container {
  min-height: 100vh;
}

.el-header {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.title {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.el-main {
  padding: 20px;
}

.main-content {
  max-width: 1600px;
  margin: 0 auto;
}

.page-tabs {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.el-footer {
  background: rgba(255, 255, 255, 0.95);
  text-align: center;
  color: #606266;
  padding: 20px;
  border-top: 1px solid #dcdfe6;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.version {
  font-size: 14px;
  color: #909399;
}
</style>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

#app {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}
</style>
