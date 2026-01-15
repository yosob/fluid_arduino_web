/**
 * 通讯协议封装
 * 帧格式: [0xAA][0x55][CMD][LEN][DATA...][CRC8]
 */

import { calcCRC8 } from './crc8.js'

// 命令码定义
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
  SET_MODE: 0x1A,
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
}

// 通道号
export const CHANNEL = {
  CH1: 1,
  CH2: 2
}

// 泵类型
export const PUMP_TYPE = {
  AIR: 0,
  WATER1: 1,
  WATER2: 2
}

// 工作模式
export const WORK_MODE = {
  MANUAL: 0,
  LOOP: 1,
  STOP: 2
}

// 错误码
export const ERROR_CODE = {
  CRC_ERROR: 0x01,
  CMD_NOT_SUPPORTED: 0x02,
  PARAM_ERROR: 0x03,
  CHANNEL_ERROR: 0x04,
  PUMP_TYPE_ERROR: 0x05,
  HARDWARE_ERROR: 0x06,
  LOOP_TABLE_FULL: 0x07,
  MODE_CONFLICT: 0x08,
  PUMP_CONFLICT: 0x09
}

/**
 * 构建完整的数据帧
 * @param {number} cmd - 命令码
 * @param {Uint8Array|Array} data - 数据字段
 * @returns {Uint8Array} 完整帧
 */
export function buildFrame(cmd, data = []) {
  const frame = [
    0xAA, // 帧头1
    0x55, // 帧头2
    cmd,  // 命令
    data.length, // 长度
    ...data // 数据
  ]

  // 计算 CRC（校验范围：命令 + 长度 + 数据）
  const crc = calcCRC8(frame.slice(2))
  frame.push(crc)

  return new Uint8Array(frame)
}

/**
 * 解析响应数据
 * @param {Uint8Array} buffer - 接收缓冲区
 * @returns {Object|null} 解析结果 { cmd, data, error }
 */
export function parseResponse(buffer) {
  if (buffer.length < 5) {
    return null // 最小帧长度检查
  }

  // 检查帧头
  if (buffer[0] !== 0xAA || buffer[1] !== 0x55) {
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
      error: ERROR_CODE.CRC_ERROR
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

/**
 * 构建启动泵命令
 * @param {number} channel - 通道号 (1-2)
 * @param {number} pumpType - 泵类型 (0-2)
 * @param {number} pwm - PWM值 (0-255)
 * @returns {Uint8Array} 完整帧
 */
export function buildSetPumpCommand(channel, pumpType, pwm) {
  const data = [channel, pumpType, pwm]
  return buildFrame(CMD.SET_PUMP, data)
}

/**
 * 构建停止通道命令
 * @param {number} channel - 通道号 (1-2)
 * @returns {Uint8Array} 完整帧
 */
export function buildStopChannelCommand(channel) {
  const data = [channel]
  return buildFrame(CMD.STOP_CHANNEL, data)
}

/**
 * 构建紧急停止命令
 * @returns {Uint8Array} 完整帧
 */
export function buildStopAllCommand() {
  return buildFrame(CMD.STOP_ALL, [])
}

/**
 * 构建心跳包
 * @param {number} sequence - 序列号 (0-255)
 * @param {boolean} enabled - 是否使能超时检测
 * @returns {Uint8Array} 完整帧
 */
export function buildHeartbeatCommand(sequence, enabled = true) {
  const data = [sequence, enabled ? 1 : 0]
  return buildFrame(CMD.HEARTBEAT, data)
}

/**
 * 构建获取版本信息命令
 * @returns {Uint8Array} 完整帧
 */
export function buildGetVersionCommand() {
  return buildFrame(CMD.GET_VERSION, [])
}

/**
 * 构建获取状态命令
 * @returns {Uint8Array} 完整帧
 */
export function buildGetStatusCommand() {
  const data = [0] // 掩码（预留）
  return buildFrame(CMD.GET_STATUS, data)
}

/**
 * 构建获取循环状态命令
 * @returns {Uint8Array} 完整帧
 */
export function buildGetLoopStatusCommand() {
  return buildFrame(CMD.GET_LOOP_STATUS, [])
}

/**
 * 构建添加循环时序指令
 * @param {number} channel - 通道号 (1-2)
 * @param {number} pumpType - 泵类型 (0-2, 255=停止)
 * @param {number} pwm - PWM值 (0-255)
 * @param {number} time - 持续时间 (毫秒)
 * @returns {Uint8Array} 完整帧
 */
export function buildLoopAddCommand(channel, pumpType, pwm, time) {
  const timeH = (time >> 8) & 0xFF
  const timeL = time & 0xFF
  const data = [channel, pumpType, pwm, timeH, timeL]
  return buildFrame(CMD.LOOP_ADD, data)
}

/**
 * 构建清空循环时序表命令
 * @returns {Uint8Array} 完整帧
 */
export function buildLoopClearCommand() {
  return buildFrame(CMD.LOOP_CLEAR, [])
}

/**
 * 构建开始循环执行命令
 * @param {number} loopCount - 循环次数 (0=无限循环)
 * @returns {Uint8Array} 完整帧
 */
export function buildLoopStartCommand(loopCount = 0) {
  const data = [loopCount]
  return buildFrame(CMD.LOOP_START, data)
}

/**
 * 构建停止循环执行命令
 * @returns {Uint8Array} 完整帧
 */
export function buildLoopStopCommand() {
  return buildFrame(CMD.LOOP_STOP, [])
}

/**
 * 构建暂停循环执行命令
 * @returns {Uint8Array} 完整帧
 */
export function buildLoopPauseCommand() {
  return buildFrame(CMD.LOOP_PAUSE, [])
}

/**
 * 构建继续循环执行命令
 * @returns {Uint8Array} 完整帧
 */
export function buildLoopResumeCommand() {
  return buildFrame(CMD.LOOP_RESUME, [])
}

/**
 * 解析版本信息响应
 * @param {Uint8Array} data - 数据字段
 * @returns {Object} 版本信息 { hardwareVersion, firmwareVersion, name }
 */
export function parseVersionResponse(data) {
  const hwVersion = data[0]
  const fwVersion = data[1]
  const nameLen = data[2]
  const name = String.fromCharCode(...data.slice(3, 3 + nameLen))

  return {
    hardwareVersion: `${(hwVersion >> 4) & 0x0F}.${hwVersion & 0x0F}`,
    firmwareVersion: `${(fwVersion >> 4) & 0x0F}.${fwVersion & 0x0F}`,
    name
  }
}

/**
 * 解析状态响应
 * @param {Uint8Array} data - 数据字段
 * @returns {Object} 状态信息 { mode, channels }
 */
export function parseStatusResponse(data) {
  const mode = data[0]
  const channels = {}

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
 * 解析循环状态响应
 * @param {Uint8Array} data - 数据字段
 * @returns {Object} 循环状态 { state, currentIndex, totalSteps, loopCount, totalLoops }
 */
export function parseLoopStatusResponse(data) {
  return {
    state: data[0], // 0=停止, 1=运行, 2=暂停
    currentIndex: data[1],
    totalSteps: data[2],
    loopCount: data[3],
    totalLoops: data[4]
  }
}
