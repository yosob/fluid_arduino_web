/**
 * 连接状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface DeviceInfo {
  hardwareVersion: string
  firmwareVersion: string
  name: string
}

export const useConnectionStore = defineStore('connection', () => {
  // 连接状态
  const connected = ref<boolean>(false)
  const connecting = ref<boolean>(false)

  // 设备信息
  const deviceInfo = ref<DeviceInfo>({
    hardwareVersion: '-',
    firmwareVersion: '-',
    name: '-'
  })

  // 心跳状态
  const heartbeatEnabled = ref<boolean>(true)
  const lastHeartbeatTime = ref<number | null>(null)
  const heartbeatTimeout = ref<boolean>(false)

  // 错误信息
  const lastError = ref<Error | null>(null)

  /**
   * 设置连接状态
   */
  function setConnected(status: boolean): void {
    connected.value = status
    if (!status) {
      // 断开连接时重置设备信息
      deviceInfo.value = {
        hardwareVersion: '-',
        firmwareVersion: '-',
        name: '-'
      }
      heartbeatTimeout.value = false
    }
  }

  /**
   * 设置连接中状态
   */
  function setConnecting(status: boolean): void {
    connecting.value = status
  }

  /**
   * 更新设备信息
   */
  function updateDeviceInfo(info: DeviceInfo): void {
    deviceInfo.value = info
  }

  /**
   * 设置心跳使能
   */
  function setHeartbeatEnabled(enabled: boolean): void {
    heartbeatEnabled.value = enabled
  }

  /**
   * 更新心跳时间
   */
  function updateHeartbeatTime(): void {
    lastHeartbeatTime.value = Date.now()
    heartbeatTimeout.value = false
  }

  /**
   * 设置心跳超时
   */
  function setHeartbeatTimeout(): void {
    heartbeatTimeout.value = true
  }

  /**
   * 设置错误信息
   */
  function setError(error: Error): void {
    lastError.value = error
  }

  /**
   * 清除错误信息
   */
  function clearError(): void {
    lastError.value = null
  }

  return {
    // 状态
    connected,
    connecting,
    deviceInfo,
    heartbeatEnabled,
    lastHeartbeatTime,
    heartbeatTimeout,
    lastError,

    // 方法
    setConnected,
    setConnecting,
    updateDeviceInfo,
    setHeartbeatEnabled,
    updateHeartbeatTime,
    setHeartbeatTimeout,
    setError,
    clearError
  }
})
