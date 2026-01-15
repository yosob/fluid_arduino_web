import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'

export const useTimelineStore = defineStore('timeline', {
  state: () => ({
    // 时间轴配置
    config: {
      totalDuration: 10,    // 总时长（秒）
      loopCount: 3,         // 循环次数
      interval: 0.5,        // 时间间隔（秒）
      gridSize: 0.5         // 网格大小（秒）
    },

    // 通道时间轴数据
    channels: {
      ch1: [
        // 示例数据
        {
          id: 'seg-1',
          start: 0,
          end: 2,
          pump: 'air',
          pwm: 150,
          color: '#409EFF'
        },
        {
          id: 'seg-2',
          start: 2,
          end: 4,
          pump: 'water1',
          pwm: 200,
          color: '#67C23A'
        }
      ],
      ch2: [
        {
          id: 'seg-3',
          start: 0,
          end: 3,
          pump: 'off',
          pwm: 0,
          color: '#909399'
        }
      ]
    },

    // 执行状态
    execution: {
      isRunning: false,
      isPaused: false,
      currentLoop: 0,
      currentSegment: null,
      startTime: null,
      progress: 0
    }
  }),

  getters: {
    // 获取指定通道的时间段
    getSegments: (state) => (channel) => {
      return state.channels[channel] || []
    },

    // 获取总段数
    totalSegments: (state) => {
      const ch1Count = state.channels.ch1?.length || 0
      const ch2Count = state.channels.ch2?.length || 0
      return ch1Count + ch2Count
    },

    // 是否正在执行
    isRunning: (state) => {
      return state.execution.isRunning && !state.execution.isPaused
    },

    // 是否已暂停
    isPaused: (state) => {
      return state.execution.isPaused
    }
  },

  actions: {
    // 更新配置
    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig }
    },

    // 检查时间段是否重叠，返回所有重叠的时间段
    checkOverlap(channel, newSegment, excludeId = null) {
      const segments = this.channels[channel]
      if (!segments) return { overlap: false, conflictingSegments: [] }

      const conflictingSegments = []

      for (const segment of segments) {
        // 跳过自己
        if (excludeId && segment.id === excludeId) continue

        // 检查是否重叠
        const isNewOverlap = (newSegment.start >= segment.start && newSegment.start < segment.end) ||
                             (newSegment.end > segment.start && newSegment.end <= segment.end) ||
                             (newSegment.start <= segment.start && newSegment.end >= segment.end)

        if (isNewOverlap) {
          conflictingSegments.push(segment)
        }
      }

      return {
        overlap: conflictingSegments.length > 0,
        conflictingSegments
      }
    },

    // 添加时间段
    addSegment(channel, segment) {
      if (!this.channels[channel]) {
        this.channels[channel] = []
      }

      // 检查重叠
      const overlapResult = this.checkOverlap(channel, segment)
      if (overlapResult.overlap) {
        const firstConflict = overlapResult.conflictingSegments[0]
        return {
          success: false,
          message: `时间段与现有时间段 (${firstConflict.start}s - ${firstConflict.end}s) 重叠`
        }
      }

      this.channels[channel].push({
        ...segment,
        id: `segment-${Date.now()}`,
        color: this.getPumpColor(segment.pump)
      })
      // 按开始时间排序
      this.sortSegments(channel)

      return { success: true }
    },

    // 更新时间段
    updateSegment(channel, segmentId, data) {
      const segments = this.channels[channel]
      if (!segments) return { success: false }

      const index = segments.findIndex(s => s.id === segmentId)
      if (index === -1) return { success: false, message: '时间段不存在' }

      const updatedSegment = {
        ...segments[index],
        ...data,
        color: this.getPumpColor(data.pump || segments[index].pump)
      }

      // 检查重叠（排除自己）
      const overlapResult = this.checkOverlap(channel, updatedSegment, segmentId)
      if (overlapResult.overlap) {
        const firstConflict = overlapResult.conflictingSegments[0]
        return {
          success: false,
          message: `时间段与现有时间段 (${firstConflict.start}s - ${firstConflict.end}s) 重叠`
        }
      }

      segments[index] = updatedSegment
      this.sortSegments(channel)

      return { success: true }
    },

    // 删除时间段
    deleteSegment(channel, segmentId) {
      if (!this.channels[channel]) return

      this.channels[channel] = this.channels[channel].filter(
        s => s.id !== segmentId
      )
    },

    // 移动时间段
    moveSegment(channel, segmentId, newStartTime) {
      const segments = this.channels[channel]
      if (!segments) return

      const segment = segments.find(s => s.id === segmentId)
      if (segment) {
        const duration = segment.end - segment.start
        segment.start = newStartTime
        segment.end = newStartTime + duration
        this.sortSegments(channel)
      }
    },

    // 排序时间段
    sortSegments(channel) {
      if (!this.channels[channel]) return

      this.channels[channel].sort((a, b) => a.start - b.start)
    },

    // 开始执行
    startExecution() {
      this.execution.isRunning = true
      this.execution.isPaused = false
      this.execution.currentLoop = 0
      this.execution.startTime = Date.now()
      this.execution.progress = 0
    },

    // 暂停执行
    pauseExecution() {
      this.execution.isPaused = true
    },

    // 继续执行
    resumeExecution() {
      this.execution.isPaused = false
    },

    // 停止执行
    stopExecution() {
      this.execution.isRunning = false
      this.execution.isPaused = false
      this.execution.currentLoop = 0
      this.execution.currentSegment = null
      this.execution.progress = 0
    },

    // 更新进度
    updateProgress(progress) {
      this.execution.progress = progress
    },

    // 重置时间轴
    reset() {
      this.channels.ch1 = []
      this.channels.ch2 = []
      this.execution.isRunning = false
      this.execution.isPaused = false
      this.execution.currentLoop = 0
      this.execution.progress = 0
    },

    // 保存时间轴
    saveTimeline(name) {
      const data = {
        version: '1.0',
        metadata: {
          name,
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        },
        config: { ...this.config },
        channels: {
          ch1: [...this.channels.ch1],
          ch2: [...this.channels.ch2]
        }
      }
      return JSON.stringify(data, null, 2)
    },

    // 加载时间轴
    loadTimeline(jsonData) {
      try {
        const data = JSON.parse(jsonData)
        this.config = { ...data.config }
        this.channels.ch1 = data.channels.ch1 || []
        this.channels.ch2 = data.channels.ch2 || []
        return true
      } catch (error) {
        console.error('加载时间轴失败:', error)
        return false
      }
    },

    // 获取泵颜色
    getPumpColor(pump) {
      const colors = {
        air: '#409EFF',
        water1: '#67C23A',
        water2: '#E6A23C',
        off: '#909399'
      }
      return colors[pump] || '#909399'
    }
  }
})
