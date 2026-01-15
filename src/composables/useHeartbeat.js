/**
 * 心跳保活组合式函数
 */
import { ref, onUnmounted } from 'vue'
import { serialManager } from '@/utils/serialManager'
import { useConnectionStore } from '@/stores/connection'
import { buildHeartbeatCommand, CMD } from '@/utils/protocol'

export function useHeartbeat() {
  const connectionStore = useConnectionStore()

  const sequence = ref(0)
  const intervalId = ref(null)
  const timeoutId = ref(null)
  const HEARTBEAT_INTERVAL = 1000 // 1秒
  const HEARTBEAT_TIMEOUT = 3000 // 3秒超时

  /**
   * 发送心跳包
   */
  async function sendHeartbeat() {
    if (!serialManager.isConnected()) {
      return
    }

    const enabled = connectionStore.heartbeatEnabled
    const frame = buildHeartbeatCommand(sequence.value, enabled)
    await serialManager.send(frame)

    // 设置超时检测
    clearTimeout(timeoutId.value)
    timeoutId.value = setTimeout(() => {
      connectionStore.setHeartbeatTimeout()
      console.error('心跳超时，设备可能已断开')
    }, HEARTBEAT_TIMEOUT)

    // 序列号递增
    sequence.value = (sequence.value + 1) % 256
  }

  /**
   * 启动心跳
   */
  function start() {
    if (intervalId.value) {
      return // 已经在运行
    }

    // 立即发送一次
    sendHeartbeat()

    // 定时发送
    intervalId.value = setInterval(() => {
      sendHeartbeat()
    }, HEARTBEAT_INTERVAL)

    console.log('心跳已启动')
  }

  /**
   * 停止心跳
   */
  function stop() {
    if (intervalId.value) {
      clearInterval(intervalId.value)
      intervalId.value = null
    }

    if (timeoutId.value) {
      clearTimeout(timeoutId.value)
      timeoutId.value = null
    }

    console.log('心跳已停止')
  }

  /**
   * 重置心跳（重新开始）
   */
  function restart() {
    stop()
    start()
  }

  // 组件卸载时自动停止心跳
  onUnmounted(() => {
    stop()
  })

  return {
    // 状态
    sequence,

    // 方法
    start,
    stop,
    restart,
    sendHeartbeat
  }
}
