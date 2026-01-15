<template>
  <div class="serial-port-selector">
    <el-button
      v-if="!connected"
      type="primary"
      :loading="connecting"
      @click="handleConnect"
    >
      <el-icon><Connection /></el-icon>
      {{ connecting ? '连接中...' : '连接串口' }}
    </el-button>

    <el-button
      v-else
      type="danger"
      @click="handleDisconnect"
    >
      <el-icon><Close /></el-icon>
      断开连接
    </el-button>

    <el-alert
      v-if="lastError"
      type="error"
      :closable="true"
      @close="clearError"
      style="margin-top: 10px"
    >
      {{ lastError }}
    </el-alert>
  </div>
</template>

<script setup>
import { useSerial } from '@/composables/useSerial'
import { useConnectionStore } from '@/stores/connection'
import { storeToRefs } from 'pinia'
import { Connection, Close } from '@element-plus/icons-vue'

const { connect, disconnect } = useSerial()
const connectionStore = useConnectionStore()
const { connected, connecting, lastError } = storeToRefs(connectionStore)

async function handleConnect() {
  await connect()
}

async function handleDisconnect() {
  await disconnect()
}

function clearError() {
  connectionStore.clearError()
}
</script>

<style scoped>
.serial-port-selector {
  display: inline-block;
}
</style>
