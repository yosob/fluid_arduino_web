/**
 * 日志状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLogStore = defineStore('log', () => {
  // 日志条目
  const logs = ref([])
  const maxLogs = 500 // 最多保留 500 条日志

  /**
   * 添加日志
   */
  function addLog(type, message, data = null) {
    const log = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      type, // 'send', 'receive', 'info', 'error', 'success'
      message,
      data
    }

    logs.value.unshift(log)

    // 限制日志数量
    if (logs.value.length > maxLogs) {
      logs.value = logs.value.slice(0, maxLogs)
    }
  }

  /**
   * 添加发送日志
   */
  function addSendLog(message, data = null) {
    addLog('send', message, data)
  }

  /**
   * 添加接收日志
   */
  function addReceiveLog(message, data = null) {
    addLog('receive', message, data)
  }

  /**
   * 添加信息日志
   */
  function addInfoLog(message, data = null) {
    addLog('info', message, data)
  }

  /**
   * 添加错误日志
   */
  function addErrorLog(message, data = null) {
    addLog('error', message, data)
  }

  /**
   * 添加成功日志
   */
  function addSuccessLog(message, data = null) {
    addLog('success', message, data)
  }

  /**
   * 清空日志
   */
  function clearLogs() {
    logs.value = []
  }

  /**
   * 格式化字节数组为十六进制字符串
   */
  function formatHex(data) {
    if (!data) return ''
    const bytes = new Uint8Array(data)
    return Array.from(bytes)
      .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ')
  }

  /**
   * 获取日志类型颜色
   */
  function getLogTypeColor(type) {
    const colors = {
      send: 'blue',
      receive: 'green',
      info: 'gray',
      error: 'red',
      success: 'success'
    }
    return colors[type] || 'gray'
  }

  return {
    logs,
    addLog,
    addSendLog,
    addReceiveLog,
    addInfoLog,
    addErrorLog,
    addSuccessLog,
    clearLogs,
    formatHex,
    getLogTypeColor
  }
})
