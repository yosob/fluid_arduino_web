/**
 * 日志状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 日志类型
 */
export type LogType = 'send' | 'receive' | 'info' | 'error' | 'success'

/**
 * 日志条目接口
 */
export interface LogEntry {
  id: number
  timestamp: Date
  type: LogType
  message: string
  data: Uint8Array | null
}

export const useLogStore = defineStore('log', () => {
  // 日志条目
  const logs = ref<LogEntry[]>([])
  const maxLogs = 500 // 最多保留 500 条日志

  /**
   * 添加日志
   */
  function addLog(type: LogType, message: string, data: Uint8Array | null = null): void {
    const log: LogEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      type,
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
  function addSendLog(message: string, data: Uint8Array | null = null): void {
    addLog('send', message, data)
  }

  /**
   * 添加接收日志
   */
  function addReceiveLog(message: string, data: Uint8Array | null = null): void {
    addLog('receive', message, data)
  }

  /**
   * 添加信息日志
   */
  function addInfoLog(message: string, data: Uint8Array | null = null): void {
    addLog('info', message, data)
  }

  /**
   * 添加错误日志
   */
  function addErrorLog(message: string, data: Uint8Array | null = null): void {
    addLog('error', message, data)
  }

  /**
   * 添加成功日志
   */
  function addSuccessLog(message: string, data: Uint8Array | null = null): void {
    addLog('success', message, data)
  }

  /**
   * 清空日志
   */
  function clearLogs(): void {
    logs.value = []
  }

  /**
   * 格式化字节数组为十六进制字符串
   */
  function formatHex(data: Uint8Array | null): string {
    if (!data) return ''
    const bytes = new Uint8Array(data)
    return Array.from(bytes)
      .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ')
  }

  /**
   * 获取日志类型颜色
   */
  function getLogTypeColor(type: LogType): string {
    const colors: Record<LogType, string> = {
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
