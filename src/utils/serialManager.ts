/**
 * 串口管理器
 * 基于 Web Serial API 实现串口通信
 */

import { parseResponse, ParseResult } from './protocol'
import { useLogStore } from '@/stores/log'

/**
 * 数据接收回调函数类型
 */
export type DataCallback = (result: ParseResult) => void

/**
 * 错误回调函数类型
 */
export type ErrorCallback = (error: Error) => void

/**
 * 状态变化回调函数类型
 */
export type StatusChangeCallback = (connected: boolean) => void

/**
 * 串口管理器类
 */
export class SerialManager {
  private port: SerialPort | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private connected = false
  private baudRate = 115200

  // 接收缓冲区
  private receiveBuffer: number[] = []

  // 回调函数
  private onDataCallback: DataCallback | null = null
  private onErrorCallback: ErrorCallback | null = null
  private onStatusChangeCallback: StatusChangeCallback | null = null

  // 接收循环控制
  private reading = false

  // 日志
  private logStore: ReturnType<typeof useLogStore> | null = null

  /**
   * 检查浏览器是否支持 Web Serial API
   */
  static isSupported(): boolean {
    return 'serial' in navigator
  }

  /**
   * 请求并连接串口
   * @param autoStartReading - 是否自动启动接收循环（默认true）
   */
  async connect(autoStartReading = true): Promise<boolean> {
    try {
      // 初始化日志
      if (!this.logStore) {
        this.logStore = useLogStore()
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Web Serial API
      if (!('serial' in navigator)) {
        throw new Error('当前浏览器不支持 Web Serial API，请使用 Chrome 或 Edge 浏览器')
      }

      this.logStore.addInfoLog('正在请求串口...')

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Web Serial API
      // 请求串口
      this.port = await navigator.serial.requestPort()

      this.logStore.addInfoLog('串口已选择，正在连接...')

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Web Serial API
      // 打开串口
      await this.port.open({ baudRate: this.baudRate })

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Web Serial API
      // 创建读写流
      this.reader = this.port.readable.getReader()
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Web Serial API
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
      const err = error as Error
      this.logStore?.addErrorLog('串口连接失败: ' + err.message)
      this._notifyError(err)
      return false
    }
  }

  /**
   * 手动启动接收循环
   */
  startReading(): void {
    if (!this.reading && this.connected) {
      this._startReading()
      console.log('接收循环已启动')
      this.logStore?.addInfoLog('接收循环已启动')
    }
  }

  /**
   * 断开串口连接
   */
  async disconnect(): Promise<void> {
    try {
      this.reading = false

      // 释放 reader
      if (this.reader) {
        try {
          await this.reader.cancel()
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Web Serial API
          // 安全地等待 lock.reading 完成
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          if (this.reader.lock && this.reader.lock.reading) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            await this.reader.lock.reading
              .then(() => {
                if (this.reader) {
                  return this.reader.releaseLock()
                }
              })
              // eslint-disable-next-line @typescript-eslint/no-empty-function
              .catch(() => {})
          } else {
            // 如果没有 lock，直接释放
            try {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              await this.reader.releaseLock()
            } catch {
              // 忽略错误
            }
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
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Web Serial API
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
      const err = error as Error
      this.logStore?.addErrorLog('断开串口时出错: ' + err.message)
      this._notifyError(err)
    }
  }

  /**
   * 发送数据帧
   * @param frame - 完整的数据帧
   */
  async send(frame: Uint8Array): Promise<boolean> {
    if (!this.connected || !this.writer) {
      console.error('串口未连接')
      this.logStore?.addErrorLog('串口未连接，无法发送数据')
      return false
    }

    try {
      await this.writer.write(frame)
      const hexStr = this._formatHex(frame)
      console.log('发送:', hexStr)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - logStore methods
      this.logStore?.addSendLog('发送命令', frame)
      return true
    } catch (error) {
      console.error('发送数据失败:', error)
      const err = error as Error
      this.logStore?.addErrorLog('发送数据失败: ' + err.message)
      this._notifyError(err)
      return false
    }
  }

  /**
   * 清空串口接收缓冲区
   */
  async clearBuffer(): Promise<void> {
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
      const err = error as Error
      this.logStore?.addErrorLog('清空缓存失败: ' + err.message)
    }
  }

  /**
   * 强力清空串口缓存（用于过滤初始化信息）
   * 持续读取并丢弃所有数据，直到没有更多数据
   */
  async clearBufferThoroughly(): Promise<void> {
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
          const result = (await Promise.race([readPromise, timeoutPromise])
            .catch(err => {
              if (err instanceof Error && err.message === 'timeout') {
                return { value: null, done: false }
              }
              throw err
            })) as ReadableStreamReadResult<Uint8Array> | { value: null; done: boolean }

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
      const err = error as Error
      this.logStore?.addErrorLog('清空缓存失败: ' + err.message)
    }
  }

  /**
   * 启动接收循环
   */
  private async _startReading(): Promise<void> {
    this.reading = true
    this.receiveBuffer = []

    while (this.reading && this.connected && this.reader) {
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
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - logStore methods
          this.logStore?.addReceiveLog('接收数据', value)

          // 尝试解析完整帧
          this._parseReceivedData()
        }
      } catch (error) {
        if (this.reading) {
          console.error('读取串口数据时出错:', error)
          const err = error as Error
          this._notifyError(err)
        }
        break
      }
    }
  }

  /**
   * 解析接收缓冲区中的数据
   */
  private _parseReceivedData(): void {
    while (this.receiveBuffer.length >= 5) {
      // 查找帧头
      let frameStart = -1
      for (let i = 0; i < this.receiveBuffer.length - 1; i++) {
        if (this.receiveBuffer[i] === 0xaa && this.receiveBuffer[i + 1] === 0x55) {
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
          // MODE_CONFLICT (0x08) 错误不记录日志（循环模式下手动控制的错误）
          if (result.error !== 0x08) {
            this.logStore?.addErrorLog(`命令执行失败: 错误码 0x${result.error.toString(16)}`)
          }
        } else {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - logStore methods
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
   */
  onData(callback: DataCallback): void {
    this.onDataCallback = callback
  }

  /**
   * 设置错误回调
   */
  onError(callback: ErrorCallback): void {
    this.onErrorCallback = callback
  }

  /**
   * 设置状态变化回调
   */
  onStatusChange(callback: StatusChangeCallback): void {
    this.onStatusChangeCallback = callback
  }

  /**
   * 通知状态变化
   */
  private _notifyStatusChange(connected: boolean): void {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(connected)
    }
  }

  /**
   * 通知错误
   */
  private _notifyError(error: Error): void {
    if (this.onErrorCallback) {
      this.onErrorCallback(error)
    }
  }

  /**
   * 格式化字节数组为十六进制字符串
   */
  private _formatHex(data: Uint8Array): string {
    return Array.from(data)
      .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ')
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.connected
  }
}

// 创建全局单例
export const serialManager = new SerialManager()
