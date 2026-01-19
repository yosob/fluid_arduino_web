/**
 * 通讯协议封装
 * 帧格式: [0xAA][0x55][CMD][LEN][DATA...][CRC8]
 */

import { calcCRC8 } from './crc8'
import {
  ProtocolCommand,
  Channel,
  PumpType,
  LoopChannelStatus
} from '@/types'

// ==================== 常量定义 ====================

/**
 * 命令码枚举（已弃用，请使用 types 中的 ProtocolCommand）
 * @deprecated 使用 ProtocolCommand 枚举代替
 */
export const CMD = {
  // 下行命令（上位机→下位机）
  SET_PUMP: 0x10,
  STOP_CHANNEL: 0x11,
  STOP_ALL: 0x12,
  LOOP_ADD: 0x14,
  LOOP_CLEAR: 0x15,
  LOOP_START: 0x16,
  LOOP_STOP: 0x17,
  LOOP_PAUSE: 0x18,
  LOOP_RESUME: 0x19,
  GET_VERSION: 0x20,
  GET_STATUS: 0x21,
  GET_LOOP_STATUS: 0x22,

  // 上行命令（下位机→上位机）
  VERSION_RSP: 0x30,
  STATUS_RSP: 0x31,
  LOOP_STATUS_RSP: 0x32,
  ACK: 0x40,
  NACK: 0x41,

  // 双向命令
  HEARTBEAT: 0x50
} as const

/**
 * 通道号常量（已弃用，请使用 types 中的 Channel 枚举）
 * @deprecated 使用 Channel 枚举代替
 */
export const CHANNEL = {
  CH1: 1,
  CH2: 2
} as const

/**
 * 泵类型常量（已弃用，请使用 types 中的 PumpType 枚举）
 * @deprecated 使用 PumpType 枚举代替
 */
export const PUMP_TYPE = {
  AIR: 0,
  WATER1: 1,
  WATER2: 2
} as const

/**
 * 工作模式枚举
 */
export enum WorkMode {
  MANUAL = 0,
  LOOP = 1,
  STOP = 2
}

/**
 * 错误码枚举
 */
export enum ErrorCode {
  CRC_ERROR = 0x01,
  CMD_NOT_SUPPORTED = 0x02,
  PARAM_ERROR = 0x03,
  CHANNEL_ERROR = 0x04,
  PUMP_TYPE_ERROR = 0x05,
  HARDWARE_ERROR = 0x06,
  LOOP_TABLE_FULL = 0x07,
  MODE_CONFLICT = 0x08,
  PUMP_CONFLICT = 0x09
}

// ==================== 类型定义 ====================

/**
 * 协议解析结果
 */
export interface ParseResult {
  cmd: number
  data: Uint8Array | null
  error: number | null
}

/**
 * 版本信息
 */
export interface VersionInfo {
  hardwareVersion: string
  firmwareVersion: string
  name: string
}

/**
 * 状态响应
 */
export interface StatusResponse {
  mode: number
  channels: Record<string, ChannelStatus>
}

/**
 * 通道状态
 */
export interface ChannelStatus {
  activePump: number
  isRunning: boolean
  pwm: number
}

/**
 * 循环状态响应（双通道）
 */
export interface LoopStatusResponse {
  ch1: LoopChannelStatus
  ch2: LoopChannelStatus
}

// ==================== 核心函数 ====================

/**
 * 构建完整的数据帧
 * @param cmd - 命令码
 * @param data - 数据字段
 * @returns 完整帧
 */
export function buildFrame(cmd: number, data: number[] = []): Uint8Array {
  const frame = [
    0xaa, // 帧头1
    0x55, // 帧头2
    cmd, // 命令
    data.length, // 长度
    ...data // 数据
  ]

  // 计算 CRC（校验范围：命令 + 长度 + 数据）
  const crc = calcCRC8(new Uint8Array(frame.slice(2)))
  frame.push(crc)

  return new Uint8Array(frame)
}

/**
 * 解析响应数据
 * @param buffer - 接收缓冲区
 * @returns 解析结果
 */
export function parseResponse(buffer: Uint8Array): ParseResult | null {
  if (buffer.length < 5) {
    return null // 最小帧长度检查
  }

  // 检查帧头
  if (buffer[0] !== 0xaa || buffer[1] !== 0x55) {
    return null
  }

  const cmd = buffer[2]
  const len = buffer[3]

  // 检查帧完整性
  if (buffer.length < 5 + len) {
    return null
  }

  // 提取数据
  const data = buffer.slice(4, 4 + len)
  const crcReceived = buffer[4 + len]

  // 校验 CRC
  const crcCalculated = calcCRC8(buffer.slice(2, 4 + len))
  if (crcReceived !== crcCalculated) {
    console.error(`CRC校验失败: 接收=${crcReceived.toString(16)}, 计算=${crcCalculated.toString(16)}`)
    return {
      cmd,
      data: null,
      error: ErrorCode.CRC_ERROR
    }
  }

  // 处理 NACK 响应
  if (cmd === CMD.NACK) {
    const originalCmd = data[0]
    const errorCode = data[1]
    return {
      cmd: originalCmd,
      data: null,
      error: errorCode
    }
  }

  return {
    cmd,
    data,
    error: null
  }
}

// ==================== 命令构建函数 ====================

/**
 * 构建启动泵命令
 * @param channel - 通道号 (1-2)
 * @param pumpType - 泵类型
 * @param pwm - PWM值 (0-255)
 * @returns 完整帧
 */
export function buildSetPumpCommand(channel: Channel, pumpType: PumpType, pwm: number): Uint8Array {
  const data = [channel, pumpType, pwm]
  return buildFrame(ProtocolCommand.SET_PUMP, data)
}

/**
 * 构建停止通道命令
 * @param channel - 通道号 (1-2)
 * @returns 完整帧
 */
export function buildStopChannelCommand(channel: Channel): Uint8Array {
  const data = [channel]
  return buildFrame(ProtocolCommand.STOP_CHANNEL, data)
}

/**
 * 构建紧急停止命令
 * @returns 完整帧
 */
export function buildStopAllCommand(): Uint8Array {
  return buildFrame(ProtocolCommand.STOP_ALL, [])
}

/**
 * 构建心跳包
 * @param sequence - 序列号 (0-255)
 * @param enabled - 是否使能超时检测
 * @returns 完整帧
 */
export function buildHeartbeatCommand(sequence: number, enabled = true): Uint8Array {
  const data = [sequence, enabled ? 1 : 0]
  return buildFrame(ProtocolCommand.HEARTBEAT, data)
}

/**
 * 构建获取版本信息命令
 * @returns 完整帧
 */
export function buildGetVersionCommand(): Uint8Array {
  return buildFrame(ProtocolCommand.GET_VERSION, [])
}

/**
 * 构建获取状态命令
 * @returns 完整帧
 */
export function buildGetStatusCommand(): Uint8Array {
  const data = [0] // 掩码（预留）
  return buildFrame(ProtocolCommand.GET_STATUS, data)
}

/**
 * 构建获取循环状态命令
 * @returns 完整帧
 */
export function buildGetLoopStatusCommand(): Uint8Array {
  return buildFrame(ProtocolCommand.GET_LOOP_STATUS, [])
}

/**
 * 构建添加循环时序指令
 * @param channel - 通道号 (1-2)
 * @param pumpType - 泵类型 (0-2, 255=停止)
 * @param pwm - PWM值 (0-255)
 * @param time - 持续时间 (毫秒)
 * @returns 完整帧
 */
export function buildLoopAddCommand(
  channel: Channel,
  pumpType: PumpType,
  pwm: number,
  time: number
): Uint8Array {
  const timeH = (time >> 8) & 0xff
  const timeL = time & 0xff
  const data = [channel, pumpType, pwm, timeH, timeL]
  return buildFrame(ProtocolCommand.LOOP_ADD, data)
}

/**
 * 构建清空循环时序表命令
 * @returns 完整帧
 */
export function buildLoopClearCommand(): Uint8Array {
  return buildFrame(ProtocolCommand.LOOP_CLEAR, [])
}

/**
 * 构建开始循环执行命令
 * @param loopCount - 循环次数 (0=无限循环)
 * @returns 完整帧
 */
export function buildLoopStartCommand(loopCount = 0): Uint8Array {
  const data = [loopCount]
  return buildFrame(ProtocolCommand.LOOP_START, data)
}

/**
 * 构建停止循环执行命令
 * @returns 完整帧
 */
export function buildLoopStopCommand(): Uint8Array {
  return buildFrame(ProtocolCommand.LOOP_STOP, [])
}

/**
 * 构建暂停循环执行命令
 * @returns 完整帧
 */
export function buildLoopPauseCommand(): Uint8Array {
  return buildFrame(ProtocolCommand.LOOP_PAUSE, [])
}

/**
 * 构建继续循环执行命令
 * @returns 完整帧
 */
export function buildLoopResumeCommand(): Uint8Array {
  return buildFrame(ProtocolCommand.LOOP_RESUME, [])
}

// ==================== 响应解析函数 ====================

/**
 * 解析版本信息响应
 * @param data - 数据字段
 * @returns 版本信息
 */
export function parseVersionResponse(data: Uint8Array): VersionInfo {
  const hwVersion = data[0]
  const fwVersion = data[1]
  const nameLen = data[2]
  const name = String.fromCharCode(...data.slice(3, 3 + nameLen))

  return {
    hardwareVersion: `${(hwVersion >> 4) & 0x0f}.${hwVersion & 0x0f}`,
    firmwareVersion: `${(fwVersion >> 4) & 0x0f}.${fwVersion & 0x0f}`,
    name
  }
}

/**
 * 解析状态响应
 * @param data - 数据字段
 * @returns 状态信息
 */
export function parseStatusResponse(data: Uint8Array): StatusResponse {
  const mode = data[0]
  const channels: Record<string, ChannelStatus> = {}

  // 解析每个通道（每个通道3字节）
  for (let i = 1; i < data.length; i += 4) {
    const ch = data[i]
    const pump = data[i + 1]
    const state = data[i + 2]
    const pwm = data[i + 3]

    channels[`ch${ch}`] = {
      activePump: pump,
      isRunning: state === 1,
      pwm
    }
  }

  return { mode, channels }
}

/**
 * 解析循环状态响应 (v1.3 双通道)
 * @param data - 数据字段 (10字节)
 * @returns 双通道循环状态
 */
export function parseLoopStatusResponse(data: Uint8Array): LoopStatusResponse {
  // v1.3: 双通道状态，每个通道5字节，共10字节
  return {
    ch1: {
      state: data[0], // 0=停止, 1=运行, 2=暂停
      current: data[1], // 当前执行第几条 (1-based)
      total: data[2], // 总指令数
      loopCount: data[3], // 已循环次数
      maxLoops: data[4] // 最大循环次数 (0=无限)
    },
    ch2: {
      state: data[5],
      current: data[6],
      total: data[7],
      loopCount: data[8],
      maxLoops: data[9]
    }
  }
}
