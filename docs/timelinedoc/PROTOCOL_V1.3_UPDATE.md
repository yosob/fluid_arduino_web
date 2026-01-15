# Protocol v1.3 协议更新总结

**版本**: v1.3
**更新日期**: 2025-01-15
**更新类型**: 重大重构 - 双通道独立循环模式 + 自动模式切换
**状态**: ✅ 已完成

---

## 📋 更新概述

### 主要变更

Protocol v1.3 是一次重大的协议重构，主要涉及：

1. **✅ 废除 SET_MODE 命令** - 改用自动模式切换机制
2. **✅ 双通道独立时序表** - 每个通道维护独立的时序状态
3. **✅ 并行执行架构** - 两个通道完全独立并行运行
4. **✅ 命令权限控制** - 不同模式下命令执行权限不同
5. **✅ 双通道状态查询** - GET_LOOP_STATUS 返回10字节双通道状态

---

## 🔄 核心架构变更

### 1. 自动模式切换机制 (v1.3最重要的更新)

#### 旧设计 (v1.2及之前)

```
需要显式发送 SET_MODE 命令:
SET_MODE(0) → 切换到 MANUAL 模式
SET_MODE(1) → 切换到 LOOP 模式
```

#### 新设计 (v1.3)

```
自动模式切换 - 通过命令自动触发:

MANUAL → LOOP:
  发送 LOOP_START 命令
  ↓
  系统自动切换到 LOOP 模式
  ↓
  开始执行时序表

LOOP → MANUAL:
  发送 LOOP_STOP 命令
  ↓
  系统自动切换到 MANUAL 模式
  ↓
  清空时序表，停止所有泵

特殊情况:
  发送 STOP_ALL 命令 (在 LOOP 模式)
  ↓
  强制切换到 MANUAL 模式
  ↓
  紧急停止，清空所有状态
```

#### 优势

- ✅ **简化操作** - 无需手动切换模式
- ✅ **状态一致** - 模式状态与执行状态始终同步
- ✅ **减少错误** - 避免模式与命令不匹配的错误

---

### 2. 双通道独立时序表

#### 旧设计 (v1.2及之前)

```
单一时序表，所有指令混合在一起
序列: [CH1-指令1, CH2-指令1, CH1-指令2, CH2-指令2, ...]
执行: 串行执行（一条接一条）
```

#### 新设计 (v1.3)

```
双通道独立时序表:
CH1时序表: [指令1, 指令2, 指令3, ...]
CH2时序表: [指令1, 指令2, 指令3, ...]

执行: 完全并行执行
  - CH1 按 CH1 时序表执行
  - CH2 按 CH2 时序表执行
  - 互不干扰，独立推进
```

#### 数据结构对比

**旧数据结构 (单通道)**:
```javascript
{
  sequence: [
    { channel: 1, pumpType: 0, pwm: 150, time: 1000 },
    { channel: 2, pumpType: 1, pwm: 200, time: 1000 },
    { channel: 1, pumpType: 2, pwm: 180, time: 2000 },
    ...
  ]
}
```

**新数据结构 (双通道)**:
```javascript
{
  ch1: {
    state: 1,      // 运行状态 (0=停止, 1=运行, 2=暂停)
    current: 2,    // 当前执行第2条
    total: 5,      // 总共5条
    loopCount: 3,  // 已循环3次
    maxLoops: 10   // 共循环10次
  },
  ch2: {
    state: 1,
    current: 3,
    total: 4,
    loopCount: 3,
    maxLoops: 10
  }
}
```

---

## 📡 命令权限矩阵

### MANUAL 模式 (默认模式)

| 命令 | 状态 | 说明 |
|:-----|:----:|:-----|
| SET_PUMP (0x10) | ✅ 允许 | 手动控制泵 |
| STOP_CHANNEL (0x11) | ✅ 允许 | 停止指定通道 |
| STOP_ALL (0x12) | ✅ 允许 | 紧急停止所有 |
| LOOP_ADD (0x14) | ✅ 允许 | 添加时序指令 |
| LOOP_CLEAR (0x15) | ✅ 允许 | 清空时序表 |
| LOOP_START (0x16) | ✅ 允许 | ⭐ 自动切换到LOOP模式 |
| LOOP_STOP (0x17) | ❌ 禁止 | 返回 NACK(0x08) |
| LOOP_PAUSE (0x18) | ❌ 禁止 | 返回 NACK(0x08) |
| LOOP_RESUME (0x19) | ❌ 禁止 | 返回 NACK(0x08) |

### LOOP 模式 (循环执行模式)

| 命令 | 状态 | 说明 |
|:-----|:----:|:-----|
| SET_PUMP (0x10) | ❌ 禁止 | 返回 NACK(0x08) - 循环模式下禁用手动控制 |
| STOP_CHANNEL (0x11) | ❌ 禁止 | 返回 NACK(0x08) - 循环模式下禁用手动控制 |
| STOP_ALL (0x12) | ✅ 允许 | ⭐ 强制切换到MANUAL模式 |
| LOOP_ADD (0x14) | ✅ 允许 | 可以继续添加（当前循环完成后生效） |
| LOOP_CLEAR (0x15) | ⚠️ 受限 | 需要先停止循环 |
| LOOP_START (0x16) | ✅ 允许 | 重新开始循环 |
| LOOP_STOP (0x17) | ✅ 允许 | ⭐ 自动切换到MANUAL模式 |
| LOOP_PAUSE (0x18) | ✅ 允许 | 暂停执行（保持LOOP模式） |
| LOOP_RESUME (0x19) | ✅ 允许 | 从暂停点继续 |

### 错误码 0x08 - MODE_CONFLICT

当命令在错误的模式下执行时，返回 NACK(0x08):

**场景示例**:

```
场景1: MANUAL模式下发送循环控制命令
  发送: LOOP_STOP
  响应: NACK(0x08) - 模式冲突，无循环可停止

场景2: LOOP模式下发送手动控制命令
  发送: SET_PUMP
  响应: NACK(0x08) - 模式冲突，循环模式下禁用手动控制

处理方法:
  在MANUAL模式下，先使用 LOOP_START 切换到LOOP模式
  在LOOP模式下，先使用 LOOP_STOP 切换回MANUAL模式
```

---

## 🔧 代码实现变更

### 1. protocol.js 修改

#### 删除的命令

```javascript
// ❌ 已删除
SET_MODE: 0x1A  // v1.3 废除 - 使用自动模式切换机制
```

#### 更新的函数

**parseLoopStatusResponse() - 旧版**:
```javascript
export function parseLoopStatusResponse(data) {
  return {
    state: data[0],      // 单一状态
    currentIndex: data[1],
    totalSteps: data[2],
    loopCount: data[3],
    totalLoops: data[4]
  }
}
```

**parseLoopStatusResponse() - v1.3双通道版本**:
```javascript
export function parseLoopStatusResponse(data) {
  // v1.3: 双通道状态，每个通道5字节，共10字节
  return {
    ch1: {
      state: data[0],      // 0=停止, 1=运行, 2=暂停
      current: data[1],    // 当前执行第几条 (1-based)
      total: data[2],      // 总指令数
      loopCount: data[3],  // 已循环次数
      maxLoops: data[4]    // 最大循环次数 (0=无限)
    },
    ch2: {
      state: data[5],
      current: data[6],
      total: data[7],
      loopCount: data[8],
      maxLoops: data[9]
    }
  }
}
```

---

### 2. timelineExecutor.js 已正确实现

#### 两阶段执行流程

```javascript
async execute(timelineData, config) {
  // === 阶段1: 编程阶段 ===
  // 1. 清空时序表
  const clearFrame = buildFrame(CMD.LOOP_CLEAR, [])
  await this.serialWrite(clearFrame)

  // 2. 发送CH1的时序指令
  for (const cmd of channelCommands.ch1) {
    const frame = this.buildLoopAddCommand(cmd)
    await this.serialWrite(frame)
    await this.sleep(50)
  }

  // 3. 发送CH2的时序指令
  for (const cmd of channelCommands.ch2) {
    const frame = this.buildLoopAddCommand(cmd)
    await this.serialWrite(frame)
    await this.sleep(50)
  }

  // === 阶段2: 执行阶段 ===
  // 发送 LOOP_START 命令（自动切换到LOOP模式）
  const loopCount = config.infiniteLoop ? 0 : config.loopCount
  const startFrame = buildFrame(CMD.LOOP_START, [loopCount])
  await this.serialWrite(startFrame)

  // 开始监控双通道状态
  this.startProgressMonitoring(config)
}
```

#### 双通道状态响应处理

```javascript
handleLoopStatusResponse(data) {
  // 解析双通道状态 (10字节)
  const ch1Status = {
    state: data[0],      // 状态
    current: data[1],    // 当前命令索引
    total: data[2],      // 总命令数
    loopCount: data[3],  // 当前循环次数
    maxLoops: data[4]    // 最大循环次数
  }

  const ch2Status = {
    state: data[5],
    current: data[6],
    total: data[7],
    loopCount: data[8],
    maxLoops: data[9]
  }

  // 检查双通道是否都已完成
  const ch1Finished = ch1Status.state === 0 && ch1Status.current === 0
  const ch2Finished = ch2Status.state === 0 && ch2Status.current === 0

  if (ch1Finished && ch2Finished && this.isRunning) {
    this.isRunning = false
    this.stopProgressMonitoring()
    this.onComplete?.()
  }

  // 更新双通道进度
  if (this.config) {
    this.updateProgress(ch1Status, ch2Status, this.config)
  }
}
```

---

### 3. useLoopControl.js 已正确实现

#### 自动模式切换命令

```javascript
async function startLoop(loopCount = 0) {
  // 发送 LOOP_START 命令（自动从 MANUAL 切换到 LOOP）
  const frame = buildLoopStartCommand(loopCount)
  const success = await serialManager.send(frame)

  if (success) {
    await new Promise(resolve => setTimeout(resolve, 100))
    await getLoopStatus()  // 立即查询状态
  }

  return success
}

async function stopLoop() {
  // 发送 LOOP_STOP 命令（自动从 LOOP 切换回 MANUAL）
  const frame = buildLoopStopCommand()
  const success = await serialManager.send(frame)

  if (success) {
    loopStore.resetLoopStatus()
  }

  return success
}
```

---

### 4. useSerial.js 已正确实现

#### 错误处理

```javascript
function handleResponse(result) {
  if (!result) return

  const { cmd, data, error } = result

  // 处理 NACK 错误响应（包括 MODE_CONFLICT 0x08）
  if (error) {
    handleError(new Error(`命令执行失败: ${getErrorText(error)}`))
    return
  }

  // ... 处理正常响应
}

function getErrorText(errorCode) {
  const errorMap = {
    [ERROR_CODE.CRC_ERROR]: 'CRC 校验错误',
    [ERROR_CODE.CMD_NOT_SUPPORTED]: '命令不支持',
    [ERROR_CODE.PARAM_ERROR]: '参数错误',
    [ERROR_CODE.CHANNEL_ERROR]: '通道号错误',
    [ERROR_CODE.PUMP_TYPE_ERROR]: '泵类型错误',
    [ERROR_CODE.HARDWARE_ERROR]: '硬件故障',
    [ERROR_CODE.LOOP_TABLE_FULL]: '时序表已满',
    [ERROR_CODE.MODE_CONFLICT]: '模式冲突',  // ✅ v1.3 新增
    [ERROR_CODE.PUMP_CONFLICT]: '泵冲突'
  }
  return errorMap[errorCode] || `未知错误 (0x${errorCode.toString(16)})`
}
```

#### 双通道状态更新

```javascript
case CMD.LOOP_STATUS_RSP:
  const loopStatus = parseLoopStatusResponse(data)  // 返回双通道状态
  loopStore.updateStatus(loopStatus)  // 使用新的updateStatus方法
  break
```

---

### 5. loopStore 已正确实现

#### 双通道状态结构

```javascript
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

// 新增：更新双通道状态（Protocol v1.3）
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
```

---

## 📊 协议命令对比表

### 命令码变更

| 命令码 | 名称 | v1.2状态 | v1.3状态 | 变更说明 |
|:------:|:-----|:--------:|:--------:|:---------|
| 0x1A | SET_MODE | ✅ 使用 | ❌ **废弃** | 改用自动模式切换 |
| 0x16 | LOOP_START | ✅ 使用 | ✅ 使用 | **新增**: 自动切换到LOOP模式 |
| 0x17 | LOOP_STOP | ✅ 使用 | ✅ 使用 | **新增**: 自动切换到MANUAL模式 |
| 0x12 | STOP_ALL | ✅ 使用 | ✅ 使用 | **新增**: LOOP模式下强制切换到MANUAL |
| 0x32 | LOOP_STATUS_RSP | ✅ 使用 | ✅ 使用 | **变更**: 返回10字节双通道状态 |

### 响应格式变更

#### GET_LOOP_STATUS (0x22) 响应

**v1.2 格式 (5字节)**:
```
[ST][CU][TO][CN][MX]
 0   1   2   3   4
```

**v1.3 格式 (10字节)**:
```
[ST1][CU1][TO1][CN1][MX1][ST2][CU2][TO2][CN2][MX2]
  0    1    2    3    4    5    6    7    8    9
```

---

## ✅ 兼容性说明

### 向前兼容

v1.3 协议 **不向前兼容** v1.2，因为：

1. ❌ SET_MODE 命令已废弃，v1.2 固件无法识别自动模式切换
2. ❌ LOOP_STATUS_RSP 响应格式完全不同（5字节 vs 10字节）
3. ❌ 命令权限控制机制不同

### 升级要求

- ✅ **下位机固件**: 必须升级到 v1.3
- ✅ **上位机代码**: 已更新支持 v1.3
- ❌ **旧版本客户端**: 无法与 v1.3 固件通信

---

## 🎯 使用建议

### 日常操作流程

**1. 手动测试阶段（MANUAL模式）**
```
1. 系统上电，默认处于 MANUAL 模式
2. 发送 SET_PUMP 命令测试泵
3. 发送 STOP_CHANNEL 停止泵
```

**2. 准备循环阶段（仍在MANUAL模式）**
```
1. 发送 LOOP_ADD 命令添加时序指令
2. 可以分别给 CH1 和 CH2 添加指令
3. 每个通道的时序表独立管理
```

**3. 启动循环阶段（自动切换到LOOP模式）**
```
1. 发送 LOOP_START 命令
2. 系统自动切换到 LOOP 模式
3. 双通道开始并行执行
4. 实时查询 GET_LOOP_STATUS 获取双通道状态
```

**4. 暂停/继续（可选）**
```
暂停: 发送 LOOP_PAUSE 命令
继续: 发送 LOOP_RESUME 命令
```

**5. 停止循环（自动切换回MANUAL模式）**
```
1. 发送 LOOP_STOP 命令
2. 系统自动切换回 MANUAL 模式
3. 清空时序表
4. 现在可以使用 SET_PUMP 命令
```

### 错误处理

**遇到 NACK(0x08) 模式冲突错误时:**

```javascript
// 场景1: 在MANUAL模式收到 LOOP_STOP 错误
if (error === 0x08 && cmd === 0x17) {
  // 处理: 忽略错误，因为本来就没有循环在运行
  console.log('无循环可停止，当前已在MANUAL模式')
}

// 场景2: 在LOOP模式收到 SET_PUMP 错误
if (error === 0x08 && cmd === 0x10) {
  // 处理: 提示用户先停止循环
  console.log('循环模式下禁用手动控制，请先发送 LOOP_STOP 命令')
}
```

---

## 📚 相关文档

### 技术文档
- `液动通讯协议.md` - Protocol v1.3 完整协议规范
- `PHASE4_V1.3_REFACTORING.md` - Timeline执行引擎重构
- `LOOP_MANAGER_UI_REFACTORING.md` - LoopManager UI重构

### 版本文档
- `docs/UPDATE_v1.3.md` - v1.3 版本更新说明

---

**文档版本**: 1.0
**最后更新**: 2025-01-15
**作者**: Claude Code
**状态**: ✅ 完成
**对应代码版本**: v1.6
