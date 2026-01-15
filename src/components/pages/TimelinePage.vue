<template>
  <div class="timeline-page">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <span>⏱️ 可视化时间轴编程</span>
          <el-tag type="info" size="small">v1.6 规划中</el-tag>
        </div>
      </template>

      <!-- 时间轴配置 -->
      <div class="config-section">
        <h3>📊 时间轴配置</h3>
        <el-form :inline="true" :model="config">
          <el-form-item label="总时长">
            <el-input-number
              v-model="config.totalDuration"
              :min="1"
              :max="60"
              :step="1"
              controls-position="right"
            />
            <span style="margin-left: 8px">秒</span>
          </el-form-item>

          <el-form-item label="循环次数">
            <el-checkbox v-model="config.infiniteLoop">无限循环</el-checkbox>
            <el-input-number
              v-if="!config.infiniteLoop"
              v-model="config.loopCount"
              :min="1"
              :max="100"
              :step="1"
              controls-position="right"
              style="margin-left: 10px"
            />
            <span v-if="!config.infiniteLoop" style="margin-left: 8px">次</span>
          </el-form-item>

          <el-form-item label="时间间隔">
            <el-input-number
              v-model="config.interval"
              :min="0.1"
              :max="1"
              :step="0.1"
              :precision="1"
              controls-position="right"
            />
            <span style="margin-left: 8px">秒</span>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="applyConfig">应用配置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 通道时间轴 -->
      <div class="timeline-section">
        <h3>通道 1</h3>
        <ChannelTimeline
          channel="ch1"
          :config="config"
          :segments="timelineStore.channels?.ch1 || []"
          @segment-click="handleSegmentClick"
          @segment-update="handleSegmentUpdate"
        />

        <el-divider />

        <h3>通道 2</h3>
        <ChannelTimeline
          channel="ch2"
          :config="config"
          :segments="timelineStore.channels?.ch2 || []"
          @segment-click="handleSegmentClick"
          @segment-update="handleSegmentUpdate"
        />
      </div>

      <!-- 控制面板 -->
      <div class="controls-section">
        <el-divider />
        <h3>🎬 控制面板</h3>
        <div class="button-group">
          <el-button
            type="success"
            :icon="VideoPlay"
            :disabled="isExecuting"
            @click="startExecution"
          >
            执行
          </el-button>

          <el-button
            type="warning"
            :icon="VideoPause"
            :disabled="!isExecuting"
            @click="isPaused ? resumeExecution() : pauseExecution()"
          >
            {{ isPaused ? '继续' : '暂停' }}
          </el-button>

          <el-button
            type="danger"
            :icon="CircleClose"
            :disabled="!isExecuting"
            @click="stopExecution"
          >
            停止
          </el-button>

          <el-button
            :icon="RefreshRight"
            @click="resetTimeline"
          >
            重置
          </el-button>

          <el-button
            :icon="Folder"
            @click="saveTimeline"
          >
            保存
          </el-button>

          <el-button
            :icon="FolderOpened"
            @click="loadTimeline"
          >
            加载
          </el-button>
        </div>
      </div>

      <!-- 执行进度 -->
      <div v-if="isExecuting || executionProgress.progress > 0" class="progress-section">
        <el-divider />
        <h3>📊 执行进度</h3>

        <!-- CH1 进度 -->
        <div class="channel-progress">
          <div class="channel-title">
            <span>📍 通道 1</span>
            <span v-if="executionProgress.ch1Status" class="channel-status">
              <span v-if="!config.infiniteLoop">
                循环: {{ executionProgress.ch1Status.loopCount }} / {{ config.loopCount }}
              </span>
              <span v-else>
                第 {{ executionProgress.ch1Status.loopCount }} 轮
              </span>
            </span>
          </div>
          <el-progress
            :percentage="getChannelProgress('ch1')"
            :format="(percentage) => `${percentage}%`"
            :stroke-width="20"
            status="success"
          />
          <div v-if="executionProgress.ch1Status" class="segment-info">
            段进度: {{ executionProgress.ch1Status.current }} / {{ executionProgress.ch1Status.total }}
          </div>
        </div>

        <!-- CH2 进度 -->
        <div class="channel-progress">
          <div class="channel-title">
            <span>📍 通道 2</span>
            <span v-if="executionProgress.ch2Status" class="channel-status">
              <span v-if="!config.infiniteLoop">
                循环: {{ executionProgress.ch2Status.loopCount }} / {{ config.loopCount }}
              </span>
              <span v-else>
                第 {{ executionProgress.ch2Status.loopCount }} 轮
              </span>
            </span>
          </div>
          <el-progress
            :percentage="getChannelProgress('ch2')"
            :format="(percentage) => `${percentage}%`"
            :stroke-width="20"
            status="success"
          />
          <div v-if="executionProgress.ch2Status" class="segment-info">
            段进度: {{ executionProgress.ch2Status.current }} / {{ executionProgress.ch2Status.total }}
          </div>
        </div>

        <!-- 总体剩余时间 -->
        <div class="total-time">
          总剩余时间: {{ formatTime(executionProgress.remainingTime) }}
        </div>
      </div>
    </el-card>

    <!-- 时间段编辑器 -->
    <SegmentEditor
      v-model:visible="editorVisible"
      :segment="currentSegment"
      :max-duration="config.totalDuration"
      @save="handleSaveSegment"
      @delete="handleDeleteSegment"
      @copy="handleCopySegment"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  VideoPlay,
  VideoPause,
  CircleClose,
  RefreshRight,
  Folder,
  FolderOpened
} from '@element-plus/icons-vue'
import ChannelTimeline from '@/components/timeline/ChannelTimeline.vue'
import SegmentEditor from '@/components/timeline/SegmentEditor.vue'
import { useTimelineStore } from '@/stores/timeline'
import { useConnectionStore } from '@/stores/connection'
import { useLoopStore } from '@/stores/loop'
import { executor } from '@/utils/timelineExecutor'
import { serialManager } from '@/utils/serialManager'
import { CMD } from '@/utils/protocol'

// Store
const timelineStore = useTimelineStore()
const connectionStore = useConnectionStore()
const loopStore = useLoopStore()

// 初始化执行器的串口写入函数
function setupSerialWriter() {
  console.log('[TimelinePage] setupSerialWriter 被调用')
  console.log('[TimelinePage] connectionStore.connected:', connectionStore.connected)
  console.log('[TimelinePage] serialManager.isConnected():', serialManager.isConnected())

  if (connectionStore.connected && serialManager.isConnected()) {
    // 使用 serialManager.send() 作为写入函数
    executor.setSerialWriter(async (data) => {
      await serialManager.send(data)
    })
    console.log('[TimelinePage] ✅ 串口写入函数已设置（使用 serialManager.send）')
    console.log('[TimelinePage] executor.serialWrite:', executor.serialWrite)
  } else {
    console.warn('[TimelinePage] ❌ 串口未连接，无法设置写入函数')
  }
}

// 初始化执行器
onMounted(() => {
  // 设置串口写入函数
  setupSerialWriter()

  // 设置回调函数
  executor.setCallbacks({
    onProgress: (progress) => {
      executionProgress.progress = progress.progress
      executionProgress.currentSegmentIndex = progress.currentSegmentIndex
      executionProgress.totalSegments = progress.totalSegments
      executionProgress.currentLoop = progress.currentLoop
      executionProgress.remainingTime = progress.remainingTime

      // 新增：保存双通道状态
      if (progress.ch1Status) {
        executionProgress.ch1Status = progress.ch1Status
      }
      if (progress.ch2Status) {
        executionProgress.ch2Status = progress.ch2Status
      }
    },
    onSegmentStart: (data) => {
      console.log('段开始:', data)
    },
    onLoopComplete: (data) => {
      console.log('循环完成:', data)
      ElMessage.success(`第 ${data.loop} 轮循环完成`)
    },
    onComplete: () => {
      console.log('执行完成')
      ElMessage.success('时间轴执行完成')
      isExecuting.value = false
      isPaused.value = false

      // 重置所有进度信息
      executionProgress.progress = 0
      executionProgress.currentSegmentIndex = 0
      executionProgress.totalSegments = 0
      executionProgress.currentLoop = 0
      executionProgress.remainingTime = 0
      executionProgress.ch1Status = null
      executionProgress.ch2Status = null
    },
    onError: (error) => {
      console.error('执行错误:', error)
      ElMessage.error(`执行错误: ${error}`)
      isExecuting.value = false

      // 重置所有进度信息
      executionProgress.progress = 0
      executionProgress.currentSegmentIndex = 0
      executionProgress.totalSegments = 0
      executionProgress.currentLoop = 0
      executionProgress.remainingTime = 0
      executionProgress.ch1Status = null
      executionProgress.ch2Status = null
    }
  })
})

// 监听连接状态变化，当串口连接后自动设置写入函数
watch(() => connectionStore.connected, (isConnected) => {
  if (isConnected) {
    console.log('[TimelinePage] 检测到串口已连接，设置写入函数')
    setupSerialWriter()
  }
}, { immediate: true })

// 监听loopStore的状态变化，当执行器运行时转发给executor
watch(() => loopStore.status, (newStatus) => {
  if (executor.isRunning && newStatus) {
    // 构造10字节的状态数据数组
    // 格式: ST1+CU1+TO1+CN1+MX1+ST2+CU2+TO2+CN2+MX2
    const data = new Uint8Array([
      newStatus.ch1.state,
      newStatus.ch1.current,
      newStatus.ch1.total,
      newStatus.ch1.loopCount,
      newStatus.ch1.maxLoops,
      newStatus.ch2.state,
      newStatus.ch2.current,
      newStatus.ch2.total,
      newStatus.ch2.loopCount,
      newStatus.ch2.maxLoops
    ])

    // 转发给executor处理
    executor.handleLoopStatusResponse(data)
  }
}, { deep: true })

// 编辑器状态
const editorVisible = ref(false)
const currentSegment = ref(null)
const currentChannel = ref('')

// 配置
const config = reactive({
  totalDuration: 10,
  loopCount: 3,
  interval: 0.5,
  gridSize: 0.5,
  infiniteLoop: false
})

// 执行状态
const isExecuting = ref(false)
const isPaused = ref(false)
const executionProgress = reactive({
  progress: 0,
  currentSegmentIndex: 0,
  totalSegments: 0,
  currentLoop: 0,
  remainingTime: 0,
  ch1Status: null,
  ch2Status: null
})

// 应用配置
function applyConfig() {
  timelineStore.updateConfig(config)
  ElMessage.success('配置已应用')
}

// 处理时间段点击
function handleSegmentClick({ channel, segment }) {
  currentChannel.value = channel
  currentSegment.value = segment
  editorVisible.value = true
}

// 处理时间段更新
function handleSegmentUpdate({ channel, segment }) {
  // 如果没有 id，说明是新添加的时间段
  if (!segment.id) {
    const result = timelineStore.addSegment(channel, segment)
    if (!result.success) {
      ElMessage.warning(result.message || '添加失败，时间段重叠')
    }
  } else {
    // 更新现有时间段
    const result = timelineStore.updateSegment(channel, segment.id, segment)
    if (!result.success) {
      ElMessage.warning(result.message || '更新失败，时间段重叠')
    }
  }
}

// 保存时间段
function handleSaveSegment(segment) {
  let result
  if (currentSegment.value) {
    // 更新现有时间段
    result = timelineStore.updateSegment(currentChannel.value, segment.id, segment)
  } else {
    // 添加新时间段
    result = timelineStore.addSegment(currentChannel.value, segment)
  }

  if (result.success) {
    ElMessage.success('保存成功')
  } else {
    ElMessage.error(result.message || '保存失败')
  }
}

// 删除时间段
function handleDeleteSegment(segmentId) {
  timelineStore.deleteSegment(currentChannel.value, segmentId)
}

// 复制时间段
function handleCopySegment(segment) {
  timelineStore.addSegment(currentChannel.value, segment)
}

// 开始执行
async function startExecution() {
  // 检查串口连接
  if (!connectionStore.connected) {
    ElMessage.warning('请先连接串口')
    return
  }

  // 确保串口写入函数已设置（再次检查）
  if (!executor.serialWrite) {
    console.warn('[TimelinePage] 执行前检测：串口写入函数未设置，立即设置')
    setupSerialWriter()

    // 如果还是无法设置，报错
    if (!executor.serialWrite) {
      ElMessage.error('串口写入函数初始化失败，请重新连接串口')
      return
    }
  }

  // 检查时间轴是否为空
  const ch1Segments = timelineStore.channels?.ch1 || []
  const ch2Segments = timelineStore.channels?.ch2 || []
  if (ch1Segments.length === 0 && ch2Segments.length === 0) {
    ElMessage.warning('请先添加时间段')
    return
  }

  // 准备时间轴数据
  const timelineData = {
    channels: {
      ch1: ch1Segments,
      ch2: ch2Segments
    },
    config: { ...config }
  }

  // 开始执行
  isExecuting.value = true
  isPaused.value = false
  executionProgress.progress = 0

  ElMessage.success('开始执行时间轴')

  try {
    await executor.execute(timelineData, config)
  } catch (error) {
    console.error('执行失败:', error)
    ElMessage.error(`执行失败: ${error.message}`)
    isExecuting.value = false
  }
}

// 暂停执行
function pauseExecution() {
  executor.pause()
  isPaused.value = true
  ElMessage.warning('执行已暂停')
}

// 继续执行
function resumeExecution() {
  executor.resume()
  isPaused.value = false
  ElMessage.success('执行已继续')
}

// 停止执行
function stopExecution() {
  executor.stop()
  isExecuting.value = false
  isPaused.value = false

  // 重置所有进度信息
  executionProgress.progress = 0
  executionProgress.currentSegmentIndex = 0
  executionProgress.totalSegments = 0
  executionProgress.currentLoop = 0
  executionProgress.remainingTime = 0
  executionProgress.ch1Status = null
  executionProgress.ch2Status = null

  ElMessage.error('执行已停止')
}

// 重置时间轴
function resetTimeline() {
  ElMessage.confirm('确定要重置时间轴吗？所有未保存的更改将丢失。', '确认重置', {
    type: 'warning'
  }).then(() => {
    timelineStore.reset()
    executionProgress.progress = 0
    ElMessage.success('时间轴已重置')
  })
}

// 保存时间轴
function saveTimeline() {
  ElMessage.success('时间轴已保存')
  // TODO: 实现保存逻辑
}

// 加载时间轴
function loadTimeline() {
  ElMessage.info('加载时间轴')
  // TODO: 实现加载逻辑
}

// 计算单个通道的进度百分比
function getChannelProgress(channel) {
  const status = executionProgress[`${channel}Status`]
  if (!status || status.total === 0) return 0

  // 如果状态为 0（停止），返回 100%
  if (status.state === 0) return 100

  if (config.infiniteLoop) {
    // 无限循环：始终显示正在执行，固定 50% 或基于当前段
    return Math.round((status.current / status.total) * 100)
  } else {
    // 有限循环：基于循环次数计算（与当前段的进度无关）
    const progress = Math.round((status.loopCount / config.loopCount) * 100)

    // 如果已完成所有循环，显示 100%
    if (status.loopCount >= config.loopCount) return 100

    return progress
  }
}

// 时间格式化
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.timeline-page {
  padding: 20px;
}

.main-card {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
}

.config-section {
  margin-bottom: 30px;
}

.timeline-section {
  margin-bottom: 30px;
}

.controls-section {
  margin-top: 20px;
}

.progress-section {
  margin-top: 20px;
}

.channel-progress {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.channel-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: bold;
  font-size: 14px;
  color: #303133;
}

.channel-status {
  font-weight: normal;
  font-size: 13px;
  color: #606266;
}

.segment-info {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.total-time {
  margin-top: 15px;
  text-align: center;
  font-size: 14px;
  font-weight: bold;
  color: #409eff;
}

.button-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.progress-info {
  display: flex;
  justify-content: space-around;
  margin-top: 15px;
  font-size: 14px;
  color: #606266;
}

h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

:deep(.el-form-item) {
  margin-bottom: 10px;
}
</style>
