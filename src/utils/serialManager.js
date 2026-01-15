/**
 * 串口管理器
 * 基于 Web Serial API 实现串口通信
 */

import { parseResponse } from './protocol.js'
import { useLogStore } from '@/stores/log'

export class SerialManager {
  constructor() {
    this.port = null
    this.reader = null
    this.writer = null
    this.connected = false
    this.baudRate = 115200

    // 接收缓冲区
    this.receiveBuffer = []

    // 回调函数
    this.onDataCallback = null
    this.onErrorCallback = null
    this.onStatusChangeCallback = null

    // 接收循环控制
    this.reading = false

    // 日志
    this.logStore = null
  }

  /**
   * 检查浏览器是否支持 Web Serial API
   * @returns {boolean}
   */
  static isSupported() {
    return 'serial' in navigator
  }

  /**
   * 请求并连接串口
   * @param {boolean} autoStartReading - 是否自动启动接收循环（默认true）
   * @returns {Promise<boolean>}
   */
  async connect(autoStartReading = true) {
    try {
      // 初始化日志
      if (!this.logStore) {
        this.logStore = useLogStore()
      }

      if (!SerialManager.isSupported()) {
        throw new Error('当前浏览器不支持 Web Serial API，请使用 Chrome 或 Edge 浏览器')
      }

      this.logStore.addInfoLog('正在请求串口...')

      // 请求串口
      this.port = await navigator.serial.requestPort()

      this.logStore.addInfoLog('串口已选择，正在连接...')

      // 打开串口
      await this.port.open({ baudRate: this.baudRate })

      // 创建读写流
      this.reader = this.port.readable.getReader()
      this.writer = this.port.writable.getWriter()

      this.connected = true
      this._notifyStatusChange(true)

      // 只有在要求时才启动接收循环（让外部有时间清空缓存）
      if (autoStartReading) {
        this._startReading()
      }

      this.logStore.addSuccessLog('串口连接成功')
      console.log('串口连接成功')
      return true
    } catch (error) {
      console.error('串口连接失败:', error)
      this.logStore?.addErrorLog('串口连接失败: ' + error.message)
      this._notifyError(error)
      return false
    }
  }

  /**
   * 手动启动接收循环
   */
  startReading() {
    if (!this.reading && this.connected) {
      this._startReading()
      console.log('接收循环已启动')
      this.logStore?.addInfoLog('接收循环已启动')
    }
  }

  /**
   * 断开串口连接
   */
  async disconnect() {
    try {
      this.reading = false

      // 释放 reader
      if (this.reader) {
        try {
          await this.reader.cancel()
          // 安全地等待 lock.reading 完成
          if (this.reader.lock && this.reader.lock.reading) {
            await this.reader.lock.reading
              .then(() => {
                if (this.reader) {
                  return this.reader.releaseLock()
                }
              })
              .catch(() => {})
          } else {
            // 如果没有 lock，直接释放
            await this.reader.releaseLock().catch(() => {})
          }
        } catch (error) {
          console.warn('释放 reader 时出错:', error)
        }
        this.reader = null
      }

      // 释放 writer
      if (this.writer) {
        try {
          await this.writer.releaseLock()
        } catch (error) {
          console.warn('释放 writer 时出错:', error)
        }
        this.writer = null
      }

      // 关闭端口
      if (this.port) {
        try {
          await this.port.close()
        } catch (error) {
          console.warn('关闭端口时出错:', error)
        }
        this.port = null
      }

      this.connected = false
      this._notifyStatusChange(false)

      console.log('串口已断开')
      this.logStore?.addInfoLog('串口已断开')
    } catch (error) {
      console.error('断开串口时出错:', error)
      this.logStore?.addErrorLog('断开串口时出错: ' + error.message)
      this._notifyError(error)
    }
  }

  /**
   * 发送数据帧
   * @param {Uint8Array} frame - 完整的数据帧
   * @returns {Promise<boolean>}
   */
  async send(frame) {
    if (!this.connected || !this.writer) {
      console.error('串口未连接')
      this.logStore?.addErrorLog('串口未连接，无法发送数据')
      return false
    }

    try {
      await this.writer.write(frame)
      const hexStr = this._formatHex(frame)
      console.log('发送:', hexStr)
      this.logStore?.addSendLog('发送命令', frame)
      return true
    } catch (error) {
      console.error('发送数据失败:', error)
      this.logStore?.addErrorLog('发送数据失败: ' + error.message)
      this._notifyError(error)
      return false
    }
  }

  /**
   * 清空串口接收缓冲区
   * @returns {Promise<void>}
   */
  async clearBuffer() {
    try {
      // 只清空内部缓冲区，不读取串口（避免与接收循环冲突）
      const clearedBytes = this.receiveBuffer.length
      this.receiveBuffer = []

      if (clearedBytes > 0) {
        console.log(`清空内部缓冲区: ${clearedBytes} 字节`)
        this.logStore?.addInfoLog(`清空内部缓冲区: ${clearedBytes} 字节`)
      } else {
        console.log('内部缓冲区为空，无需清空')
        this.logStore?.addInfoLog('内部缓冲区为空')
      }
    } catch (error) {
      console.error('清空缓存失败:', error)
      this.logStore?.addErrorLog('清空缓存失败: ' + error.message)
    }
  }

  /**
   * 强力清空串口缓存（用于过滤初始化信息）
   * 持续读取并丢弃所有数据，直到没有更多数据
   * @returns {Promise<void>}
   */
  async clearBufferThoroughly() {
    try {
      if (!this.reader || !this.connected) {
        console.log('串口未连接，跳过清空')
        return
      }

      console.log('开始强力清空串口缓存...')
      this.logStore?.addInfoLog('开始清空初始化信息...')

      // 清空内部缓冲区
      this.receiveBuffer = []

      // 持续读取串口数据，直到没有更多数据（最多读取1秒）
      const startTime = Date.now()
      const maxDuration = 1000 // 最多读取1秒
      let totalCleared = 0

      while (Date.now() - startTime < maxDuration) {
        try {
          // 使用 Promise.race 实现超时保护
          const readTimeout = 100 // 单次读取超时100ms
          const readPromise = this.reader.read()

          // 创建超时 Promise
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), readTimeout)
          )

          // 等待读取或超时（先到者返回）
          const result = await Promise.race([readPromise, timeoutPromise])
            .catch(err => {
              if (err.message === 'timeout') {
                return { value: null, done: false }
              }
              throw err
            })

          if (!result) continue

          const { value, done } = result

          if (done) {
            console.log('串口已关闭')
            break
          }

          if (value && value.length > 0) {
            totalCleared += value.length
            console.log(`清空数据: ${this._formatHex(value)}`)
            this.logStore?.addInfoLog(`过滤初始化信息: ${value.length} 字节`)

            // 继续读取，看是否还有更多数据
            continue
          }

          // 没有数据了，退出
          break
        } catch (error) {
          // 读取超时或其他错误，视为没有更多数据
          console.log('读取超时或出错，退出清空')
          break
        }
      }

      // 再次清空内部缓冲区
      this.receiveBuffer = []

      console.log(`强力清空完成，共过滤 ${totalCleared} 字节`)
      this.logStore?.addSuccessLog(`清空完成，过滤 ${totalCleared} 字节初始化信息`)
    } catch (error) {
      console.error('强力清空缓存失败:', error)
      this.logStore?.addErrorLog('清空缓存失败: ' + error.message)
    }
  }

  /**
   * 启动接收循环
   * @private
   */
  async _startReading() {
    this.reading = true
    this.receiveBuffer = []

    while (this.reading && this.connected) {
      try {
        const { value, done } = await this.reader.read()

        if (done) {
          console.log('串口读取完成')
          break
        }

        if (value) {
          // 将接收到的字节添加到缓冲区
          for (const byte of value) {
            this.receiveBuffer.push(byte)
          }

          console.log('接收:', this._formatHex(value))
          this.logStore?.addReceiveLog('接收数据', value)

          // 尝试解析完整帧
          this._parseReceivedData()
        }
      } catch (error) {
        if (this.reading) {
          console.error('读取串口数据时出错:', error)
          this._notifyError(error)
        }
        break
      }
    }
  }

  /**
   * 解析接收缓冲区中的数据
   * @private
   */
  _parseReceivedData() {
    while (this.receiveBuffer.length >= 5) {
      // 查找帧头
      let frameStart = -1
      for (let i = 0; i < this.receiveBuffer.length - 1; i++) {
        if (this.receiveBuffer[i] === 0xAA && this.receiveBuffer[i + 1] === 0x55) {
          frameStart = i
          break
        }
      }

      // 未找到帧头，清空缓冲区
      if (frameStart === -1) {
        this.receiveBuffer = []
        break
      }

      // 丢弃帧头之前的数据
      if (frameStart > 0) {
        this.receiveBuffer = this.receiveBuffer.slice(frameStart)
        frameStart = 0
      }

      // 检查是否有足够的数据
      const len = this.receiveBuffer[3]
      const frameLength = 5 + len

      if (this.receiveBuffer.length < frameLength) {
        // 数据不完整，等待更多数据
        break
      }

      // 提取完整帧
      const frame = this.receiveBuffer.slice(0, frameLength)

      // 解析帧
      const result = parseResponse(new Uint8Array(frame))

      if (result) {
        if (result.error) {
          this.logStore?.addErrorLog(`命令执行失败: 错误码 0x${result.error.toString(16)}`)
        } else {
          this.logStore?.addSuccessLog(`收到响应: 命令 0x${result.cmd.toString(16)}`)
        }

        if (this.onDataCallback) {
          this.onDataCallback(result)
        }
      }

      // 移除已处理的帧
      this.receiveBuffer = this.receiveBuffer.slice(frameLength)
    }
  }

  /**
   * 设置数据接收回调
   * @param {Function} callback
   */
  onData(callback) {
    this.onDataCallback = callback
  }

  /**
   * 设置错误回调
   * @param {Function} callback
   */
  onError(callback) {
    this.onErrorCallback = callback
  }

  /**
   * 设置状态变化回调
   * @param {Function} callback
   */
  onStatusChange(callback) {
    this.onStatusChangeCallback = callback
  }

  /**
   * 通知状态变化
   * @param {boolean} connected
   * @private
   */
  _notifyStatusChange(connected) {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(connected)
    }
  }

  /**
   * 通知错误
   * @param {Error} error
   * @private
   */
  _notifyError(error) {
    if (this.onErrorCallback) {
      this.onErrorCallback(error)
    }
  }

  /**
   * 格式化字节数组为十六进制字符串
   * @param {Uint8Array} data
   * @returns {string}
   * @private
   */
  _formatHex(data) {
    return Array.from(data)
      .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ')
  }

  /**
   * 获取连接状态
   * @returns {boolean}
   */
  isConnected() {
    return this.connected
  }
}

// 创建全局单例
export const serialManager = new SerialManager()
