/**
 * 连接状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConnectionStore = defineStore('connection', () => {
  // 连接状态
  const connected = ref(false)
  const connecting = ref(false)

  // 设备信息
  const deviceInfo = ref({
    hardwareVersion: '-',
    firmwareVersion: '-',
    name: '-'
  })

  // 心跳状态
  const heartbeatEnabled = ref(true)
  const lastHeartbeatTime = ref(null)
  const heartbeatTimeout = ref(false)

  // 错误信息
  const lastError = ref(null)

  /**
   * 设置连接状态
   */
  function setConnected(status) {
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
  function setConnecting(status) {
    connecting.value = status
  }

  /**
   * 更新设备信息
   */
  function updateDeviceInfo(info) {
    deviceInfo.value = info
  }

  /**
   * 设置心跳使能
   */
  function setHeartbeatEnabled(enabled) {
    heartbeatEnabled.value = enabled
  }

  /**
   * 更新心跳时间
   */
  function updateHeartbeatTime() {
    lastHeartbeatTime.value = Date.now()
    heartbeatTimeout.value = false
  }

  /**
   * 设置心跳超时
   */
  function setHeartbeatTimeout() {
    heartbeatTimeout.value = true
  }

  /**
   * 设置错误信息
   */
  function setError(error) {
    lastError.value = error
  }

  /**
   * 清除错误信息
   */
  function clearError() {
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
