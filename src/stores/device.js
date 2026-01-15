/**
 * 设备状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDeviceStore = defineStore('device', () => {
  // 工作模式
  const workMode = ref(0) // 0=指令模式, 1=循环模式, 2=停止模式

  // 通道状态
  const channels = ref({
    ch1: {
      activePump: 0, // 0=无, 1=气泵, 2=液泵1, 3=液泵2
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
  const pumpConfigs = ref({
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
  const actualPwmValues = ref({
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
  function updateWorkMode(mode) {
    workMode.value = mode
  }

  /**
   * 更新通道状态
   */
  function updateChannel(channel, data) {
    if (channels.value[channel]) {
      channels.value[channel] = {
        ...channels.value[channel],
        ...data
      }

      // 如果有运行的泵，更新该泵的实际PWM值
      if (data.activePump > 0 && data.pwm !== undefined) {
        const pumpKeys = ['', 'air', 'water1', 'water2']
        const pumpKey = pumpKeys[data.activePump]
        if (pumpKey && actualPwmValues.value[channel]) {
          actualPwmValues.value[channel][pumpKey] = data.pwm
        }
      }
    }
  }

  /**
   * 更新泵的 PWM 配置
   */
  function updatePumpConfig(channel, pumpType, pwm) {
    const pumpKey = ['air', 'water1', 'water2'][pumpType]
    if (pumpKey && pumpConfigs.value[channel]) {
      pumpConfigs.value[channel][pumpKey] = pwm
    }
  }

  /**
   * 获取泵的 PWM 配置
   */
  function getPumpConfig(channel, pumpType) {
    const pumpKey = ['air', 'water1', 'water2'][pumpType]
    if (pumpKey && pumpConfigs.value[channel]) {
      return pumpConfigs.value[channel][pumpKey]
    }
    return 128 // 默认值
  }

  /**
   * 重置所有通道状态
   */
  function resetAllChannels() {
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
  function getChannelStatus(channel) {
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
