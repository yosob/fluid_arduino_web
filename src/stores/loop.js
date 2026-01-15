/**
 * 循环模式状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLoopStore = defineStore('loop', () => {
  // 循环执行状态
  const isRunning = ref(false)
  const isPaused = ref(false)

  // 当前执行信息
  const currentIndex = ref(0)
  const totalSteps = ref(0)
  const loopCount = ref(0)
  const totalLoops = ref(0) // 0=无限循环

  // 时序表
  const sequence = ref([])

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
   * 更新循环状态
   */
  function updateLoopStatus(status) {
    if (status.state !== undefined) {
      isRunning.value = status.state === 1
      isPaused.value = status.state === 2
    }
    if (status.currentIndex !== undefined) {
      currentIndex.value = status.currentIndex
    }
    if (status.totalSteps !== undefined) {
      totalSteps.value = status.totalSteps
    }
    if (status.loopCount !== undefined) {
      loopCount.value = status.loopCount
    }
    if (status.totalLoops !== undefined) {
      totalLoops.value = status.totalLoops
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

    // 方法
    addStep,
    removeStep,
    clearSequence,
    updateLoopStatus,
    resetLoopStatus,
    getProgressPercent,
    getLoopCountText
  }
})
