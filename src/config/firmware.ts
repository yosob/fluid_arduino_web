/**
 * 固件配置
 */
import type { FirmwareInfo } from '@/types'

export const FIRMWARE_INFO: FirmwareInfo = {
  name: 'fluid V1.0',
  version: '1.0.0',
  date: '2025-01-14',
  fileName: 'fluid_v1.hex',
  fileSize: 20 * 1024, // 20 KB
  description: '液动控制系统官方固件，包含循环模式、心跳保活等功能',
  filePath: '/firmware/fluid_v1.hex' // 相对于 public 目录
}

// 固件文件路径（用于 fetch）
export const FIRMWARE_PATH = '/firmware/fluid_v1.hex'
