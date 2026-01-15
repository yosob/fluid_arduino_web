<template>
  <div class="log-viewer">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>📜 通信日志</span>
          <el-button
            size="small"
            :icon="Delete"
            @click="handleClear"
          >
            清空
          </el-button>
        </div>
      </template>

      <div class="log-content">
        <div
          v-for="log in logs"
          :key="log.id"
          class="log-item"
          :class="`log-${log.type}`"
        >
          <div class="log-header">
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            <el-tag
              :type="getTagType(log.type)"
              size="small"
            >
              {{ getTypeText(log.type) }}
            </el-tag>
          </div>

          <div class="log-message">{{ log.message }}</div>

          <div
            v-if="log.data"
            class="log-data"
          >
            <el-text
              type="info"
              size="small"
            >
              {{ formatHex(log.data) }}
            </el-text>
          </div>
        </div>

        <el-empty
          v-if="logs.length === 0"
          description="暂无日志"
          :image-size="80"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { Delete } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { useLogStore } from '@/stores/log'

const logStore = useLogStore()
const { logs } = storeToRefs(logStore)
const { clearLogs, formatHex } = logStore

function handleClear() {
  clearLogs()
}

function formatTime(date) {
  const now = new Date()
  const diff = now - date

  // 如果是今天的日期，只显示时间
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return date.toLocaleTimeString('zh-CN', { hour12: false })
  }

  // 否则显示完整日期时间
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

function getTagType(type) {
  const types = {
    send: '',
    receive: 'success',
    info: 'info',
    error: 'danger',
    success: 'success'
  }
  return types[type] || 'info'
}

function getTypeText(type) {
  const texts = {
    send: '发送',
    receive: '接收',
    info: '信息',
    error: '错误',
    success: '成功'
  }
  return texts[type] || '未知'
}
</script>

<style scoped>
.log-viewer {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 16px;
}

.log-content {
  height: calc(100vh - 250px);
  overflow-y: auto;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}

.log-item {
  padding: 10px;
  margin-bottom: 10px;
  background: white;
  border-radius: 4px;
  border-left: 3px solid #ccc;
  transition: all 0.3s;
}

.log-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.log-item.log-send {
  border-left-color: #409eff;
}

.log-item.log-receive {
  border-left-color: #67c23a;
}

.log-item.log-info {
  border-left-color: #909399;
}

.log-item.log-error {
  border-left-color: #f56c6c;
  background: #fef0f0;
}

.log-item.log-success {
  border-left-color: #67c23a;
  background: #f0f9ff;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.log-time {
  font-size: 12px;
  color: #909399;
}

.log-message {
  font-size: 14px;
  color: #303133;
  margin-bottom: 6px;
  font-weight: 500;
}

.log-data {
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  word-break: break-all;
}

/* 滚动条样式 */
.log-content::-webkit-scrollbar {
  width: 6px;
}

.log-content::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.log-content::-webkit-scrollbar-track {
  background: #f5f7fa;
}

.log-content::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}
</style>
