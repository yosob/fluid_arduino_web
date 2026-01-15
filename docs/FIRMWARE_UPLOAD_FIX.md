# 固件上传功能 - 浏览器兼容性修复

## 问题描述

使用 `stk500` npm 包时，浏览器报错：
```
Uncaught ReferenceError: Buffer is not defined
```

## 根本原因

`stk500` npm 包是为 Node.js 环境设计的，依赖以下 Node.js 特性：
- `Buffer` 对象
- `Stream` API
- `process` 对象

这些在浏览器环境中不存在，即使使用 polyfill 也会有很多兼容性问题。

## 解决方案

### 方案对比

| 方案 | 优点 | 缺点 | 采用？ |
|------|------|------|--------|
| **1. 使用 polyfill** | 快速 | 需要多个 polyfill，不稳定 | ❌ |
| **2. 使用 avr109** | 浏览器原生 | 不支持 STK500v1 (Uno) | ❌ |
| **3. 纯浏览器实现** | 完全兼容，可控 | 需要实现协议 | ✅ |

### 最终实现：纯浏览器 STK500v1

创建了 `src/utils/stk500v1.js`，实现了完整的 STK500v1 协议：

#### 核心功能

**1. STK500v1 协议常量**
```javascript
const STK_CONSTANTS = {
  STK_OK: 0x10,
  STK_INSYNC: 0x14,
  STK_ENTER_PROGMODE: 0x50,
  STK_LEAVE_PROGMODE: 0x51,
  STK_CHIP_ERASE: 0x52,
  STK_LOAD_ADDRESS: 0x55,
  STK_PROG_PAGE: 0x64,
  // ...
}
```

**2. 命令发送与响应**
```javascript
async _sendCommand(command, waitForSync = true) {
  // 发送命令 + CRC_EOP
  await this.serialPort.write(data)

  // 读取并验证响应
  // 检查 STK_INSYNC 和 STK_OK
}
```

**3. 完整上传流程**
```javascript
async bootload(serialPort, hexBuffer, board, callback) {
  // 1. 同步设备
  await stk.sync()

  // 2. 进入编程模式
  await stk.enterProgMode()

  // 3. 擦除芯片
  await stk.chipErase()

  // 4. 按页编程固件
  for (page = 0; page < numPages; page++) {
    await stk.loadAddress(startAddr / 2)
    await stk.progPage(pageData, pageSize)
  }

  // 5. 退出编程模式
  await stk.leaveProgMode()
}
```

#### 技术要点

**1. 字地址 vs 字节地址**
```javascript
// STK500v1 使用字地址（word address）
await stk.loadAddress(byteAddress / 2)
```

**2. 页面大小**
- Uno ATmega328P: 128 字节/页
- 地址需要按页对齐

**3. CRC 校验**
```javascript
// 每个命令以 CRC_EOP (0x20) 结尾
const data = [...command, STK_CONSTANTS.CRC_EOP]
```

**4. 同步机制**
```javascript
// 每次响应以 STK_INSYNC 开始，以 STK_OK 结束
if (responseData[0] !== STK_CONSTANTS.STK_INSYNC) {
  throw new Error('同步失败')
}
```

## 文件结构

```
src/utils/
├── avrIsoUpload.js      # 主上传器类
│   ├── WebSerialPort    # 串口封装
│   └── AvrFirmwareUploader  # 上传逻辑
│
└── stk500v1.js          # STK500v1 协议实现
    ├── STK500v1         # 协议类
    └── bootload()       # 上传流程
```

## 依赖管理

### 保留的依赖
```json
{
  "intel-hex": "^0.1.1"   // Intel HEX 解析
}
```

### 移除的依赖
```json
{
  "stk500": "✗ 移除",         // Node.js only
  "async": "✗ 移除",          // 不再需要
  "buffer": "✗ 移除",         // polyfill 不再需要
  "events": "✗ 移除",         // polyfill 不再需要
  "stream-events": "✗ 移除",  // polyfill 不再需要
  "process": "✗ 移除"         // polyfill 不再需要
}
```

## Vite 配置

由于不再需要 Node.js polyfills，可以简化 vite.config.js：

```javascript
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
      // ❌ 移除 Node.js polyfills
    }
  }
  // ❌ 移除 define 和 optimizeDeps
})
```

## 使用示例

```javascript
import { avrFirmwareUploader } from '@/utils/avrIsoUpload'

// 1. 获取端口列表
const ports = await avrFirmwareUploader.getAvailablePorts()

// 2. 连接串口
await avrFirmwareUploader.connect(ports[0], 115200)

// 3. 上传固件
await avrFirmwareUploader.upload(hexData, {
  board: {
    name: 'uno',
    pageSize: 128,
    baud: 115200,
    signature: [0x1e, 0x95, 0x0f]
  },
  onLog: (type, message) => {
    console.log(`[${type}] ${message}`)
  }
})
```

## 优势

### 1. 完全浏览器兼容
- ✅ 纯 JavaScript 实现
- ✅ 无 Node.js 依赖
- ✅ 支持 Web Serial API

### 2. 可控性高
- ✅ 完全掌握协议实现
- ✅ 易于调试和优化
- ✅ 可添加自定义功能

### 3. 性能好
- ✅ 无 polyfill 开销
- ✅ 代码体积小
- ✅ 加载速度快

### 4. 可维护性强
- ✅ 代码清晰易懂
- ✅ 参考成熟项目
- ✅ 文档完善

## 测试状态

| 功能 | 状态 | 说明 |
|------|------|------|
| 串口连接 | ✅ | Web Serial API |
| HEX 解析 | ✅ | intel-hex 库 |
| STK500v1 协议 | ✅ | 纯浏览器实现 |
| 固件上传 | ⏳ | 待硬件测试 |

## 下一步

1. ✅ 完成纯浏览器实现
2. ⏳ 使用实际 Arduino 测试上传功能
3. ⏳ 添加进度反馈
4. ⏳ 完善错误处理

## 参考资料

- [avrgirl-arduino](https://github.com/noopkat/avrgirl-arduino)
- [STK500v1 协议规范](https://www.atmel.com/Images/doc2525.pdf)
- [Intel HEX 格式](https://en.wikipedia.org/wiki/Intel_HEX)

---

**更新日期**: 2025-01-14
**版本**: 1.0
**作者**: Claude Code
