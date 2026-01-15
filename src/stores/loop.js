/**
 * 循环模式状态管理
 * 支持 Protocol v1.3 双通道独立状态
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLoopStore = defineStore('loop', () => {
  // 循环执行状态
  const isRunning = ref(false)
  const isPaused = ref(false)

  // 当前执行信息（旧的单一状态，保持向后兼容）
  const currentIndex = ref(0)
  const totalSteps = ref(0)
  const loopCount = ref(0)
  const totalLoops = ref(0) // 0=无限循环

  // 时序表（统一存储，包含channel字段）
  const sequence = ref([])

  // 双通道状态（Protocol v1.3）
  const status = ref({
    ch1: {
      state: 0,      // 状态 (0=停止, 1=运行, 2=暂停)
      current: 0,    // 当前命令索引
      total: 0,      // 总命令数
      loopCount: 0,  // 当前循环次数
      maxLoops: 0    // 最大循环次数 (0=无限)
    },
    ch2: {
      state: 0,
      current: 0,
      total: 0,
      loopCount: 0,
      maxLoops: 0
    }
  })

  /**
   * 添加时序指令
   */
  function addStep(step) {
    sequence.value.push({
      id: Date.now(),
      ...step
    })
    // 更新总步骤数
    totalSteps.value = sequence.value.length
  }

  /**
   * 删除时序指令
   */
  function removeStep(id) {
    const index = sequence.value.findIndex(s => s.id === id)
    if (index !== -1) {
      sequence.value.splice(index, 1)
      // 更新总步骤数
      totalSteps.value = sequence.value.length
    }
  }

  /**
   * 清空时序表
   */
  function clearSequence() {
    sequence.value = []
    // 更新总步骤数
    totalSteps.value = 0
  }

  /**
   * 更新循环状态（旧版本，保持向后兼容）
   */
  function updateLoopStatus(loopStatusData) {
    if (loopStatusData.state !== undefined) {
      isRunning.value = loopStatusData.state === 1
      isPaused.value = loopStatusData.state === 2
    }
    if (loopStatusData.currentIndex !== undefined) {
      currentIndex.value = loopStatusData.currentIndex
    }
    if (loopStatusData.totalSteps !== undefined) {
      totalSteps.value = loopStatusData.totalSteps
    }
    if (loopStatusData.loopCount !== undefined) {
      loopCount.value = loopStatusData.loopCount
    }
    if (loopStatusData.totalLoops !== undefined) {
      totalLoops.value = loopStatusData.totalLoops
    }
  }

  /**
   * 更新双通道状态（Protocol v1.3）
   * @param {Object} loopStatusData - 从useSerial接收到的双通道状态
   */
  function updateStatus(loopStatusData) {
    if (loopStatusData.ch1) {
      status.value.ch1 = { ...loopStatusData.ch1 }
      // 更新旧状态以保持兼容
      if (loopStatusData.ch1.state !== undefined) {
        isRunning.value = loopStatusData.ch1.state === 1
        isPaused.value = loopStatusData.ch1.state === 2
      }
    }

    if (loopStatusData.ch2) {
      status.value.ch2 = { ...loopStatusData.ch2 }
    }
  }

  /**
   * 重置循环状态
   */
  function resetLoopStatus() {
    isRunning.value = false
    isPaused.value = false
    currentIndex.value = 0
    loopCount.value = 0

    // 重置双通道状态
    status.value = {
      ch1: {
        state: 0,
        current: 0,
        total: 0,
        loopCount: 0,
        maxLoops: 0
      },
      ch2: {
        state: 0,
        current: 0,
        total: 0,
        loopCount: 0,
        maxLoops: 0
      }
    }
  }

  /**
   * 获取循环进度百分比
   */
  function getProgressPercent() {
    if (totalSteps.value === 0) return 0
    return (currentIndex.value / totalSteps.value) * 100
  }

  /**
   * 获取循环次数描述
   */
  function getLoopCountText() {
    if (totalLoops.value === 0) {
      return `无限循环 (已执行${loopCount.value}次)`
    } else {
      return `${loopCount.value}/${totalLoops.value}`
    }
  }

  return {
    // 状态
    isRunning,
    isPaused,
    currentIndex,
    totalSteps,
    loopCount,
    totalLoops,
    sequence,
    status,  // 新增：双通道状态

    // 方法
    addStep,
    removeStep,
    clearSequence,
    updateLoopStatus,  // 旧方法，保持兼容
    updateStatus,      // 新方法：更新双通道状态
    resetLoopStatus,
    getProgressPercent,
    getLoopCountText
  }
})
