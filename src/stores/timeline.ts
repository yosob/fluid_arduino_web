/**
 * 时间轴状态管理
 */
import { defineStore } from 'pinia'
import type { TimelineConfig } from '@/types'

/**
 * 泵类型
 */
export type PumpTypeOption = 'air' | 'water1' | 'water2' | 'off'

/**
 * 时间段数据（兼容旧的属性名）
 */
export interface SegmentData {
  id: string
  channelId: 'ch1' | 'ch2'
  startTime: number
  endTime: number
  pumpType: number
  pwm: number
  color: string
}

export const useTimelineStore = defineStore('timeline', {
  state: () => ({
    // 时间轴配置
    config: {
      totalDuration: 10,    // 总时长（秒）
      loopCount: 3,         // 循环次数
      interval: 0.5,        // 时间间隔（秒）
      gridSize: 0.5         // 网格大小（秒）
    } as TimelineConfig,

    // 通道时间轴数据
    channels: {
      ch1: [] as SegmentData[],
      ch2: [] as SegmentData[]
    },

    // 执行状态
    execution: {
      isRunning: false,
      isPaused: false,
      currentLoop: 0,
      currentSegment: null as SegmentData | null,
      startTime: null as number | null,
      progress: 0
    }
  }),

  getters: {
    // 获取指定通道的时间段
    getSegments: (state) => (channel: 'ch1' | 'ch2'): SegmentData[] => {
      return state.channels[channel] || []
    },

    // 获取总段数
    totalSegments: (state): number => {
      const ch1Count = state.channels.ch1?.length || 0
      const ch2Count = state.channels.ch2?.length || 0
      return ch1Count + ch2Count
    },

    // 是否正在执行
    isRunning: (state): boolean => {
      return state.execution.isRunning && !state.execution.isPaused
    },

    // 是否已暂停
    isPaused: (state): boolean => {
      return state.execution.isPaused
    }
  },

  actions: {
    // 更新配置
    updateConfig(newConfig: Partial<TimelineConfig>): void {
      this.config = { ...this.config, ...newConfig }
    },

    // 检查时间段是否重叠，返回所有重叠的时间段
    checkOverlap(channel: 'ch1' | 'ch2', newSegment: Partial<SegmentData>, excludeId: string | null = null) {
      const segments = this.channels[channel]
      if (!segments) return { overlap: false, conflictingSegments: [] }

      const conflictingSegments: SegmentData[] = []

      for (const segment of segments) {
        // 跳过自己
        if (excludeId && segment.id === excludeId) continue

        // 检查是否重叠
        if (newSegment.startTime !== undefined && newSegment.endTime !== undefined) {
          const isNewOverlap = (newSegment.startTime >= segment.startTime && newSegment.startTime < segment.endTime) ||
                               (newSegment.endTime > segment.startTime && newSegment.endTime <= segment.endTime) ||
                               (newSegment.startTime <= segment.startTime && newSegment.endTime >= segment.endTime)

          if (isNewOverlap) {
            conflictingSegments.push(segment)
          }
        }
      }

      return {
        overlap: conflictingSegments.length > 0,
        conflictingSegments
      }
    },

    // 添加时间段
    addSegment(channel: 'ch1' | 'ch2', segment: Omit<SegmentData, 'id' | 'color'>) {
      if (!this.channels[channel]) {
        this.channels[channel] = []
      }

      // 检查重叠
      const overlapResult = this.checkOverlap(channel, segment)
      if (overlapResult.overlap) {
        const firstConflict = overlapResult.conflictingSegments[0]
        return {
          success: false,
          message: `时间段与现有时间段 (${firstConflict.startTime}s - ${firstConflict.endTime}s) 重叠`
        }
      }

      this.channels[channel].push({
        ...segment,
        id: `segment-${Date.now()}`,
        color: this.getPumpColor(segment.pumpType)
      })
      // 按开始时间排序
      this.sortSegments(channel)

      return { success: true }
    },

    // 更新时间段
    updateSegment(channel: 'ch1' | 'ch2', segmentId: string, data: Partial<SegmentData>) {
      const segments = this.channels[channel]
      if (!segments) return { success: false }

      const index = segments.findIndex(s => s.id === segmentId)
      if (index === -1) return { success: false, message: '时间段不存在' }

      const updatedSegment: SegmentData = {
        ...segments[index],
        ...data,
        color: this.getPumpColor(data.pumpType || segments[index].pumpType)
      }

      // 检查重叠（排除自己）
      const overlapResult = this.checkOverlap(channel, updatedSegment, segmentId)
      if (overlapResult.overlap) {
        const firstConflict = overlapResult.conflictingSegments[0]
        return {
          success: false,
          message: `时间段与现有时间段 (${firstConflict.startTime}s - ${firstConflict.endTime}s) 重叠`
        }
      }

      segments[index] = updatedSegment
      this.sortSegments(channel)

      return { success: true }
    },

    // 删除时间段
    deleteSegment(channel: 'ch1' | 'ch2', segmentId: string): void {
      if (!this.channels[channel]) return

      this.channels[channel] = this.channels[channel].filter(
        s => s.id !== segmentId
      )
    },

    // 移动时间段
    moveSegment(channel: 'ch1' | 'ch2', segmentId: string, newStartTime: number): void {
      const segments = this.channels[channel]
      if (!segments) return

      const segment = segments.find(s => s.id === segmentId)
      if (segment) {
        const duration = segment.endTime - segment.startTime
        segment.startTime = newStartTime
        segment.endTime = newStartTime + duration
        this.sortSegments(channel)
      }
    },

    // 排序时间段
    sortSegments(channel: 'ch1' | 'ch2'): void {
      if (!this.channels[channel]) return

      this.channels[channel].sort((a, b) => a.startTime - b.startTime)
    },

    // 开始执行
    startExecution(): void {
      this.execution.isRunning = true
      this.execution.isPaused = false
      this.execution.currentLoop = 0
      this.execution.startTime = Date.now()
      this.execution.progress = 0
    },

    // 暂停执行
    pauseExecution(): void {
      this.execution.isPaused = true
    },

    // 继续执行
    resumeExecution(): void {
      this.execution.isPaused = false
    },

    // 停止执行
    stopExecution(): void {
      this.execution.isRunning = false
      this.execution.isPaused = false
      this.execution.currentLoop = 0
      this.execution.currentSegment = null
      this.execution.progress = 0
    },

    // 更新进度
    updateProgress(progress: number): void {
      this.execution.progress = progress
    },

    // 重置时间轴
    reset(): void {
      this.channels.ch1 = []
      this.channels.ch2 = []
      this.execution.isRunning = false
      this.execution.isPaused = false
      this.execution.currentLoop = 0
      this.execution.progress = 0
    },

    // 保存时间轴
    saveTimeline(name: string): string {
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
    loadTimeline(jsonData: string): boolean {
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
    getPumpColor(pumpType: number): string {
      const colors: Record<number, string> = {
        0: '#409EFF',   // 气泵
        1: '#67C23A',   // 液泵1
        2: '#E6A23C',   // 液泵2
        255: '#909399'  // 停止
      }
      return colors[pumpType] || '#909399'
    }
  }
})
