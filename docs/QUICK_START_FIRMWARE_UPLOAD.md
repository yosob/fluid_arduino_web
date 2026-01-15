# Arduino 固件上传功能 - 快速移植指南

**适用场景**: 将固件上传功能移植到其他 Vue3/Vite 项目

**时间**: 约 10 分钟

---

## 📦 所需文件

从本项目复制以下文件到目标项目：

```bash
# 1. 核心库（必需）
public/avrgirl-arduino.global.js         (621 KB)

# 2. 固件文件（示例）
public/firmware/fluid_v1.hex

# 3. 组件代码（参考）
src/components/FirmwareUpdateSimple.vue

# 4. 配置文件（参考）
src/config/firmware.js
```

---

## 🚀 3 步集成

### 步骤 1: 添加核心库

```bash
# 复制文件到项目的 public 目录
cp avrgirl-arduino.global.js /your-project/public/
```

### 步骤 2: 修改 index.html

在 `</body>` 标签前添加：

```html
<body>
  <div id="app"></div>

  <!-- 添加这一行（必须在 main.js 之前） -->
  <script src="/avrgirl-arduino.global.js"></script>

  <script type="module" src="/src/main.js"></script>
</body>
```

### 步骤 3: 创建上传组件

创建 `src/components/FirmwareUpload.vue`:

```vue
<template>
  <div class="firmware-upload">
    <h2>固件上传</h2>

    <el-button
      type="primary"
      @click="upload"
      :loading="uploading"
    >
      {{ uploading ? '上传中...' : '开始上传' }}
    </el-button>

    <div v-if="uploading" class="progress">
      <el-progress :percentage="progress" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const uploading = ref(false)
const progress = ref(0)

async function upload() {
  try {
    uploading.value = true
    progress.value = 0

    // 1. 加载固件
    const response = await fetch('/firmware/your-firmware.hex')
    const arrayBuffer = await response.arrayBuffer()

    // 2. 等待库加载
    await new Promise(resolve => setTimeout(resolve, 300))

    // 3. 检查库
    if (typeof window.AvrgirlArduino === 'undefined') {
      throw new Error('avrgirl-arduino 库未加载')
    }

    // 4. 上传
    const avrgirl = new window.AvrgirlArduino({
      board: 'uno',    // Arduino Uno
      debug: true
    })

    avrgirl.flash(arrayBuffer, (error) => {
      uploading.value = false

      if (error) {
        ElMessage.error(`上传失败: ${error.message}`)
      } else {
        progress.value = 100
        ElMessage.success('固件上传成功！')
      }
    })

    // 模拟进度
    const interval = setInterval(() => {
      if (progress.value < 95) {
        progress.value += 5
      } else {
        clearInterval(interval)
      }
    }, 200)

  } catch (error) {
    uploading.value = false
    ElMessage.error(error.message)
  }
}
</script>
```

---

## ✅ 验证

1. **启动项目**: `npm run dev`

2. **打开浏览器**: Chrome/Edge（需要 89+ 版本）

3. **打开控制台**（F12），应该看到：
   ```
   ✓ avrgirl-arduino 加载成功
   ```

4. **测试上传**: 点击"开始上传"按钮

5. **选择串口**: 在弹出对话框中选择 Arduino 串口

6. **等待完成**: 约 5-10 秒后显示"固件上传成功"

---

## 🔧 配置选项

### 修改板卡类型

```javascript
const avrgirl = new window.AvrgirlArduino({
  board: 'uno',    // 'nano', 'mega', 'micro' 等
  debug: true
})
```

### 禁用调试日志

```javascript
const avrgirl = new window.AvrgirlArduino({
  board: 'uno',
  debug: false   // 关闭日志输出
})
```

### 自定义固件路径

```javascript
// 修改 fetch 路径
const response = await fetch('/custom/path/to/firmware.hex')
```

---

## 📋 注意事项

### ⚠️ 必须满足

1. **浏览器**: Chrome 89+ 或 Edge 89+
2. **访问方式**:
   - 开发：`http://localhost` 或 `http://127.0.0.1`
   - 生产：`https://`（必须有 SSL 证书）
3. **文件路径**: `/avrgirl-arduino.global.js`（注意开头的 `/`）

### ⚠️ 常见错误

**错误**: `window.AvrgirlArduino is undefined`

**解决**:
1. 确认使用了 `.global.js` 文件（不是普通版本）
2. 确认 script 标签在 main.js 之前
3. 硬刷新浏览器（Ctrl+F5）

**错误**: `Web Serial API is not supported`

**解决**:
1. 更换浏览器到 Chrome/Edge
2. 确认浏览器版本 >= 89

**错误**: `Failed to open serial port`

**解决**:
1. 关闭 Arduino IDE 串口监视器
2. 关闭其他占用串口的程序
3. 重新插拔 USB 线

---

## 📚 更多信息

详细文档请参考：
- **完整实现指南**: `docs/FIRMWARE_UPLOAD_SUCCESS_GUIDE.md`
- **项目架构**: `CLAUDE.md`
- **avrgirl-arduino**: https://github.com/noopkat/avrgirl-arduino
- **参考项目**: https://github.com/andreasnordstrand/arduino-web-flasher

---

**完成！** 🎉

有任何问题，请参考详细文档或查看浏览器控制台输出。
