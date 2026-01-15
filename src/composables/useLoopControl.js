/**
 * 循环模式控制组合式函数
 */
import { serialManager } from '@/utils/serialManager'
import { useLoopStore } from '@/stores/loop'
import { useSerial } from '@/composables/useSerial'
import {
  buildLoopAddCommand,
  buildLoopClearCommand,
  buildLoopStartCommand,
  buildLoopStopCommand,
  buildLoopPauseCommand,
  buildLoopResumeCommand,
  CMD,
  CHANNEL,
  PUMP_TYPE
} from '@/utils/protocol'

export function useLoopControl() {
  const loopStore = useLoopStore()
  const { getLoopStatus } = useSerial()

  /**
   * 添加时序指令
   */
  async function addLoopStep(channel, pumpType, pwm, time) {
    const frame = buildLoopAddCommand(channel, pumpType, pwm, time)
    const success = await serialManager.send(frame)

    if (success) {
      loopStore.addStep({
        channel,
        pumpType,
        pwm,
        time
      })
    }

    return success
  }

  /**
   * 删除时序指令（仅从 UI 列表中删除）
   */
  function removeLoopStep(id) {
    loopStore.removeStep(id)
  }

  /**
   * 清空时序表
   */
  async function clearLoop() {
    const frame = buildLoopClearCommand()
    const success = await serialManager.send(frame)

    if (success) {
      loopStore.clearSequence()
      loopStore.resetLoopStatus()
    }

    return success
  }

  /**
   * 开始循环执行
   */
  async function startLoop(loopCount = 0) {
    const frame = buildLoopStartCommand(loopCount)
    const success = await serialManager.send(frame)

    if (success) {
      // 等待一小段时间，让下位机开始执行
      await new Promise(resolve => setTimeout(resolve, 100))
      // 立即查询循环状态
      await getLoopStatus()
    }

    return success
  }

  /**
   * 停止循环执行
   */
  async function stopLoop() {
    const frame = buildLoopStopCommand()
    const success = await serialManager.send(frame)

    if (success) {
      loopStore.resetLoopStatus()
    }

    return success
  }

  /**
   * 暂停循环执行
   */
  async function pauseLoop() {
    const frame = buildLoopPauseCommand()
    const success = await serialManager.send(frame)

    if (success) {
      // 等待一小段时间，让下位机暂停
      await new Promise(resolve => setTimeout(resolve, 100))
      // 立即查询循环状态
      await getLoopStatus()
    }

    return success
  }

  /**
   * 继续循环执行
   */
  async function resumeLoop() {
    const frame = buildLoopResumeCommand()
    const success = await serialManager.send(frame)

    if (success) {
      // 等待一小段时间，让下位机继续
      await new Promise(resolve => setTimeout(resolve, 100))
      // 立即查询循环状态
      await getLoopStatus()
    }

    return success
  }

  /**
   * 获取泵类型名称
   */
  function getPumpTypeName(pumpType) {
    const names = ['气泵', '液泵1', '液泵2', '停止']
    return names[pumpType] || '未知'
  }

  /**
   * 获取通道名称
   */
  function getChannelName(channel) {
    return channel === CHANNEL.CH1 ? 'CH1' : 'CH2'
  }

  return {
    // 状态
    sequence: loopStore.sequence,

    // 方法
    addLoopStep,
    removeLoopStep,
    clearLoop,
    startLoop,
    stopLoop,
    pauseLoop,
    resumeLoop,
    getPumpTypeName,
    getChannelName
  }
}
