/**
 * 时间轴执行器
 * 负责将时间轴数据转换为指令序列并执行
 */

import { buildFrame } from './protocol'
import { CHANNEL } from './protocol'
import type { TimelineConfig, TimelineCallbacks } from '@/types'

/**
 * 时间段数据（兼容旧格式）
 */
interface LegacySegment {
  start: number
  end: number
  pump: 'air' | 'water1' | 'water2' | 'off'
  pwm: number
}

/**
 * 时间轴数据
 */
interface TimelineData {
  channels: {
    ch1?: LegacySegment[]
    ch2?: LegacySegment[]
  }
}

/**
 * 执行指令
 */
interface ExecutionCommand {
  channel: number
  pumpType: number
  pwm: number
  duration: number
  segment: LegacySegment
}

/**
 * 双通道指令序列
 */
interface ChannelCommands {
  ch1: ExecutionCommand[]
  ch2: ExecutionCommand[]
}

/**
 * 进度数据
 */
interface ProgressData {
  progress: number
  currentSegmentIndex: number
  totalSegments: number
  currentLoop: number
  totalLoops: number | string
  remainingTime: number
  ch1Status: any
  ch2Status: any
}

export class TimelineExecutor {
  private isRunning = false
  private isPaused = false
  private isStopped = false
  private currentLoop = 0
  private currentSegmentIndex = 0
  private totalSegments = 0
  private previousLoopCount = 0 // 用于检测循环完成
  private previousSegmentIndex = 0 // 用于检测段开始

  // 配置对象
  private config: TimelineConfig | null = null

  // 轮询定时器
  private statusPollingTimer: number | null = null

  // 回调函数
  private onProgress: ((data: ProgressData) => void) | null = null
  private onSegmentStart: ((segment: any) => void) | null = null
  private onLoopComplete: ((data: { loop: number; total: number }) => void) | null = null
  private onComplete: (() => void) | null = null
  private onError: ((error: string) => void) | null = null

  // 串口写入函数（外部注入）
  private serialWrite: ((data: Uint8Array) => Promise<void>) | null = null

  /**
   * 设置串口写入函数
   */
  setSerialWriter(writeFn: (data: Uint8Array) => Promise<void>): void {
    this.serialWrite = writeFn
  }

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: TimelineCallbacks): void {
    this.onProgress = callbacks.onProgress || null
    this.onSegmentStart = callbacks.onSegmentStart || null
    this.onLoopComplete = callbacks.onLoopComplete || null
    this.onComplete = callbacks.onComplete || null
    this.onError = callbacks.onError || null
  }

  /**
   * 将时间轴数据转换为双通道指令序列
   */
  convertToCommands(timelineData: TimelineData): ChannelCommands {
    const { channels } = timelineData
    const channelCommands: ChannelCommands = {
      ch1: [],
      ch2: []
    }

    // 处理通道1的时间段
    if (channels.ch1 && channels.ch1.length > 0) {
      for (const segment of channels.ch1) {
        const duration = Math.round((segment.end - segment.start) * 1000) // 转换为毫秒

        // 跳过停止状态的段（不发送命令）
        if (segment.pump !== 'off') {
          const pumpType = this.getPumpType(segment.pump)

          channelCommands.ch1.push({
            channel: CHANNEL.CH1,
            pumpType: pumpType,
            pwm: segment.pwm,
            duration: duration,
            segment: segment
          })
        }
      }
    }

    // 处理通道2的时间段
    if (channels.ch2 && channels.ch2.length > 0) {
      for (const segment of channels.ch2) {
        const duration = Math.round((segment.end - segment.start) * 1000) // 转换为毫秒

        // 跳过停止状态的段（不发送命令）
        if (segment.pump !== 'off') {
          const pumpType = this.getPumpType(segment.pump)

          channelCommands.ch2.push({
            channel: CHANNEL.CH2,
            pumpType: pumpType,
            pwm: segment.pwm,
            duration: duration,
            segment: segment
          })
        }
      }
    }

    return channelCommands
  }

  /**
   * 获取泵类型编号
   */
  getPumpType(pump: string): number {
    const pumpMap: Record<string, number> = {
      'air': 0,
      'water1': 1,
      'water2': 2
    }
    return pumpMap[pump] || 0
  }

  /**
   * 构建循环添加命令 (LOOP_ADD 0x14)
   */
  buildLoopAddCommand(command: ExecutionCommand): Uint8Array {
    const duration = command.duration
    const timeH = (duration >> 8) & 0xff  // 高字节
    const timeL = duration & 0xff          // 低字节

    const data = [
      command.channel,   // 通道号 (1或2)
      command.pumpType,  // 泵类型 (0-2)
      command.pwm,       // PWM值 (0-255)
      timeH,            // 持续时间高字节
      timeL             // 持续时间低字节
    ]
    return buildFrame(0x14, data)
  }

  /**
   * 执行时间轴（双通道并行执行模式）
   */
  async execute(timelineData: TimelineData, config: TimelineConfig): Promise<void> {
    if (!this.serialWrite) {
      this.onError?.('串口未连接')
      return
    }

    // 保存配置对象
    this.config = config

    // 重置状态
    this.isRunning = true
    this.isPaused = false
    this.isStopped = false
    this.currentLoop = 0

    console.log('[TimelineExecutor] 开始双通道并行执行')

    try {
      // === 阶段1: 编程阶段 ===
      console.log('[TimelineExecutor] 阶段1: 编程阶段 - 发送时序指令')

      // 1.1 清空时序表
      const clearFrame = buildFrame(0x15, [])
      await this.serialWrite(clearFrame)
      await this.sleep(100) // 等待清空完成
      console.log('[TimelineExecutor] 已清空时序表')

      // 1.2 转换为双通道指令
      const channelCommands = this.convertToCommands(timelineData)
      this.totalSegments = channelCommands.ch1.length + channelCommands.ch2.length

      console.log('[TimelineExecutor] CH1指令数:', channelCommands.ch1.length)
      console.log('[TimelineExecutor] CH2指令数:', channelCommands.ch2.length)

      // 1.3 发送CH1的时序指令
      for (let i = 0; i < channelCommands.ch1.length; i++) {
        if (this.isStopped) break

        const cmd = channelCommands.ch1[i]
        const frame = this.buildLoopAddCommand(cmd)
        await this.serialWrite(frame)
        console.log('[TimelineExecutor] CH1命令', i + 1, '/', channelCommands.ch1.length, cmd)

        // 延时避免指令发送过快
        await this.sleep(50)
      }

      // 1.4 发送CH2的时序指令
      for (let i = 0; i < channelCommands.ch2.length; i++) {
        if (this.isStopped) break

        const cmd = channelCommands.ch2[i]
        const frame = this.buildLoopAddCommand(cmd)
        await this.serialWrite(frame)
        console.log('[TimelineExecutor] CH2命令', i + 1, '/', channelCommands.ch2.length, cmd)

        // 延时避免指令发送过快
        await this.sleep(50)
      }

      if (this.isStopped) {
        this.isRunning = false
        return
      }

      console.log('[TimelineExecutor] 阶段1完成: 时序指令已发送')

      // === 阶段2: 执行阶段 ===
      console.log('[TimelineExecutor] 阶段2: 执行阶段 - 启动并行循环')

      // 2.1 计算循环次数
      const loopCount = config.infiniteLoop ? 0 : config.loopCount

      // 2.2 发送开始命令
      const startFrame = buildFrame(0x16, [loopCount])
      await this.serialWrite(startFrame)
      console.log('[TimelineExecutor] 循环已启动，循环次数:', config.infiniteLoop ? '无限' : loopCount)

      // 2.3 开始监控进度
      this.startProgressMonitoring(config)

    } catch (error) {
      console.error('[TimelineExecutor] 执行出错:', error)
      const err = error as Error
      this.onError?.(err.message)
      this.isRunning = false
    }
  }

  /**
   * 更新进度（双通道并行模式）
   */
  updateProgress(ch1Status: any, ch2Status: any, config: TimelineConfig): void {
    if (!this.onProgress) return

    // 计算双通道总进度
    const ch1Progress = ch1Status.total > 0 ? (ch1Status.current / ch1Status.total) * 100 : 0
    const ch2Progress = ch2Status.total > 0 ? (ch2Status.current / ch2Status.total) * 100 : 0

    // 平均进度
    const avgProgress = (ch1Progress + ch2Progress) / 2

    // 计算剩余时间（基于循环次数）
    const ch1Remaining = ch1Status.total - ch1Status.current
    const ch2Remaining = ch2Status.total - ch2Status.current
    const maxRemaining = Math.max(ch1Remaining, ch2Remaining)

    // 估算剩余时间（假设平均每段2秒）
    const totalLoops = config.infiniteLoop ? Infinity : config.loopCount
    const remainingLoops = totalLoops - (ch1Status.loopCount || 0)
    const remainingTime = maxRemaining * 2 + remainingLoops * ch1Status.total * 2

    this.onProgress({
      progress: Math.round(avgProgress),
      currentSegmentIndex: Math.max(ch1Status.current, ch2Status.current),
      totalSegments: Math.max(ch1Status.total, ch2Status.total),
      currentLoop: (ch1Status.loopCount || 0) + 1,
      totalLoops: config.infiniteLoop ? '无限' : totalLoops,
      remainingTime: Math.max(0, remainingTime),
      ch1Status: ch1Status,
      ch2Status: ch2Status
    })
  }

  /**
   * 开始监控进度（轮询GET_LOOP_STATUS）
   */
  async startProgressMonitoring(_config: TimelineConfig): Promise<void> {
    // 注意：这里需要实现一个状态响应接收器
    // 由于Web Serial API的异步特性，需要通过connectionStore的readCallback来接收响应
    // 这里只是启动监控，实际的进度更新会在接收到LOOP_STATUS_RSP时触发

    console.log('[TimelineExecutor] 开始监控进度')

    // 简化版本：发送一次状态查询命令
    // 实际的进度更新需要通过监听串口响应来实现
    if (this.serialWrite) {
      const statusFrame = buildFrame(0x22, [])
      await this.serialWrite(statusFrame)
    }

    // 启动定时轮询（每秒查询一次状态）
    this.statusPollingTimer = window.setInterval(async () => {
      if (this.isStopped) {
        this.stopProgressMonitoring()
        return
      }

      // 发送状态查询命令
      if (this.serialWrite && !this.isPaused) {
        const statusFrame = buildFrame(0x22, [])
        await this.serialWrite(statusFrame)
      }
    }, 1000) // 1秒轮询一次
  }

  /**
   * 停止监控进度
   */
  stopProgressMonitoring(): void {
    if (this.statusPollingTimer) {
      clearInterval(this.statusPollingTimer)
      this.statusPollingTimer = null
      console.log('[TimelineExecutor] 停止监控进度')
    }
  }

  /**
   * 处理循环状态响应
   */
  handleLoopStatusResponse(data: Uint8Array): void {
    // 解析双通道状态
    // 响应格式: ST1+CU1+TO1+CN1+MX1+ST2+CU2+TO2+CN2+MX2
    const ch1Status = {
      state: data[0],      // 状态 (0=停止, 1=运行, 2=暂停)
      current: data[1],    // 当前命令索引
      total: data[2],      // 总命令数
      loopCount: data[3],  // 当前循环次数
      maxLoops: data[4]    // 最大循环次数 (0=无限)
    }
    const ch2Status = {
      state: data[5],
      current: data[6],
      total: data[7],
      loopCount: data[8],
      maxLoops: data[9]
    }

    console.log('[TimelineExecutor] CH1状态:', ch1Status)
    console.log('[TimelineExecutor] CH2状态:', ch2Status)

    // 检测新的段开始（任一通道的current索引变化）
    const currentSegmentIndex = Math.max(ch1Status.current, ch2Status.current)
    if (currentSegmentIndex > this.previousSegmentIndex && currentSegmentIndex > 0) {
      this.onSegmentStart?.({
        segmentIndex: currentSegmentIndex,
        ch1Status,
        ch2Status
      })
      this.previousSegmentIndex = currentSegmentIndex
    }

    // 检测循环完成（任一通道的loopCount增加）
    const currentLoopCount = Math.max(ch1Status.loopCount, ch2Status.loopCount)
    if (currentLoopCount > this.previousLoopCount && currentLoopCount > 0) {
      this.onLoopComplete?.({
        loop: currentLoopCount,
        total: ch1Status.maxLoops
      })
      this.previousLoopCount = currentLoopCount
    }

    // 检查是否都已完成
    const ch1Finished = ch1Status.state === 0 && ch1Status.current === 0
    const ch2Finished = ch2Status.state === 0 && ch2Status.current === 0

    if (ch1Finished && ch2Finished && this.isRunning) {
      console.log('[TimelineExecutor] 双通道执行完成')
      this.isRunning = false
      this.stopProgressMonitoring()
      this.onComplete?.()
      return
    }

    // 更新进度（使用保存的配置对象）
    if (this.config) {
      this.updateProgress(ch1Status, ch2Status, this.config)
    }
  }

  /**
   * 暂停执行（使用LOOP_PAUSE命令）
   */
  pause(): void {
    if (!this.isRunning) return

    this.isPaused = true
    console.log('[TimelineExecutor] 暂停')

    // 发送暂停命令
    if (this.serialWrite) {
      const pauseFrame = buildFrame(0x18, [])
      this.serialWrite(pauseFrame).catch((err: Error) => {
        console.error('[TimelineExecutor] 暂停命令发送失败:', err)
      })
    }
  }

  /**
   * 继续执行（使用LOOP_RESUME命令）
   */
  resume(): void {
    if (!this.isRunning) return

    this.isPaused = false
    console.log('[TimelineExecutor] 继续')

    // 发送继续命令
    if (this.serialWrite) {
      const resumeFrame = buildFrame(0x19, [])
      this.serialWrite(resumeFrame).catch((err: Error) => {
        console.error('[TimelineExecutor] 继续命令发送失败:', err)
      })
    }
  }

  /**
   * 停止执行（使用LOOP_STOP命令）
   */
  stop(): void {
    this.isStopped = true
    this.isPaused = false
    this.isRunning = false
    console.log('[TimelineExecutor] 停止')

    // 停止进度监控
    this.stopProgressMonitoring()

    // 发送停止命令
    if (this.serialWrite) {
      const stopFrame = buildFrame(0x17, [])
      this.serialWrite(stopFrame).catch((err: Error) => {
        console.error('[TimelineExecutor] 停止命令发送失败:', err)
      })
    }
  }

  /**
   * 延时函数
   */
  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取执行状态
   */
  getStatus(): {
    isRunning: boolean
    isPaused: boolean
    isStopped: boolean
    currentLoop: number
    currentSegmentIndex: number
    totalSegments: number
  } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      isStopped: this.isStopped,
      currentLoop: this.currentLoop,
      currentSegmentIndex: this.currentSegmentIndex,
      totalSegments: this.totalSegments
    }
  }
}

// 导出单例
export const executor = new TimelineExecutor()
