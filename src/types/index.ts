/**
 * 全局类型定义
 */

// ==================== 协议相关类型 ====================

/**
 * 协议命令码枚举
 */
export enum ProtocolCommand {
  // 下行命令（上位机 → 下位机）
  SET_PUMP = 0x10, // 启动指定泵
  STOP_CHANNEL = 0x11, // 停止指定通道
  STOP_ALL = 0x12, // 紧急停止所有泵
  LOOP_ADD = 0x14, // 添加循环时序指令
  LOOP_CLEAR = 0x15, // 清空时序表
  LOOP_START = 0x16, // 开始循环执行
  LOOP_STOP = 0x17, // 停止循环执行
  LOOP_PAUSE = 0x18, // 暂停循环
  LOOP_RESUME = 0x19, // 继续循环
  GET_VERSION = 0x20, // 获取版本信息
  GET_STATUS = 0x21, // 查询运行状态
  GET_LOOP_STATUS = 0x22, // 查询循环状态

  // 上行命令（下位机 → 上位机）
  VERSION_RSP = 0x30, // 版本信息响应
  STATUS_RSP = 0x31, // 状态查询响应
  LOOP_STATUS_RSP = 0x32, // 循环状态响应
  ACK = 0x40, // 确认响应
  NACK = 0x41, // 错误响应

  // 双向命令
  HEARTBEAT = 0x50 // 心跳包
}

/**
 * 泵类型枚举
 */
export enum PumpType {
  AIR = 0, // 气泵
  LIQUID1 = 1, // 液泵1
  LIQUID2 = 2, // 液泵2
  STOP = 255 // 停止
}

/**
 * 通道号枚举
 */
export enum Channel {
  CH1 = 1,
  CH2 = 2
}

/**
 * 设备状态接口
 */
export interface DeviceState {
  hardwareVersion: string
  firmwareVersion: string
  name: string
  channels: {
    ch1: ChannelState
    ch2: ChannelState
  }
}

/**
 * 单个通道状态
 */
export interface ChannelState {
  pumpType: PumpType
  pwm: number
  isRunning: boolean
}

/**
 * 循环状态接口
 */
export interface LoopStatus {
  ch1?: LoopChannelStatus
  ch2?: LoopChannelStatus
}

/**
 * 单通道循环状态
 */
export interface LoopChannelStatus {
  state: number // 0: 停止, 1: 运行中, 2: 暂停
  current: number // 当前执行的指令索引
  total: number // 总指令数
  loopCount: number // 当前循环次数
  maxLoops: number // 最大循环次数 (0 = 无限循环)
}

/**
 * 循环指令项
 */
export interface LoopStep {
  id: string
  channel: Channel // 1 或 2
  pumpType: PumpType
  pwm: number
  time: number
}

/**
 * 时间轴时间段
 */
export interface TimelineSegment {
  id: string
  channelId: 'ch1' | 'ch2'
  startTime: number
  endTime: number
  pumpType: PumpType
  pwm: number
}

/**
 * 时间轴配置
 */
export interface TimelineConfig {
  totalDuration: number // 总时长（毫秒）
  loopCount: number // 循环次数（0 = 无限循环）
  interval: number // 时间间隔（毫秒）
  infiniteLoop?: boolean // 是否无限循环
}

/**
 * 时间轴执行进度
 */
export interface TimelineProgress {
  progress: number
  currentSegmentIndex: number
  totalSegments: number
  currentLoop: number
  remainingTime: number
  ch1Status: LoopChannelStatus | null
  ch2Status: LoopChannelStatus | null
}

/**
 * 协议数据帧
 */
export interface ProtocolFrame {
  header: [number, number] // [0xAA, 0x55]
  command: ProtocolCommand
  length: number
  data?: number[]
  crc8?: number
}

// ==================== 串口相关类型 ====================

/**
 * 串口连接信息
 */
export interface SerialConnectionInfo {
  connected: boolean
  port?: SerialPort
  baudRate?: number
}

/**
 * 串口写入器
 */
export type SerialWriter = (data: Uint8Array) => Promise<void>

// ==================== 日志相关类型 ====================

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 日志条目
 */
export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
}

// ==================== 固件相关类型 ====================

/**
 * 固件信息
 */
export interface FirmwareInfo {
  name: string
  version: string
  date: string
  fileName: string
  fileSize: number
  description: string
  filePath: string
}

/**
 * 固件上传进度
 */
export interface UploadProgress {
  total: number
  written: number
  percentage: number
  speed: number // KB/s
  elapsedTime: number // 毫秒
}

// ==================== 时间轴执行器回调类型 ====================

/**
 * 时间轴执行器回调
 */
export interface TimelineCallbacks {
  onStart?: () => void
  onProgress?: (progress: TimelineProgress) => void
  onSegmentChange?: (segment: TimelineSegment) => void
  onSegmentStart?: (segment: any) => void
  onLoopComplete?: (data: { loop: number; total: number }) => void
  onComplete?: () => void
  onError?: (error: string) => void
}

// ==================== 工具函数类型 ====================

/**
 * CRC8 计算函数
 */
export type Crc8Calculator = (buffer: Uint8Array) => number

/**
 * 协议编码函数
 */
export type ProtocolEncoder = (
  command: ProtocolCommand,
  data?: number[]
) => Uint8Array

/**
 * 协议解码函数
 */
export type ProtocolDecoder = (frame: Uint8Array) => ProtocolFrame | null

export {}
