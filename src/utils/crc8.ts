/**
 * CRC8 校验算法
 * 多项式: 0x07 (x^8 + x^2 + x + 1)
 * 初始值: 0x00
 * 用于通讯协议数据校验
 */

import type { Crc8Calculator } from '@/types'

/**
 * 计算 CRC8 校验值
 * @param data - 需要校验的数据
 * @returns CRC8 校验值 (0-255)
 */
export const calcCRC8: Crc8Calculator = (data: Uint8Array | number[]): number => {
  let crc = 0x00

  for (const byte of data) {
    crc ^= byte

    for (let i = 0; i < 8; i++) {
      if (crc & 0x80) {
        crc = (crc << 1) ^ 0x07
      } else {
        crc <<= 1
      }
      crc &= 0xff
    }
  }

  return crc
}

/**
 * 验证数据的 CRC8 校验值
 * @param data - 原始数据（不包含校验值）
 * @param crcReceived - 接收到的校验值
 * @returns 校验是否通过
 */
export function verifyCRC8(data: Uint8Array | number[], crcReceived: number): boolean {
  const crcCalculated = calcCRC8(Array.isArray(data) ? new Uint8Array(data) : data)
  return crcCalculated === crcReceived
}
