# Arduino 固件上传功能 - 完整实现指南

**项目**: 液动控制系统 Web 上位机
**版本**: v1.5
**状态**: ✅ 已验证成功
**完成日期**: 2025-01-15

参考项目：
https://github.com/noopkat/avrgirl-arduino?tab=readme-ov-file
https://github.com/Andreas-Froyland/arduino-web-flasher/blob/main/README.md
https://github.com/Leo-Joel1/arduino-uno-webflasher/blob/main/index.html
https://github.com/KaguraiYoRoy/Arduino-web-flasher/blob/source/package.json
https://github.com/dbuezas/arduino-web-uploader

---

## 📋 目录

- [1. 项目概述](#1-项目概述)
- [2. 架构设计](#2-架构设计)
- [3. 文件来源与说明](#3-文件来源与说明)
- [4. 核心实现](#4-核心实现)
- [5. 移植指南](#5-移植指南)
- [6. 故障排除](#6-故障排除)
- [7. 参考资源](#7-参考资源)

---

## 1. 项目概述

### 1.1 功能描述

在 Vue3 + Vite 项目中实现基于浏览器的 Arduino 固件上传功能，无需 Arduino IDE，用户只需：

1. 连接 Arduino 到电脑
2. 在网页中点击"开始上传"
3. 选择串口
4. 等待上传完成

### 1.2 技术栈

| 技术            | 版本  | 用途               |
| --------------- | ----- | ------------------ |
| Vue 3           | 3.x   | 前端框架           |
| Vite            | 5.x   | 构建工具           |
| Element Plus    | -     | UI 组件库          |
| avrgirl-arduino | 5.0.1 | Arduino 固件上传库 |
| Web Serial API  | -     | 浏览器串口通信     |

### 1.3 关键挑战

**挑战 1: avrgirl-arduino 是 Node.js 库**

- 原生依赖 Node.js 的 `serialport` 包
- 无法直接在浏览器中使用

**挑战 2: 选择正确的构建文件**

- avrgirl-arduino 提供了多个构建版本
- 需要选择浏览器专用的 `global` 版本

**挑战 3: Web Serial API 限制**

- 仅在 Chromium 内核浏览器中可用
- 需要通过 HTTPS 或 localhost 访问

---

## 2. 架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      Vue3 Web 应用                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  FirmwareUpdateSimple.vue (固件上传组件)                │  │
│  │  - 加载固件文件                                         │  │
│  │  - 调用 avrgirl-arduino                                 │  │
│  │  - 显示进度和日志                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          ↓                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  window.AvrgirlArduino (全局对象)                       │  │
│  │  - STK500v1 协议实现                                     │  │
│  │  - Intel HEX 解析                                       │  │
│  │  - Web Serial 通信                                      │  │
│  │  - 自动复位处理                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Web Serial API
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Arduino 硬件                                   │
│  - Web Serial API (浏览器)                                    │
│  - USB 转串口芯片 (CH340)                                      │
│  - Arduino Bootloader (Optiboot)                              │
│  - ATmega328P 微控制器                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 数据流程

```
用户操作
   ↓
点击"开始上传"按钮
   ↓
加载固件文件 (fetch('/firmware/fluid_v1.hex'))
   ↓
转换为 ArrayBuffer
   ↓
创建 AvrgirlArduino 实例
   ↓
调用 avrgirl.flash(arrayBuffer, callback)
   ↓
【内部流程】
   ├─ navigator.serial.requestPort()  // 弹出串口选择对话框
   ├─ port.open({ baudRate: 115200 })
   ├─ DTR 复位触发
   ├─ 等待 Bootloader 启动
   ├─ STK500v1 同步
   ├─ 解析 Intel HEX
   ├─ 分页编程 (128 bytes/page)
   └─ 验证固件
   ↓
callback(error)
   ↓
显示结果
```

### 2.3 核心依赖关系

```
FirmwareUpdateSimple.vue
   ↓ 使用
avrgirl-arduino.global.js
   ↓ 依赖
Web Serial API (浏览器原生)
   ↓ 通信
Arduino Bootloader
```

---

## 3. 文件来源与说明

### 3.1 核心库文件

#### avrgirl-arduino.global.js

| 属性           | 值                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------- |
| **源文件路径** | `reference/avrgirl-arduino-master/avrgirl-arduino-master/dist/avrgirl-arduino.global.js` |
| **目标路径**   | `public/avrgirl-arduino.global.js`                                                       |
| **文件大小**   | 621 KB                                                                                   |
| **格式**       | 纯 JavaScript，无依赖                                                                    |
| **导出方式**   | `window.AvrgirlArduino = ...`                                                            |

**关键特征**:

```javascript
// 文件第一行
window.AvrgirlArduino = /******/ (() => {
  // webpackBootstrap
  // ... 完整实现
})();
```

**为什么选择这个文件**:

- ✅ `global` 版本：直接挂载到 `window.AvrgirlArduino`
- ❌ 普通版本 (`avrgirl-arduino.js`)：使用 UMD 包装器，导出有问题
- ✅ 包含完整功能：STK500v1、HEX 解析、Web Serial 封装
- ✅ 无需构建工具：直接复制即可使用

### 3.2 参考项目文件

以下文件仅供参考，不需要复制到项目中：

| 文件                 | 路径                                                                 | 用途       |
| -------------------- | -------------------------------------------------------------------- | ---------- |
| arduino-web-flasher  | `reference/arduino-web-flasher-main/`                                | 参考实现   |
| avrgirl-arduino 源码 | `reference/avrgirl-arduino-master/`                                  | 库源码     |
| React Demo           | `reference/avrgirl-arduino-master/tests/demos/webserial/react-demo/` | React 实现 |

### 3.3 项目文件

#### 1. index.html

**路径**: `index.html`

**关键修改**:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    ...
  </head>
  <body>
    <div id="app"></div>

    <!-- 关键：加载 avrgirl-arduino global 版本 -->
    <script src="/avrgirl-arduino.global.js"></script>

    <!-- 验证加载（可选，用于调试） -->
    <script>
      console.log("=== avrgirl-arduino.global.js 加载检查 ===");
      console.log("window.AvrgirlArduino:", typeof window.AvrgirlArduino);
      if (typeof window.AvrgirlArduino !== "undefined") {
        console.log("✓ avrgirl-arduino 加载成功");
      } else {
        console.error("✗ avrgirl-arduino 加载失败");
      }
    </script>

    <!-- Vue 应用入口 -->
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

**要点**:

- 必须在 `main.js` **之前**加载 `avrgirl-arduino.global.js`
- 脚本路径：`/avrgirl-arduino.global.js`（注意开头的 `/`）

#### 2. FirmwareUpdateSimple.vue

**路径**: `src/components/FirmwareUpdateSimple.vue`

**核心代码**:

```vue
<template>
  <div class="firmware-update-simple">
    <el-card>
      <!-- 固件信息 -->
      <el-descriptions :column="2" border>
        <el-descriptions-item label="固件版本">
          {{ FIRMWARE_INFO.version }}
        </el-descriptions-item>
        ...
      </el-descriptions>

      <!-- 上传按钮 -->
      <el-button
        type="primary"
        @click="startUpload"
        :loading="isUploading"
      >
        开始上传
      </el-button>

      <!-- 进度条 -->
      <el-progress
        v-if="isUploading"
        :percentage="uploadProgress"
      />

      <!-- 日志 -->
      <div class="log-content">
        <div v-for="log in logs" :key="log.index">
          {{ log.time }} {{ log.message }}
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { FIRMWARE_INFO } from '@/config/firmware'

const isUploading = ref(false)
const uploadProgress = ref(0)
const logs = ref([])

async function startUpload() {
  try {
    // 1. 加载固件文件
    const response = await fetch('/firmware/fluid_v1.hex')
    const arrayBuffer = await response.arrayBuffer()

    // 2. 等待脚本加载
    await new Promise(resolve => setTimeout(resolve, 300))

    // 3. 检查库是否加载
    if (typeof window.AvrgirlArduino === 'undefined') {
      throw new Error('avrgirl-arduino 库未加载')
    }

    // 4. 创建实例
    const avrgirl = new window.AvrgirlArduino({
      board: 'uno',     // Arduino Uno
      debug: true      // 启用调试日志
    })

    // 5. 上传固件
    avrgirl.flash(arrayBuffer, (error) => {
      if (error) {
        console.error('上传失败:', error)
        ElMessage.error(`上传失败: ${error.message}`)
      } else {
        console.log('上传成功')
        ElMessage.success('固件上传成功！')
      }
      isUploading.value = false
    })

    // 6. 模拟进度条
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 95) {
        uploadProgress.value += 2
      } else {
        clearInterval(progressInterval)
      }
    }, 200)

  } catch (error) {
    ElMessage.error(error.message)
    isUploading.value = false
  }
}
</script>
</vue>
```

**要点**:

- 使用 `window.AvrgirlArduino` 访问全局对象
- `board: 'uno'` 指定 Arduino Uno
- `flash()` 方法接受 `ArrayBuffer` 和回调函数

#### 3. 固件文件

**路径**: `public/firmware/fluid_v1.hex`

**说明**: Arduino 导出的 Intel HEX 格式固件文件

**生成方法**:

1. 在 Arduino IDE 中打开 `.ino` 文件
2. 点击 "草图" → "导出编译的二进制文件"
3. 在项目文件夹中找到 `.hex` 文件
4. 复制到 `public/firmware/` 目录

---

## 4. 核心实现

### 4.1 API 使用说明

#### AvrgirlArduino 构造函数

```javascript
const avrgirl = new window.AvrgirlArduino({
  board: "uno", // 板卡类型
  debug: true, // 启用调试日志
  port: "", // 可选：指定串口（留空则自动选择）
  manualReset: false, // 可选：手动复位模式
  disableVerify: false, // 可选：禁用验证
});
```

**支持的板卡**:

- `'uno'` - Arduino Uno
- `'nano'` - Arduino Nano
- `'mega'` - Arduino Mega
- 更多：查看 avrgirl-arduino/boards.js

#### flash() 方法

```javascript
avrgirl.flash(hexBuffer, callback);
```

**参数**:

- `hexBuffer`: `ArrayBuffer` - 固件数据（从 HEX 文件读取）
- `callback`: `Function` - 回调函数
  ```javascript
  function callback(error) {
    if (error) {
      // 处理错误
      console.error(error.message);
    } else {
      // 上传成功
      console.log("成功");
    }
  }
  ```

### 4.2 完整上传流程

```javascript
// 步骤 1: 加载 HEX 文件
const response = await fetch("/firmware/fluid_v1.hex");
const hexText = await response.text();
const arrayBuffer = await response.arrayBuffer();

// 步骤 2: 确保 avrgirl-arduino 已加载
if (typeof window.AvrgirlArduino === "undefined") {
  throw new Error("库未加载");
}

// 步骤 3: 创建实例
const avrgirl = new window.AvrgirlArduino({
  board: "uno",
  debug: true,
});

// 步骤 4: 上传
avrgirl.flash(arrayBuffer, (error) => {
  if (error) {
    // 失败处理
  } else {
    // 成功处理
  }
});
```

### 4.3 进度显示技巧

**注意**: `avrgirl-arduino` 的 `flash()` 方法不提供进度回调。需要使用模拟进度：

```javascript
// 启动上传
avrgirl.flash(arrayBuffer, callback);

// 模拟进度（实际进度不可知）
let progress = 0;
const interval = setInterval(() => {
  progress += 2;
  if (progress >= 95) {
    clearInterval(interval);
  }
  uploadProgress.value = progress;
}, 200);

// 上传完成时
callback = (error) => {
  clearInterval(interval);
  if (!error) {
    uploadProgress.value = 100;
  }
};
```

---

## 5. 移植指南

### 5.1 快速移植（3 步）

#### 步骤 1: 复制核心库

```bash
# 从参考项目复制
cp reference/avrgirl-arduino-master/avrgirl-arduino-master/dist/avrgirl-arduino.global.js \
   public/avrgirl-arduino.global.js
```

#### 步骤 2: 修改 index.html

```html
<body>
  <div id="app"></div>

  <!-- 添加这一行 -->
  <script src="/avrgirl-arduino.global.js"></script>

  <script type="module" src="/src/main.js"></script>
</body>
```

#### 步骤 3: 创建上传组件

```vue
<script setup>
import { ref } from "vue";

async function uploadFirmware() {
  // 加载固件
  const response = await fetch("/path/to/firmware.hex");
  const arrayBuffer = await response.arrayBuffer();

  // 上传
  const avrgirl = new window.AvrgirlArduino({
    board: "uno",
    debug: true,
  });

  avrgirl.flash(arrayBuffer, (error) => {
    if (error) {
      console.error("失败:", error);
    } else {
      console.log("成功");
    }
  });
}
</script>
```

### 5.2 完整项目集成

#### 文件清单

```
your-project/
├── public/
│   └── avrgirl-arduino.global.js    # 核心库（621 KB）
│   └── firmware/
│       └── your_firmware.hex        # 固件文件
├── src/
│   ├── components/
│   │   └── FirmwareUpload.vue       # 上传组件
│   └── config/
│       └── firmware.js              # 固件配置
└── index.html                        # 修改：添加 script 标签
```

#### 配置文件示例

**src/config/firmware.js**:

```javascript
export const FIRMWARE_INFO = {
  name: "Your Firmware",
  version: "1.0.0",
  date: "2025-01-15",
  fileName: "your_firmware.hex",
  fileSize: 20 * 1024, // 20 KB
  description: "Your firmware description",
  filePath: "/firmware/your_firmware.hex",
};

export const FIRMWARE_PATH = "/firmware/your_firmware.hex";
```

### 5.3 支持的板卡

| 板卡          | board 参数      | 说明                   |
| ------------- | --------------- | ---------------------- |
| Arduino Uno   | `'uno'`         | 最常用                 |
| Arduino Nano  | `'nano'`        | 需确认 Bootloader 版本 |
| Arduino Mega  | `'mega'`        | 大型板卡               |
| Arduino Micro | `'micro'`       | 支持                   |
| LilyPad USB   | `'lilypad-usb'` | 可穿戴设备             |

完整列表查看：`avrgirl-arduino/boards.js`

### 5.4 浏览器兼容性

| 浏览器  | 版本要求 | Web Serial API |
| ------- | -------- | -------------- |
| Chrome  | 89+      | ✅ 完全支持    |
| Edge    | 89+      | ✅ 完全支持    |
| Opera   | 75+      | ✅ 完全支持    |
| Firefox | -        | ❌ 不支持      |
| Safari  | -        | ❌ 不支持      |

**环境要求**:

- 开发：`http://localhost` 或 `http://127.0.0.1`
- 生产：`https://`（必须）

---

## 6. 故障排除

### 6.1 常见问题

#### 问题 1: window.AvrgirlArduino is undefined

**症状**:

```
Error: avrgirl-arduino 库未加载
```

**原因**: 文件路径错误或文件未加载

**解决方法**:

1. 检查 `index.html` 中的 script 标签：

   ```html
   <script src="/avrgirl-arduino.global.js"></script>
   ```

   注意开头的 `/`

2. 确认文件存在：

   ```bash
   ls -lh public/avrgirl-arduino.global.js
   # 应该显示 621 KB
   ```

3. 检查浏览器控制台 Network 标签，确认文件已加载（状态码 200）

4. 硬刷新浏览器（Ctrl+F5）

#### 问题 2: 串口选择对话框不弹出

**症状**: 点击上传后没有任何反应

**原因**: Web Serial API 不支持或访问方式错误

**解决方法**:

1. 确认使用 Chrome/Edge 浏览器（版本 89+）

2. 检查访问地址：
   - ✅ `http://localhost:5173`
   - ✅ `http://127.0.0.1:5173`
   - ✅ `https://your-domain.com`
   - ❌ `http://192.168.1.100:5173`（需要 HTTPS）

3. 检查控制台是否有错误：
   ```
   Web Serial API is not supported in this browser
   ```

#### 问题 3: 上传失败 "Failed to open serial port"

**症状**:

```
Error: Failed to open serial port
```

**原因**: 串口被其他程序占用

**解决方法**:

1. 关闭 Arduino IDE 的串口监视器
2. 关闭其他可能使用串口的程序
3. 重新插拔 USB 线
4. 重新尝试上传

#### 问题 4: 上传超时

**症状**: 上传进度卡住，长时间无响应

**原因**: 复位时序问题或 Bootloader 未启动

**解决方法**:

1. 确认 Arduino 连接正常
2. 尝试手动复位：在上传时按 Arduino 复位按钮
3. 检查 USB 线质量（建议使用原装线）
4. 更换 USB 端口

### 6.2 调试技巧

#### 启用调试日志

```javascript
const avrgirl = new window.AvrgirlArduino({
  board: "uno",
  debug: true, // ← 启用详细日志
});
```

#### 查看浏览器控制台

打开开发者工具（F12），切换到 Console 标签，会看到：

```
[AvrgirlArduino] Connecting...
[AvrgirlArduino] serial port opened
[AvrgirlArduino] Resetting board...
[AvrgirlArduino] Board initialized
[AvrgirlArduino] Flashing...
[AvrgirlArduino] Flashing complete!
```

#### 查看 Web Serial 日志

Chrome 浏览器中：

1. 打开 `chrome://serial/`
2. 查看已连接的串口设备

---

## 7. 参考资源

### 7.1 关键项目

| 项目                | URL                                                             | 说明                       |
| ------------------- | --------------------------------------------------------------- | -------------------------- |
| avrgirl-arduino     | https://github.com/noopkat/avrgirl-arduino                      | Arduino 固件上传库         |
| arduino-web-flasher | https://github.com/andreasnordstrand/arduino-web-flasher        | 在线固件上传器（参考实现） |
| Web Serial API      | https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API | MDN 文档                   |

### 7.2 相关文档

| 文档     | 路径                                         | 说明                     |
| -------- | -------------------------------------------- | ------------------------ |
| 实现总结 | `docs/FIRMWARE_UPLOAD_SUCCESS_GUIDE.md`      | 本文档                   |
| 架构文档 | `CLAUDE.md`                                  | 项目整体架构             |
| 协议文档 | `液动通讯协议.md`                            | 设备通讯协议             |
| 通讯协议 | `reference/avrgirl-arduino-master/README.md` | avrgirl-arduino 使用说明 |

### 7.3 代码参考

#### arduino-web-flasher App.js

```javascript
// 关键代码
import AvrgirlArduino from "avrgirl-arduino";

const avrgirl = new AvrgirlArduino({
  board: board,
  debug: true,
});

avrgirl.flash(filecontents, (error) => {
  if (error) {
    updateUploadStatus("error");
    updateUploadStatusTitle("Error Flashing Arduino!");
    updateUploadStatusMsg(error.message);
  } else {
    console.info("flash successful");
    updateUploadStatus("done");
    updateUploadStatusTitle("Flash Sucessful!");
    updateUploadStatusMsg("Successfully flashed the Arduino!");
  }
});
```

#### avrgirl-arduino 浏览器 Demo

路径: `reference/avrgirl-arduino-master/tests/demos/webserial/react-demo/`

使用 React + Create React App，通过 npm 安装：

```bash
npm install avrgirl-arduino@^5.0.1
```

---

## 8. 总结

### 8.1 关键成功因素

1. **选择正确的构建文件**:
   - ✅ `avrgirl-arduino.global.js`（global 版本）
   - ❌ `avrgirl-arduino.js`（UMD 版本，导出有问题）

2. **正确的加载顺序**:

   ```html
   <script src="/avrgirl-arduino.global.js"></script>
   <script type="module" src="/src/main.js"></script>
   ```

3. **使用全局对象访问**:

   ```javascript
   new window.AvrgirlArduino({ board: "uno" });
   ```

4. **ArrayBuffer 格式**:
   ```javascript
   const arrayBuffer = await response.arrayBuffer();
   avrgirl.flash(arrayBuffer, callback);
   ```

### 8.2 核心经验

1. **不要直接使用 npm 包**:
   - avrgirl-arduino 是 Node.js 库
   - 使用预构建的 `.global.js` 文件

2. **仔细检查构建文件**:
   - `avrgirl-arduino.js` (621 KB) - UMD 版本，导出有问题
   - `avrgirl-arduino.global.js` (621 KB) - **使用这个**
   - `avrgirl-arduino.min.js` (198 KB) - 压缩版本，未测试

3. **调试时启用 debug 模式**:

   ```javascript
   debug: true; // 显示详细日志
   ```

4. **处理异步上传**:
   - `flash()` 是异步的，使用回调函数
   - 需要自己实现进度显示（模拟进度）

5. **Web Serial API 限制**:
   - 仅 Chrome/Edge 支持
   - 需要 HTTPS 或 localhost
   - 用户必须手动授权串口访问

### 8.3 性能优化建议

1. **延迟加载库**:

   ```javascript
   // 仅在需要时加载
   if (!window.AvrgirlArduino) {
     await loadScript("/avrgirl-arduino.global.js");
   }
   ```

2. **使用压缩版本**:
   - 如果文件大小是问题，可尝试 `avrgirl-arduino.global.min.js`
   - 需要测试验证

3. **缓存固件文件**:
   - 固件文件变化不频繁，可利用浏览器缓存

---

## 9. 附录

### 9.1 完整文件清单

**必需文件**:

- ✅ `public/avrgirl-arduino.global.js` (621 KB)
- ✅ `public/firmware/fluid_v1.hex`
- ✅ `src/components/FirmwareUpdateSimple.vue`
- ✅ `src/config/firmware.js`
- ✅ `index.html` (已修改)

**参考文件**（可选）:

- `reference/avrgirl-arduino-master/`
- `reference/arduino-web-flasher-main/`

### 9.2 版本历史

| 日期       | 版本 | 变更说明                                         |
| ---------- | ---- | ------------------------------------------------ |
| 2025-01-15 | 1.5  | 使用 avrgirl-arduino.global.js，成功实现固件上传 |
| 2025-01-14 | 1.4  | 尝试自定义 STK500v1 实现，遇到复位时序问题       |
| 2025-01-13 | 1.3  | 尝试使用官方库，失败                             |
| 2025-01-12 | 1.2  | 开始研究 arduino-web-flasher                     |

### 9.3 联系方式

**项目**: 液动控制系统 Web 上位机
**版本**: v1.5
**最后更新**: 2025-01-15

---

**文档结束**

✅ **恭喜！您已成功实现 Arduino 固件上传功能！**
