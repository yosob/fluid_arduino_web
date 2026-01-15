# 循环模式手动控制优化 - 友好提示

**日期**: 2025-01-15
**版本**: v1.6
**功能**: 在循环模式下点击手动控制按钮时显示友好提示，而不是错误框
**状态**: ✅ 已完成

---

## 📋 需求说明

### 问题描述

在循环模式运行时，如果用户点击手动控制的泵按钮：
- **之前**: 右上角显示"命令执行失败: 模式冲突"的错误框
- **问题**: 用户不理解为什么会失败，提示不够友好

### 改进目标

- ✅ 不显示错误框
- ✅ 显示友好的提示信息："循环模式中不能手动控制"
- ✅ 提示信息自动消失（2秒后）

---

## 🎯 实现方案

### 1. 前端检查工作模式

在 `PumpControl.vue` 中添加工作模式检查：

```javascript
async function handleClick() {
  // 检查是否在循环模式（workMode = 1）
  if (workMode.value === 1) {
    ElMessage.warning({
      message: '循环模式中不能手动控制',
      duration: 2000,
      offset: 100
    })
    return
  }

  // 正常的手动控制逻辑
  if (isRunning.value) {
    await useSerial().stopChannel(channelNum)
  } else {
    await startPump(channelNum, props.pumpType, pwmValue.value)
  }
}
```

### 2. 同样在 PWM 滑块变化时检查

```javascript
async function handlePwmChange(value) {
  // 检查是否在循环模式
  if (workMode.value === 1) {
    ElMessage.warning({
      message: '循环模式中不能手动控制',
      duration: 2000,
      offset: 100
    })
    return
  }

  // 更新配置
  deviceStore.updatePumpConfig(props.channel, props.pumpType, value)

  // 如果正在运行，实时更新 PWM
  if (isRunning.value) {
    const channelNum = props.channel === 'ch1' ? 1 : 2
    await startPump(channelNum, props.pumpType, value)
  }
}
```

### 3. 过滤 MODE_CONFLICT 错误

#### serialManager.js

```javascript
if (result.error) {
  // MODE_CONFLICT (0x08) 错误不记录日志（循环模式下手动控制的错误）
  if (result.error !== 0x08) {
    this.logStore?.addErrorLog(`命令执行失败: 错误码 0x${result.error.toString(16)}`)
  }
}
```

#### useSerial.js

```javascript
if (error) {
  // MODE_CONFLICT (0x08) 错误不显示错误框（循环模式下手动控制的错误）
  if (error !== ERROR_CODE.MODE_CONFLICT) {
    handleError(new Error(`命令执行失败: ${getErrorText(error)}`))
  }
  return
}
```

---

## 🎨 用户体验改进

### 提示样式

使用 `ElMessage.warning` 显示警告提示：

- **类型**: warning（警告）
- **位置**: 页面顶部，距离顶部 100px
- **持续时间**: 2000ms（2秒）
- **样式**: Element Plus 标准警告样式（黄色/橙色）

### 提示时机

1. **点击泵卡片**: 检查工作模式，如果是循环模式则显示提示
2. **拖动 PWM 滑块**: 检查工作模式，如果是循环模式则显示提示

### 双重保护

- **前端检查**: 在发送命令前检查，直接拦截并显示提示
- **后端过滤**: 即使命令发送到下位机，下位机返回 MODE_CONFLICT 错误时也不显示错误框

---

## 💻 代码修改

### 修改文件列表

1. **src/components/device/PumpControl.vue**
   - 导入 `ElMessage` 组件
   - 从 `deviceStore` 获取 `workMode`
   - 在 `handleClick()` 中添加工作模式检查
   - 在 `handlePwmChange()` 中添加工作模式检查

2. **src/utils/serialManager.js**
   - 在 `_parseReceivedData()` 中过滤 MODE_CONFLICT (0x08) 错误日志

3. **src/composables/useSerial.js**
   - 在 `handleResponse()` 中过滤 MODE_CONFLICT (0x08) 错误显示

---

## 🔄 工作模式说明

### 三种工作模式

| 模式 | 值 | 说明 | 手动控制 |
|:----:|:--:|:-----|:--------:|
| **MANUAL** | 0 | 指令模式 | ✅ 允许 |
| **LOOP** | 1 | 循环模式 | ❌ 禁止 |
| **STOP** | 2 | 停止模式 | ✅ 允许 |

### 模式自动切换（Protocol v1.3）

- **MANUAL → LOOP**: 发送 LOOP_START 命令
- **LOOP → MANUAL**: 发送 LOOP_STOP 命令

---

## 📊 效果对比

### 之前的体验

```
用户操作: 在循环模式点击泵按钮
  ↓
系统响应: 右上角显示红色错误框
  ↓
错误信息: "命令执行失败: 模式冲突"
  ↓
用户感受: ❓ 糟糕，出错了，不知道该怎么办
```

### 现在的体验

```
用户操作: 在循环模式点击泵按钮
  ↓
系统响应: 页面顶部显示黄色提示
  ↓
提示信息: "循环模式中不能手动控制"
  ↓
2秒后自动消失
  ↓
用户感受: ✅ 原来是这样，现在明白了
```

---

## ✅ 优势总结

1. **用户友好** ⭐⭐⭐⭐⭐
   - 提示清晰易懂
   - 不会吓到用户

2. **及时反馈** ⭐⭐⭐⭐⭐
   - 前端即时检查，无需等待下位机响应
   - 2秒自动消失，不干扰用户

3. **双重保护** ⭐⭐⭐⭐
   - 前端拦截 + 后端过滤
   - 确保不会出现错误框

4. **一致性** ⭐⭐⭐⭐⭐
   - 点击和拖动都有相同的提示
   - 统一的用户体验

---

## 📚 相关文档

### 技术文档
- `液动通讯协议.md` - Protocol v1.3 完整规范
  - 错误码定义 (0x08 MODE_CONFLICT)
  - 命令权限控制

### 设计文档
- `ADD_WORK_MODE_DISPLAY.md` - 工作模式显示功能
- `PROTOCOL_V1.3_UPDATE.md` - v1.3 协议更新说明

### 代码文件
- `src/components/device/PumpControl.vue` - 泵控制组件
- `src/utils/serialManager.js` - 串口管理器
- `src/composables/useSerial.js` - 串口通信
- `src/stores/device.js` - 设备状态管理（workMode）

---

**功能完成日期**: 2025-01-15
**实现人员**: Claude Code
**状态**: ✅ 已实现并测试
**对应代码版本**: v1.6
