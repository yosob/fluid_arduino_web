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
   * 添加时序指令（仅添加到本地，不立即发送）
   * 等待 startLoop 时统一发送
   */
  async function addLoopStep(channel, pumpType, pwm, time) {
    // 只添加到本地sequence，不发送命令
    loopStore.addStep({
      channel,
      pumpType,
      pwm,
      time
    })

    return true
  }

  /**
   * 删除时序指令（仅从 UI 列表中删除）
   */
  function removeLoopStep(id) {
    loopStore.removeStep(id)
  }

  /**
   * 清空时序表（本地和下位机都清空）
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
   * 开始循环执行（重新下发所有时序指令）
   * 流程：
   * 1. 清空下位机时序表
   * 2. 遍历本地sequence，逐条下发
   * 3. 发送LOOP_START命令
   */
  async function startLoop(loopCount = 0) {
    const sequence = loopStore.sequence

    // 检查是否有指令
    if (sequence.length === 0) {
      console.warn('[useLoopControl] 没有可执行的指令')
      return false
    }

    console.log(`[useLoopControl] 开始执行，共 ${sequence.length} 条指令`)

    // 步骤1: 清空下位机时序表
    console.log('[useLoopControl] 步骤1: 清空时序表')
    const clearFrame = buildLoopClearCommand()
    const clearSuccess = await serialManager.send(clearFrame)

    if (!clearSuccess) {
      console.error('[useLoopControl] 清空时序表失败')
      return false
    }

    // 等待清空完成
    await new Promise(resolve => setTimeout(resolve, 100))

    // 步骤2: 逐条下发指令
    console.log('[useLoopControl] 步骤2: 下发时序指令')
    for (let i = 0; i < sequence.length; i++) {
      const step = sequence[i]
      const frame = buildLoopAddCommand(step.channel, step.pumpType, step.pwm, step.time)
      const success = await serialManager.send(frame)

      if (!success) {
        console.error(`[useLoopControl] 下发第 ${i + 1} 条指令失败`)
        return false
      }

      console.log(`[useLoopControl] ✓ 下发第 ${i + 1}/${sequence.length} 条指令:`, step)

      // 延时避免指令发送过快
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // 步骤3: 发送开始命令
    console.log('[useLoopControl] 步骤3: 启动循环')
    const startFrame = buildLoopStartCommand(loopCount)
    const success = await serialManager.send(startFrame)

    if (success) {
      console.log('[useLoopControl] ✓ 循环已启动')
      // 等待一小段时间，让下位机开始执行
      await new Promise(resolve => setTimeout(resolve, 100))
      // 立即查询循环状态
      await getLoopStatus()
    }

    return success
  }

  /**
   * 停止循环执行（保留本地时序配置）
   * 注意: 根据 Protocol v1.3, LOOP_STOP 会自动切换到 MANUAL 模式并清空时序表
   * 但本地的 sequence 保留，可以再次执行
   */
  async function stopLoop() {
    const frame = buildLoopStopCommand()
    const success = await serialManager.send(frame)

    if (success) {
      // 只重置循环状态，不清空sequence
      loopStore.resetLoopStatus()
      console.log('[useLoopControl] ✓ 循环已停止，时序配置已保留')
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
