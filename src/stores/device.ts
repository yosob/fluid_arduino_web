/**
 * 设备状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 通道状态接口
 */
export interface ChannelState {
  activePump: number // 0=无, 1=气泵, 2=液泵1, 3=液泵2
  isRunning: boolean
  pwm: number
}

/**
 * 泵配置接口
 */
export interface PumpConfig {
  air: number
  water1: number
  water2: number
}

/**
 * 通道映射
 */
export type ChannelKey = 'ch1' | 'ch2'

/**
 * 泵类型键
 */
export type PumpKey = 'air' | 'water1' | 'water2'

export const useDeviceStore = defineStore('device', () => {
  // 工作模式
  const workMode = ref<number>(0) // 0=指令模式, 1=循环模式, 2=停止模式

  // 通道状态
  const channels = ref<Record<ChannelKey, ChannelState>>({
    ch1: {
      activePump: 0,
      isRunning: false,
      pwm: 0
    },
    ch2: {
      activePump: 0,
      isRunning: false,
      pwm: 0
    }
  })

  // 泵的 PWM 配置（用户设置的目标 PWM 值）
  const pumpConfigs = ref<Record<ChannelKey, PumpConfig>>({
    ch1: {
      air: 128,
      water1: 128,
      water2: 128
    },
    ch2: {
      air: 128,
      water1: 128,
      water2: 128
    }
  })

  // 泵的实际 PWM 值（从状态查询获取）
  const actualPwmValues = ref<Record<ChannelKey, PumpConfig>>({
    ch1: {
      air: 0,
      water1: 0,
      water2: 0
    },
    ch2: {
      air: 0,
      water1: 0,
      water2: 0
    }
  })

  /**
   * 更新工作模式
   */
  function updateWorkMode(mode: number): void {
    workMode.value = mode
  }

  /**
   * 更新通道状态
   */
  function updateChannel(channel: ChannelKey, data: Partial<ChannelState>): void {
    if (channels.value[channel]) {
      channels.value[channel] = {
        ...channels.value[channel],
        ...data
      }

      // 如果有运行的泵，更新该泵的实际PWM值
      if (data.activePump && data.activePump > 0 && data.pwm !== undefined) {
        const pumpKeyMap: Record<number, PumpKey> = {
          1: 'air',
          2: 'water1',
          3: 'water2'
        }
        const pumpKey = pumpKeyMap[data.activePump]
        if (pumpKey && actualPwmValues.value[channel]) {
          actualPwmValues.value[channel][pumpKey] = data.pwm
        }
      }
    }
  }

  /**
   * 更新泵的 PWM 配置
   */
  function updatePumpConfig(channel: ChannelKey, pumpType: number, pwm: number): void {
    const pumpKeyMap: Record<number, PumpKey> = {
      0: 'air',
      1: 'water1',
      2: 'water2'
    }
    const pumpKey = pumpKeyMap[pumpType]
    if (pumpKey && pumpConfigs.value[channel]) {
      pumpConfigs.value[channel][pumpKey] = pwm
    }
  }

  /**
   * 获取泵的 PWM 配置
   */
  function getPumpConfig(channel: ChannelKey, pumpType: number): number {
    const pumpKeyMap: Record<number, PumpKey> = {
      0: 'air',
      1: 'water1',
      2: 'water2'
    }
    const pumpKey = pumpKeyMap[pumpType]
    if (pumpKey && pumpConfigs.value[channel]) {
      return pumpConfigs.value[channel][pumpKey]
    }
    return 128 // 默认值
  }

  /**
   * 重置所有通道状态
   */
  function resetAllChannels(): void {
    channels.value.ch1 = {
      activePump: 0,
      isRunning: false,
      pwm: 0
    }
    channels.value.ch2 = {
      activePump: 0,
      isRunning: false,
      pwm: 0
    }

    // 重置实际PWM值
    actualPwmValues.value.ch1 = {
      air: 0,
      water1: 0,
      water2: 0
    }
    actualPwmValues.value.ch2 = {
      air: 0,
      water1: 0,
      water2: 0
    }
  }

  /**
   * 获取通道状态
   */
  function getChannelStatus(channel: ChannelKey): ChannelState {
    return channels.value[channel]
  }

  return {
    // 状态
    workMode,
    channels,
    pumpConfigs,
    actualPwmValues,

    // 方法
    updateWorkMode,
    updateChannel,
    updatePumpConfig,
    getPumpConfig,
    resetAllChannels,
    getChannelStatus
  }
})
