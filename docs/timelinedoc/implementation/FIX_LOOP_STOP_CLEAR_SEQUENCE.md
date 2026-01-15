# 修复循环停止后时序表状态不同步问题

**日期**: 2025-01-15
**版本**: v1.6
**问题**: 停止循环后再次添加指令时报错"时序表已满"
**状态**: ✅ 已修复

---

## 🐛 问题描述

### 复现步骤

1. 添加循环指令（CH1和CH2）
2. 点击"开始执行" → 循环正常运行
3. 点击"停止" → 循环停止
4. 再次添加循环指令
5. **报错**: "时序表已满" (ERROR_CODE: 0x07)

### 错误信息

```
串口错误: Error: 命令执行失败: 时序表已满
    at SerialManager.handleResponse [as onDataCallback] (useSerial.js:259:19)
    at SerialManager._parseReceivedData (serialManager.js:381:16)
    at SerialManager._startReading (serialManager.js:319:16)
```

---

## 🔍 根本原因

### Protocol v1.3 的 LOOP_STOP 命令行为

根据 **Protocol v1.3** 规范，`LOOP_STOP (0x17)` 命令会：

1. ✅ 停止双通道循环执行
2. ✅ 自动从 LOOP 模式切换回 MANUAL 模式
3. ✅ **清空所有时序表**（CH1 和 CH2）
4. ✅ 停止所有泵

### 状态不同步问题

**下位机行为**:
```
收到 LOOP_STOP 命令
  ↓
清空时序表（16个槽位全部变为空闲）
  ↓
返回 ACK
```

**上位机行为（修复前）**:
```
发送 LOOP_STOP 命令
  ↓
重置 loopStore.status ✅
保留 loopStore.sequence ❌  <-- 问题所在
  ↓
用户再次添加指令
  ↓
尝试发送旧的 sequence + 新的指令
  ↓
时序表溢出（旧指令已经占满）
```

---

## ✅ 修复方案

### 1. 修复 useLoopControl.js

**文件**: `src/composables/useLoopControl.js`

**修改前**:
```javascript
async function stopLoop() {
  const frame = buildLoopStopCommand()
  const success = await serialManager.send(frame)

  if (success) {
    loopStore.resetLoopStatus()  // ❌ 只重置状态
  }

  return success
}
```

**修改后**:
```javascript
/**
 * 停止循环执行
 * 注意: 根据 Protocol v1.3, LOOP_STOP 会自动切换到 MANUAL 模式并清空时序表
 */
async function stopLoop() {
  const frame = buildLoopStopCommand()
  const success = await serialManager.send(frame)

  if (success) {
    // 重置循环状态
    loopStore.resetLoopStatus()
    // 清空本地的时序表（下位机也会清空）✅
    loopStore.clearSequence()
  }

  return success
}
```

**关键改进**:
- 添加 `loopStore.clearSequence()` 调用
- 保持上下位机状态同步
- 添加详细注释说明 v1.3 协议行为

---

### 2. 增强 LoopManager.vue 用户体验

**文件**: `src/components/device/LoopManager.vue`

**修改前**:
```javascript
// 停止
async function handleStop() {
  await loopControl.stopLoop()  // ❌ 无提示，用户不知道会清空指令
}
```

**修改后**:
```javascript
// 停止
async function handleStop() {
  // 根据 Protocol v1.3, LOOP_STOP 会清空时序表
  // 需要提示用户确认
  try {
    await ElMessageBox.confirm(
      '停止循环将清空所有时序指令，确定要停止吗？',
      '确认停止',
      {
        confirmButtonText: '确定停止',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await loopControl.stopLoop()
    ElMessage.success('循环已停止，时序指令已清空')
  } catch {
    // 用户取消
  }
}
```

**用户体验改进**:
- ✅ 停止前弹出确认对话框
- ✅ 明确告知"停止将清空所有时序指令"
- ✅ 停止后显示成功提示
- ✅ 用户可以取消操作

---

## 📊 修复效果对比

### 修复前

```
步骤1: 添加 5 条指令
步骤2: 开始执行 → 成功
步骤3: 停止 → 成功（但本地仍保留 5 条指令）
步骤4: 再添加 1 条指令
步骤5: 尝试发送 5+1=6 条指令 → ❌ 报错"时序表已满"
```

### 修复后

```
步骤1: 添加 5 条指令
步骤2: 开始执行 → 成功
步骤3: 停止
       → 弹出确认对话框:"停止循环将清空所有时序指令，确定要停止吗？"
       → 用户点击确定
       → 清空本地 sequence（下位机也清空时序表）
       → 显示"循环已停止，时序指令已清空"
步骤4: 再添加 1 条指令
步骤5: 发送 1 条指令 → ✅ 成功
```

---

## 🎯 技术要点

### 1. Protocol v1.3 关键特性理解

**自动模式切换**:
- `LOOP_START` → 自动切换到 LOOP 模式
- `LOOP_STOP` → 自动切换回 MANUAL 模式
- 无需使用废弃的 `SET_MODE` 命令

**时序表管理**:
- `LOOP_STOP` 会清空时序表
- `LOOP_CLEAR` 也会清空时序表
- 上位机必须同步清空本地数据

### 2. 状态同步原则

**上下位机状态必须保持一致**:

| 下位机状态 | 上位机状态 | 同步操作 |
|:---------:|:---------:|:--------:|
| 时序表清空 | loopStore.sequence = [] | stopLoop() |
| 循环状态重置 | loopStore.resetLoopStatus() | stopLoop() |
| 工作模式切换 | 无需显式切换 | 自动完成 |

### 3. 用户体验设计

**重要操作需要确认**:
- 停止循环 = 清空所有指令
- 类似于"清空所有"按钮
- 必须有确认对话框

---

## 📚 相关文档

### 技术文档
- `液动通讯协议.md` - Protocol v1.3 完整规范
  - 4.7 LOOP_STOP (0x17) 命令说明
  - 4.3.2 LOOP模式命令权限

### 代码文件
- `src/composables/useLoopControl.js` - 循环控制逻辑
- `src/components/device/LoopManager.vue` - 循环管理UI
- `src/stores/loop.js` - 循环状态管理

---

## ✅ 验证测试

### 测试场景1: 正常停止和重新开始

```
1. 添加 CH1: 3条指令, CH2: 2条指令
2. 开始执行 → ✅ 成功
3. 停止 → ✅ 确认对话框 → ✅ 序列清空
4. 再次添加 CH1: 1条指令 → ✅ 成功
5. 开始执行 → ✅ 成功
```

### 测试场景2: 取消停止

```
1. 添加指令并开始执行
2. 停止 → 确认对话框
3. 点击"取消" → ✅ 循环继续运行
4. 序列保持不变 → ✅ 正确
```

### 测试场景3: 多次停止和开始

```
1. 添加指令 → 开始 → 停止 (序列清空)
2. 添加指令 → 开始 → 停止 (序列清空)
3. 添加指令 → 开始 → 停止 (序列清空)
   → ✅ 每次都能正常添加，无报错
```

---

**修复完成日期**: 2025-01-15
**修复人员**: Claude Code
**影响范围**: useLoopControl.js, LoopManager.vue
**向后兼容**: ✅ 完全兼容 Protocol v1.3
