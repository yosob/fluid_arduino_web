/**
 * 串口通信组合式函数
 */
import { ref } from 'vue'
import { serialManager } from '@/utils/serialManager'
import { useConnectionStore } from '@/stores/connection'
import { useDeviceStore } from '@/stores/device'
import { useLogStore } from '@/stores/log'
import { useLoopStore } from '@/stores/loop'
import {
  buildGetVersionCommand,
  buildGetStatusCommand,
  buildGetLoopStatusCommand,
  parseVersionResponse,
  parseStatusResponse,
  parseLoopStatusResponse,
  CMD,
  ERROR_CODE
} from '@/utils/protocol'

export function useSerial() {
  const connectionStore = useConnectionStore()
  const deviceStore = useDeviceStore()
  const logStore = useLogStore()
  const loopStore = useLoopStore()

  const sequence = ref(0)

  // 状态轮询定时器
  let statusPollingInterval = null
  const STATUS_POLLING_INTERVAL = 1000 // 1秒轮询一次

  // 版本信息响应 resolve 函数
  let versionResolve = null
  let versionTimeout = null

  /**
   * 连接串口
   */
  async function connect() {
    connectionStore.setConnecting(true)
    connectionStore.clearError()

    // 设置回调
    serialManager.onData(handleResponse)
    serialManager.onError(handleError)
    serialManager.onStatusChange(handleStatusChange)

    // 1. 连接串口（不自动启动接收循环）
    const success = await serialManager.connect(false) // false = 不启动接收循环
    connectionStore.setConnecting(false)

    if (success) {
      // 2. 等待 3 秒，让设备完全初始化并发送完所有调试信息
      logStore.addInfoLog('等待设备初始化（3秒）...')
      await new Promise(resolve => setTimeout(resolve, 3000))

      // 3. 持续清空串口缓存（读取并丢弃所有初始化信息）
      await serialManager.clearBufferThoroughly()

      // 4. 再等待一小段时间，确保所有垃圾数据都被清空
      await new Promise(resolve => setTimeout(resolve, 500))

      // 5. 启动接收循环（现在可以开始接收正常的协议帧了）
      serialManager.startReading()

      // 6. 获取版本信息（等待真正收到响应）
      try {
        logStore.addInfoLog('正在获取版本信息...')
        const versionInfo = await getVersion()
        logStore.addSuccessLog(`版本信息获取成功: ${versionInfo.hardwareVersion}.${versionInfo.firmwareVersion} ${versionInfo.deviceName}`)
      } catch (error) {
        logStore.addErrorLog('获取版本信息失败: ' + error.message)
        // 即使失败也继续执行
      }

      // 7. 获取初始状态
      await getStatus()

      // 8. 启动状态轮询
      startStatusPolling()
    }

    return success
  }

  /**
   * 断开串口
   */
  async function disconnect() {
    // 停止状态轮询
    stopStatusPolling()
    await serialManager.disconnect()
    deviceStore.resetAllChannels()
  }

  /**
   * 启动状态轮询
   */
  function startStatusPolling() {
    if (statusPollingInterval) {
      return // 已经在运行
    }

    statusPollingInterval = setInterval(() => {
      if (serialManager.isConnected()) {
        getStatus()
      }
    }, STATUS_POLLING_INTERVAL)
  }

  /**
   * 停止状态轮询
   */
  function stopStatusPolling() {
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval)
      statusPollingInterval = null
    }
  }

  /**
   * 发送命令
   */
  async function sendCommand(frame) {
    return await serialManager.send(frame)
  }

  /**
   * 获取版本信息（等待响应，带重试机制）
   */
  async function getVersion() {
    const maxRetries = 3 // 最多重试3次
    const retryDelay = 500 // 每次重试间隔500ms

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logStore.addInfoLog(`获取版本信息（第 ${attempt}/${maxRetries} 次尝试）...`)

        const versionInfo = await new Promise(async (resolve, reject) => {
          // 保存 resolve 函数，在收到响应时调用
          versionResolve = resolve

          // 设置单次超时保护（1.5秒）
          versionTimeout = setTimeout(() => {
            versionResolve = null
            versionTimeout = null
            reject(new Error('单次尝试超时'))
          }, 1500)

          try {
            // 发送版本查询命令
            const frame = buildGetVersionCommand()
            await sendCommand(frame)

            // 等待响应（由 handleResponse 中调用 versionResolve）
          } catch (error) {
            clearTimeout(versionTimeout)
            versionResolve = null
            versionTimeout = null
            reject(error)
          }
        })

        // 成功获取版本信息
        return versionInfo

      } catch (error) {
        logStore.addInfoLog(`第 ${attempt} 次尝试失败: ${error.message}`)

        // 如果还有重试机会，等待后继续
        if (attempt < maxRetries) {
          logStore.addInfoLog(`等待 ${retryDelay}ms 后重试...`)
          await new Promise(res => setTimeout(res, retryDelay))
        } else {
          // 最后一次尝试也失败了
          throw new Error(`获取版本信息失败（已重试 ${maxRetries} 次）`)
        }
      }
    }
  }

  /**
   * 获取设备状态
   */
  async function getStatus() {
    const frame = buildGetStatusCommand()
    await sendCommand(frame)
  }

  /**
   * 获取循环状态
   */
  async function getLoopStatus() {
    const frame = buildGetLoopStatusCommand()
    await sendCommand(frame)
  }

  /**
   * 启动泵
   */
  async function startPump(channel, pumpType, pwm) {
    const frame = [
      0xAA, 0x55,
      CMD.SET_PUMP,
      0x03, // 长度
      channel,
      pumpType,
      pwm
    ]

    // 计算 CRC
    const crcData = frame.slice(2)
    const crc = calcCRC8(crcData)
    frame.push(crc)

    return await sendCommand(new Uint8Array(frame))
  }

  /**
   * 停止通道
   */
  async function stopChannel(channel) {
    const frame = [
      0xAA, 0x55,
      CMD.STOP_CHANNEL,
      0x01, // 长度
      channel
    ]

    // 计算 CRC
    const crcData = frame.slice(2)
    const crc = calcCRC8(crcData)
    frame.push(crc)

    return await sendCommand(new Uint8Array(frame))
  }

  /**
   * 紧急停止所有泵
   */
  async function stopAll() {
    const frame = [0xAA, 0x55, CMD.STOP_ALL, 0x00]
    const crc = calcCRC8(frame.slice(2))
    frame.push(crc)

    return await sendCommand(new Uint8Array(frame))
  }

  /**
   * 处理响应
   */
  function handleResponse(result) {
    if (!result) return

    const { cmd, data, error } = result

    if (error) {
      handleError(new Error(`命令执行失败: ${getErrorText(error)}`))
      return
    }

    // 处理不同命令的响应
    switch (cmd) {
      case CMD.VERSION_RSP:
        const versionInfo = parseVersionResponse(data)
        connectionStore.updateDeviceInfo(versionInfo)

        // 如果有等待的版本响应 resolve 函数，调用它
        if (versionResolve) {
          // 清除超时定时器
          if (versionTimeout) {
            clearTimeout(versionTimeout)
            versionTimeout = null
          }

          // 调用 resolve
          versionResolve(versionInfo)
          versionResolve = null
        }
        break

      case CMD.STATUS_RSP:
        const status = parseStatusResponse(data)
        deviceStore.updateWorkMode(status.mode)
        Object.keys(status.channels).forEach(ch => {
          deviceStore.updateChannel(ch, status.channels[ch])
        })

        // 如果是循环模式，主动查询循环状态
        if (status.mode === 1) {  // 1 = 循环模式
          getLoopStatus()
        }
        break

      case CMD.LOOP_STATUS_RSP:
        const loopStatus = parseLoopStatusResponse(data)
        loopStore.updateLoopStatus(loopStatus)
        break

      case CMD.ACK:
        // 命令执行成功
        console.log('命令执行成功')
        break

      case CMD.HEARTBEAT:
        // 心跳响应
        connectionStore.updateHeartbeatTime()
        break
    }
  }

  /**
   * 处理错误
   */
  function handleError(error) {
    console.error('串口错误:', error)
    connectionStore.setError(error.message)
  }

  /**
   * 处理状态变化
   */
  function handleStatusChange(connected) {
    connectionStore.setConnected(connected)
  }

  /**
   * 获取错误文本
   */
  function getErrorText(errorCode) {
    const errorMap = {
      [ERROR_CODE.CRC_ERROR]: 'CRC 校验错误',
      [ERROR_CODE.CMD_NOT_SUPPORTED]: '命令不支持',
      [ERROR_CODE.PARAM_ERROR]: '参数错误',
      [ERROR_CODE.CHANNEL_ERROR]: '通道号错误',
      [ERROR_CODE.PUMP_TYPE_ERROR]: '泵类型错误',
      [ERROR_CODE.HARDWARE_ERROR]: '硬件故障',
      [ERROR_CODE.LOOP_TABLE_FULL]: '时序表已满',
      [ERROR_CODE.MODE_CONFLICT]: '模式冲突',
      [ERROR_CODE.PUMP_CONFLICT]: '泵冲突'
    }
    return errorMap[errorCode] || `未知错误 (0x${errorCode.toString(16)})`
  }

  /**
   * 检查是否已连接
   */
  function isConnected() {
    return serialManager.isConnected()
  }

  return {
    // 状态
    sequence,

    // 方法
    connect,
    disconnect,
    sendCommand,
    getVersion,
    getStatus,
    getLoopStatus,
    startPump,
    stopChannel,
    stopAll,
    isConnected
  }
}

// CRC8 计算函数（需要在这里定义，避免循环依赖）
function calcCRC8(data) {
  let crc = 0x00
  for (let byte of data) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      if (crc & 0x80) {
        crc = (crc << 1) ^ 0x07
      } else {
        crc <<= 1
      }
      crc &= 0xFF
    }
  }
  return crc
}
