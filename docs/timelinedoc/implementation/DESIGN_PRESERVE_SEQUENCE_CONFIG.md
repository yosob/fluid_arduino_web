# 保留时序配置设计 - "保存的程序"模式

**日期**: 2025-01-15
**版本**: v1.6
**设计理念**: 将时序配置视为"保存的程序"，可反复执行
**状态**: ✅ 已实现

---

## 🎯 设计理念

### 传统设计（之前）

```
添加指令 → 立即发送到下位机
停止 → 清空下位机和本地配置
再次执行 → 重新配置 ❌
```

**问题**:
- ❌ 停止后丢失配置
- ❌ 需要重新添加指令
- ❌ 不适合重复执行相同流程

### 新设计（现在）

```
添加指令 → 仅保存到本地
开始执行 → 重新下发所有配置
停止 → 保留本地配置
再次执行 → 直接开始 ✅
```

**优势**:
- ✅ 配置持久化保存
- ✅ 可反复执行
- ✅ 类似"保存的程序"概念
- ✅ 更符合用户操作习惯

---

## 🔄 执行流程

### 完整操作流程

```
┌──────────────────────────────────────────────────────┐
│  1. 配置阶段（本地操作）                               │
├──────────────────────────────────────────────────────┤
│  添加指令 → 保存到 loopStore.sequence                │
│  - 只保存到本地                                       │
│  - 不发送到下位机                                     │
│  - 可以删除、修改                                     │
└──────────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────────┐
│  2. 执行阶段（自动下发）                               │
├──────────────────────────────────────────────────────┤
│  点击"开始执行"                                        │
│  ↓                                                    │
│  步骤1: 清空下位机时序表 (LOOP_CLEAR)                 │
│  ↓                                                    │
│  步骤2: 遍历本地sequence，逐条下发 (LOOP_ADD)          │
│  - CH1指令1 → 下位机                                  │
│  - CH1指令2 → 下位机                                  │
│  - CH2指令1 → 下位机                                  │
│  - ...                                               │
│  ↓                                                    │
│  步骤3: 启动循环 (LOOP_START)                         │
│  ↓                                                    │
│  双通道并行执行 ✅                                     │
└──────────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────────┐
│  3. 停止阶段（保留配置）                               │
├──────────────────────────────────────────────────────┤
│  点击"停止"                                            │
│  ↓                                                    │
│  发送 LOOP_STOP 命令                                  │
│  ↓                                                    │
│  下位机: 切换到MANUAL模式 + 清空时序表                 │
│  本地: 保留 sequence 配置 ✅                          │
│  ↓                                                    │
│  可以再次执行，无需重新配置                             │
└──────────────────────────────────────────────────────┘
```

---

## 💻 代码实现

### useLoopControl.js

#### addLoopStep - 仅添加到本地

```javascript
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
```

**关键点**:
- 不再立即发送 LOOP_ADD 命令
- 只保存到 `loopStore.sequence`
- 等待 `startLoop()` 时批量发送

#### startLoop - 三阶段执行

```javascript
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

  // === 步骤1: 清空下位机时序表 ===
  console.log('[useLoopControl] 步骤1: 清空时序表')
  const clearFrame = buildLoopClearCommand()
  const clearSuccess = await serialManager.send(clearFrame)

  if (!clearSuccess) {
    console.error('[useLoopControl] 清空时序表失败')
    return false
  }

  await new Promise(resolve => setTimeout(resolve, 100))

  // === 步骤2: 逐条下发指令 ===
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

  // === 步骤3: 发送开始命令 ===
  console.log('[useLoopControl] 步骤3: 启动循环')
  const startFrame = buildLoopStartCommand(loopCount)
  const success = await serialManager.send(startFrame)

  if (success) {
    console.log('[useLoopControl] ✓ 循环已启动')
    await new Promise(resolve => setTimeout(resolve, 100))
    await getLoopStatus()
  }

  return success
}
```

**关键点**:
1. 先清空下位机时序表（确保干净状态）
2. 遍历本地 `sequence`，逐条下发
3. 每条指令间隔 50ms（避免过快）
4. 最后发送 LOOP_START 启动

#### stopLoop - 保留配置

```javascript
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
```

**关键点**:
- 发送 LOOP_STOP 命令
- 只重置状态，**不清空 sequence**
- 下位机时序表被清空（协议行为）
- 本地配置保留（用户设计）

---

## 📊 使用场景对比

### 场景1: 重复执行相同流程

**传统设计**:
```
1. 添加 5 条指令
2. 开始执行 → ✅
3. 停止 → ❌ 配置丢失
4. 需要重新添加 5 条指令 ❌
5. 开始执行
```

**新设计**:
```
1. 添加 5 条指令（保存）
2. 开始执行 → ✅ 下发 5 条
3. 停止 → ✅ 配置保留
4. 开始执行 → ✅ 重新下发 5 条
5. 停止 → ✅ 配置保留
6. 可以无限次执行 ✅
```

### 场景2: 调试修改流程

**传统设计**:
```
1. 添加 5 条指令
2. 执行 → 发现第3条有问题
3. 停止 → ❌ 全部丢失
4. 重新添加 5 条指令（修改第3条）❌
```

**新设计**:
```
1. 添加 5 条指令
2. 执行 → 发现第3条有问题
3. 停止 → ✅ 配置保留
4. 删除第3条，修改后重新添加 ✅
5. 再次执行 → ✅
```

### 场景3: 保存常用流程

**传统设计**:
```
每次使用都要重新配置 ❌
```

**新设计**:
```
1. 配置好常用流程（如"清洗流程"）
2. 执行
3. 停止
4. 下次需要时直接执行 ✅
```

---

## 🎨 用户体验改进

### 添加指令

**之前**:
```
点击"添加指令"
  ↓
立即发送到下位机占用时序表槽位
  ↓
用户不知道是否成功（需要看日志）
```

**现在**:
```
点击"添加指令"
  ↓
立即添加到UI列表（响应快）
  ↓
点击"开始执行"时统一发送
  ↓
有详细的进度提示
```

### 停止按钮

**之前**:
```
点击"停止"
  ↓
弹出确认框:"停止将清空所有指令"（因为会丢失配置）
  ↓
用户需要确认
```

**现在**:
```
点击"停止"
  ↓
立即停止（无需确认）
  ↓
配置保留，可以再次执行
```

### 开始执行

**之前**:
```
点击"开始执行"
  ↓
直接发送 LOOP_START（假设已配置好）
```

**现在**:
```
点击"开始执行"
  ↓
显示日志:
  [步骤1: 清空时序表]
  [步骤2: 下发时序指令]
  ✓ 下发第 1/5 条指令
  ✓ 下发第 2/5 条指令
  ...
  [步骤3: 启动循环]
  ✓ 循环已启动
```

---

## 🔧 技术细节

### 时序对比

| 操作 | 传统设计 | 新设计 | 说明 |
|:----:|:--------:|:------:|:-----|
| 添加指令 | ~50ms | <1ms | 新设计不发送命令 |
| 开始执行 | ~50ms | ~100ms * N | N为指令数 |
| 停止 | ~50ms | ~50ms | 一样 |
| 重新执行 | 需要重新添加 | 直接开始 | 新设计更快 |

### 内存使用

```javascript
// 本地保存的时序配置
sequence: [
  { id: 1, channel: 1, pumpType: 0, pwm: 150, time: 1000 },
  { id: 2, channel: 1, pumpType: 1, pwm: 200, time: 2000 },
  { id: 3, channel: 2, pumpType: 0, pwm: 180, time: 1500 },
  ...
]

// 每条约 50 字节
// 16 条指令 = 800 字节（可忽略不计）
```

---

## ✅ 优势总结

1. **配置持久化** ⭐⭐⭐⭐⭐
   - 保存配置，无需重复输入
   - 类似"保存的程序"概念

2. **操作便捷** ⭐⭐⭐⭐⭐
   - 一次配置，多次执行
   - 停止后立即重新开始

3. **用户友好** ⭐⭐⭐⭐
   - 无需确认对话框
   - 有详细执行日志

4. **调试方便** ⭐⭐⭐⭐⭐
   - 保留配置，修改后重新执行
   - 不需要重新添加所有指令

5. **符合直觉** ⭐⭐⭐⭐⭐
   - 像程序的"编辑-运行-停止"循环
   - 类似IDE的编程体验

---

## 📚 相关文档

### 技术文档
- `液动通讯协议.md` - Protocol v1.3 完整规范
- `PROTOCOL_V1.3_UPDATE.md` - v1.3协议更新说明

### 设计文档
- `FIX_LOOP_STOP_CLEAR_SEQUENCE.md` - 之前的修复（已废弃）

---

**设计完成日期**: 2025-01-15
**设计人员**: Claude Code + 用户需求
**状态**: ✅ 已实现并测试
**对应代码版本**: v1.6
