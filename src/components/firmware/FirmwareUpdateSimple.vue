<template>
  <div class="firmware-update-simple">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <span>💾 Arduino 固件升级（使用 avrgirl-arduino）</span>
        </div>
      </template>

      <!-- 固件信息 -->
      <el-descriptions :column="2" border style="margin-bottom: 20px">
        <el-descriptions-item label="固件版本">{{ FIRMWARE_INFO.version }}</el-descriptions-item>
        <el-descriptions-item label="发布日期">{{ FIRMWARE_INFO.date }}</el-descriptions-item>
        <el-descriptions-item label="文件大小">{{ formatFileSize(FIRMWARE_INFO.fileSize) }}</el-descriptions-item>
        <el-descriptions-item label="文件名">{{ FIRMWARE_INFO.fileName }}</el-descriptions-item>
        <el-descriptions-item label="说明" :span="2">{{ FIRMWARE_INFO.description }}</el-descriptions-item>
      </el-descriptions>

      <!-- 操作说明 -->
      <el-alert
        title="使用说明"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        <template #default>
          <ol style="margin: 10px 0; padding-left: 20px;">
            <li>确保 Arduino 通过 USB 连接到电脑</li>
            <li>点击"开始上传"按钮</li>
            <li>在浏览器弹出的对话框中选择 Arduino 串口</li>
            <li>等待固件上传完成</li>
          </ol>
        </template>
      </el-alert>

      <!-- 上传按钮 -->
      <div class="button-group">
        <el-button
          type="primary"
          size="large"
          :loading="isUploading"
          :disabled="uploadCompleted"
          @click="startUpload"
        >
          {{ uploadCompleted ? '✓ 上传完成' : isUploading ? '上传中...' : '开始上传' }}
        </el-button>

        <el-button
          v-if="uploadCompleted"
          size="large"
          @click="reset"
        >
          重新上传
        </el-button>
      </div>

      <!-- 进度条 -->
      <div v-if="isUploading || uploadCompleted" class="progress-section">
        <el-progress
          :percentage="uploadProgress"
          :status="uploadCompleted ? 'success' : undefined"
          :stroke-width="20"
        />
        <div class="progress-stats">
          <span>已上传: {{ formatFileSize(uploadedBytes) }}</span>
          <span>用时: {{ formatTime(elapsedTime) }}</span>
          <span v-if="uploadSpeed > 0">速度: {{ formatFileSize(uploadSpeed) }}/s</span>
        </div>
      </div>

      <!-- 日志输出 -->
      <div class="log-section">
        <div class="log-header">
          <span>日志输出</span>
          <el-button
            size="small"
            @click="clearLogs"
          >
            清空
          </el-button>
        </div>
        <div class="log-content" ref="logContentRef">
          <div
            v-for="(log, index) in logs"
            :key="index"
            :class="['log-item', `log-${log.type}`]"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { FIRMWARE_INFO } from '@/config/firmware'

// avrgirl-arduino 已在 index.html 中通过 <script> 标签加载
// 它会被挂载到 window.AvrgirlArduino

// 状态
const isUploading = ref(false)
const uploadCompleted = ref(false)
const uploadProgress = ref(0)
const uploadedBytes = ref(0)
const startTime = ref(0)
const elapsedTime = ref(0)
const uploadSpeed = ref(0)
const logs = ref([])
const logContentRef = ref(null)

// 固件路径
const FIRMWARE_PATH = '/firmware/fluid_v1.hex'

/**
 * 添加日志
 */
function addLog(type, message) {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

  logs.value.push({ type, message, time })

  // 自动滚动到底部
  nextTick(() => {
    if (logContentRef.value) {
      logContentRef.value.scrollTop = logContentRef.value.scrollHeight
    }
  })
}

/**
 * 清空日志
 */
function clearLogs() {
  logs.value = []
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 格式化时间
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 重置上传状态
 */
function reset() {
  isUploading.value = false
  uploadCompleted.value = false
  uploadProgress.value = 0
  uploadedBytes.value = 0
  elapsedTime.value = 0
  uploadSpeed.value = 0
}

/**
 * 开始上传
 */
async function startUpload() {
  if (uploadCompleted.value) return

  try {
    isUploading.value = true
    uploadProgress.value = 0
    uploadCompleted.value = false
    uploadedBytes.value = 0
    startTime.value = Date.now()
    elapsedTime.value = 0
    uploadSpeed.value = 0

    addLog('info', '=== 开始固件上传 ===')

    // 步骤 1: 加载固件文件
    addLog('info', '正在加载固件文件...')
    const response = await fetch(FIRMWARE_PATH)
    if (!response.ok) {
      throw new Error('固件文件加载失败')
    }
    const arrayBuffer = await response.arrayBuffer()
    addLog('success', `固件文件加载成功，大小: ${formatFileSize(arrayBuffer.byteLength)}`)

    // 步骤 2: 确认上传
    await ElMessageBox.confirm(
      '固件已加载完成。点击"确定"开始上传到 Arduino。\n\n系统将自动选择串口并开始上传过程。',
      '准备上传',
      {
        confirmButtonText: '开始上传',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    // 步骤 3: 检查 avrgirl-arduino 库
    addLog('info', '正在初始化 avrgirl-arduino...')

    // 等待一小段时间确保脚本加载完成
    await new Promise(resolve => setTimeout(resolve, 300))

    // global 版本应该直接挂载到 window.AvrgirlArduino
    if (typeof window.AvrgirlArduino === 'undefined') {
      throw new Error('avrgirl-arduino 库未加载，请检查浏览器控制台')
    }

    addLog('success', '✓ avrgirl-arduino 已加载')
    addLog('info', '目标板卡: Arduino Uno')
    addLog('success', 'avrgirl-arduino 初始化成功')
    addLog('info', '准备开始上传，浏览器将弹出串口选择对话框...')
    addLog('info', '请在对话框中选择正确的 Arduino 串口（通常是 USB Serial 或 CH340）')

    // 步骤 4: 创建 avrgirl-arduino 实例并上传
    const avrgirl = new window.AvrgirlArduino({
      board: 'uno',  // Arduino Uno
      debug: true
    })

    addLog('info', '正在上传固件...')
    addLog('info', '这个过程可能需要几秒钟，请耐心等待...')

    // 开始上传
    avrgirl.flash(arrayBuffer, (error) => {
      if (error) {
        console.error('上传失败:', error)
        addLog('error', `上传失败: ${error.message}`)
        ElMessage.error(`固件上传失败: ${error.message}`)
        isUploading.value = false
      } else {
        console.info('固件上传成功')
        addLog('success', '固件上传成功！')
        addLog('success', 'Arduino 已重启并运行新固件')

        uploadCompleted.value = true
        uploadProgress.value = 100
        uploadedBytes.value = arrayBuffer.byteLength

        // 更新最终统计
        const totalTime = (Date.now() - startTime.value) / 1000
        elapsedTime.value = totalTime
        uploadSpeed.value = arrayBuffer.byteLength / totalTime

        ElMessage.success('固件上传成功！')
        isUploading.value = false
      }
    })

    // 监听上传进度（模拟进度条）
    const progressInterval = setInterval(() => {
      if (isUploading.value && !uploadCompleted.value) {
        // avrgirl-arduino 没有提供详细进度，我们显示一个模拟进度
        uploadProgress.value = Math.min(uploadProgress.value + 2, 95)
        uploadedBytes.value = Math.floor(arrayBuffer.byteLength * (uploadProgress.value / 100))

        const elapsed = (Date.now() - startTime.value) / 1000
        elapsedTime.value = elapsed
        if (elapsed > 0) {
          uploadSpeed.value = uploadedBytes.value / elapsed
        }
      } else {
        clearInterval(progressInterval)
      }
    }, 200)

  } catch (error) {
    if (error !== 'cancel') {
      console.error('固件上传失败:', error)
      addLog('error', `上传失败: ${error.message}`)
      ElMessage.error(`固件上传失败: ${error.message}`)
    }
    isUploading.value = false
  }
}
</script>

<style scoped>
.firmware-update-simple {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.main-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  font-size: 18px;
  font-weight: bold;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.progress-section {
  margin: 20px 0;
}

.progress-stats {
  display: flex;
  gap: 20px;
  margin-top: 10px;
  font-size: 14px;
  color: #606266;
}

.log-section {
  margin-top: 20px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
  font-weight: bold;
}

.log-content {
  height: 300px;
  overflow-y: auto;
  background-color: #1e1e1e;
  padding: 10px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
}

.log-item {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
  line-height: 1.5;
}

.log-time {
  color: #858585;
  min-width: 70px;
}

.log-message {
  color: #d4d4d4;
}

.log-info .log-message {
  color: #4fc3f7;
}

.log-success .log-message {
  color: #81c784;
}

.log-error .log-message {
  color: #e57373;
}

.log-warning .log-message {
  color: #ffb74d;
}
</style>
