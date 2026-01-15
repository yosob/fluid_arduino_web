/**
 * CRC8 校验算法
 * 多项式: 0x07 (x^8 + x^2 + x + 1)
 * 初始值: 0x00
 * 用于通讯协议数据校验
 */

/**
 * 计算 CRC8 校验值
 * @param {Uint8Array|Array} data - 需要校验的数据
 * @returns {number} CRC8 校验值 (0-255)
 */
export function calcCRC8(data) {
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

/**
 * 验证数据的 CRC8 校验值
 * @param {Uint8Array|Array} data - 原始数据（不包含校验值）
 * @param {number} crcReceived - 接收到的校验值
 * @returns {boolean} 校验是否通过
 */
export function verifyCRC8(data, crcReceived) {
  const crcCalculated = calcCRC8(data)
  return crcCalculated === crcReceived
}
