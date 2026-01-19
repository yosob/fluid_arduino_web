/**
 * avrgirl-arduino 全局库类型声明
 * 这是一个第三方库的浏览器版本，用于 Arduino 固件上传
 */

export interface AvrGirlArduino {
  flash: (options: FlashOptions) => Promise<void>
}

export interface FlashOptions {
  hex: string // 固件文件的 HEX 字符串内容
  port: SerialPort // Web Serial API 的 SerialPort 对象
  progress?: (progress: {
    total: number
    written: number
    percentage: number
  }) => void
  debug?: boolean // 是否输出调试信息
}

declare global {
  const AvrGirlArduino: AvrGirlArduino
}

export {}
