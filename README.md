# 液动控制系统 Web 上位机

基于 Vue3 + Element Plus 的气液泵控制系统 Web 上位机，通过 Web Serial API 与 Arduino 下位机通信。

## 🌟 特性

- ✅ 双通道独立控制（每通道 1 个气泵 + 2 个液泵）
- ✅ 实时 PWM 调节（0-255）
- ✅ 循环时序执行功能
- ✅ 心跳保活机制（3 秒超时保护）
- ✅ 紧急停止功能
- ✅ 串口实时通信（115200 波特率）
- ✅ 美观的用户界面

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- Chrome 或 Edge 浏览器（支持 Web Serial API）
- Arduino 开发板（已烧录下位机代码）

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173` 即可使用。

### 构建生产版本

```bash
npm run build
```

## 📖 使用说明

### 1. 连接设备

点击"连接串口"按钮，选择对应的 Arduino 串口。

### 2. 控制泵

- 点击泵卡片可启动/停止泵
- 拖动滑块调整 PWM 值
- 单通道同一时间只能有一个泵工作

### 3. 循环模式

1. 点击"添加"按钮创建时序指令
2. 点击"开始"执行循环
3. 支持"暂停"/"继续"/"停止"操作

### 4. 紧急停止

点击"🛑 紧急停止所有泵"按钮可立即停止所有通道。

## 📁 项目结构

```
fliud_v0_web/
├── src/
│   ├── components/      # Vue 组件
│   ├── composables/     # 组合式函数
│   ├── stores/          # Pinia 状态管理
│   ├── utils/           # 工具函数
│   ├── App.vue          # 根组件
│   └── main.js          # 入口文件
├── reference/           # Arduino 下位机代码
├── CLAUDE.md           # 项目文档
├── TEST.md             # 测试文档
└── README.md           # 本文件
```

## 🔧 技术栈

- **Vue 3**: 组合式 API
- **Vite**: 构建工具
- **Element Plus**: UI 组件库
- **Pinia**: 状态管理
- **Web Serial API**: 串口通信

## 📊 通讯协议

数据帧格式: `AA 55 | CMD | LEN | DATA | CRC8`

详细协议说明请查看 `液动通讯协议.md`。

## 🧪 测试

详细的测试文档请查看 `TEST.md`。

## ❓ 常见问题

### Web Serial API 不工作？

确保使用 Chrome 或 Edge 浏览器，并通过 `https://` 或 `http://localhost` 访问。

### 串口连接失败？

检查 Arduino 是否正确连接，确认串口未被其他程序占用。

### 心跳超时？

确认 Arduino 下位机代码已正确烧录，模式开关在 ONLINE 位置。

## 📄 许可证

本项目为内部项目，版权归项目组所有。

## 👥 项目组

液动工具包项目组

---

**版本**: 1.0
**更新日期**: 2025-01-14
