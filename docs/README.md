# 文档中心

**版本**: v1.6
**项目**: 液动控制系统 Web 上位机

---

## 📚 文档结构

本项目文档按功能和层次进行组织，便于快速查找所需信息。

```
docs/
├── devicedoc/              # 设备控制功能文档
│   └── DEVICE_PAGE_DESIGN.md
├── timelinedoc/            # 时序功能文档
│   ├── README.md           # 时序功能索引
│   ├── TIMELINE_FEATURE_PLAN.md    # 架构：功能规划
│   ├── PROTOCOL_V1.3_UPDATE.md     # 架构：协议更新
│   └── implementation/     # 实现细节
│       ├── PHASE*.md       # 阶段完成文档
│       ├── ADD_*.md        # 功能添加
│       ├── FIX_*.md        # Bug 修复
│       └── ALGORITHM_*.md  # 算法说明
├── firmware/               # 固件上传功能文档
│   ├── README.md           # 固件功能索引
│   ├── FIRMWARE_UPLOAD_SUCCESS_GUIDE.md  # 用户指南
│   ├── QUICK_START_FIRMWARE_UPLOAD.md    # 快速开始
│   └── implementation/     # 实现细节
│           ├── *_IMPLEMENTATION.md  # 实现文档
│           ├── *_FIX.md            # 修复文档
│           └── FAILED_*.md          # 失败总结
├── UPDATE_v1.*.md          # 版本更新说明
└── README.md               # 本文档
```

---

## 🎯 快速导航

### 按角色查找

#### 👨‍💻 开发者

**了解系统架构**
1. 阅读 `../CLAUDE.md` - 项目架构文档
2. 阅读 `devicedoc/DEVICE_PAGE_DESIGN.md` - 设备控制页面设计
3. 阅读 `timelinedoc/PROTOCOL_V1.3_UPDATE.md` - 协议架构

**实现具体功能**
1. 查看 `timelinedoc/implementation/` - 时序功能实现
2. 查看 `firmware/implementation/` - 固件上传实现
3. 查看对应的功能设计文档

**排查问题**
1. 查看 `timelinedoc/implementation/FIX_*.md` - Bug 修复
2. 查看 `firmware/implementation/FAILED_*.md` - 失败总结

#### 👤 用户

**使用固件上传**
1. 阅读 `firmware/QUICK_START_FIRMWARE_UPLOAD.md` - 快速开始
2. 遇到问题查看 `firmware/FIRMWARE_UPLOAD_SUCCESS_GUIDE.md` - 完整指南

**了解系统功能**
1. 查看 `devicedoc/DEVICE_PAGE_DESIGN.md` - 设备控制说明
2. 查看版本更新文档 `UPDATE_v1.*.md`

#### 🔬 研究者

**了解设计理念**
1. 阅读 `timelinedoc/TIMELINE_FEATURE_PLAN.md` - 时序功能规划
2. 阅读 `timelinedoc/README.md` - 时序功能索引
3. 查看相关学术论文引用

---

## 📂 详细分类

### 1. 项目级文档

| 文档 | 说明 | 位置 |
|:-----|:-----|:-----|
| **CLAUDE.md** | 项目架构文档 | 项目根目录 |
| **README.md** | 项目说明 | 项目根目录 |
| **功能需求.md** | 需求文档 | 项目根目录 |
| **液动通讯协议.md** | 协议详细文档 | 项目根目录 |

### 2. 设备控制文档

| 文档 | 类型 | 说明 |
|:-----|:-----|:-----|
| **DEVICE_PAGE_DESIGN.md** | 架构 | 设备控制页面设计 |

### 3. 时序功能文档

#### 架构文档
| 文档 | 说明 |
|:-----|:-----|
| **TIMELINE_FEATURE_PLAN.md** | 可视化时间轴功能规划 |
| **PROTOCOL_V1.3_UPDATE.md** | Protocol v1.3 双通道架构 |

#### 实现文档（implementation/）
| 类别 | 文档 | 说明 |
|:-----|:-----|:-----|
| **阶段完成** | PHASE1_COMPLETED.md | Phase 1: 基础时序功能 |
| | PHASE2_*.md | Phase 2: 编辑功能（3个文档） |
| | PHASE3_SNAP_FEATURE.md | Phase 3: 吸附对齐 |
| | PHASE4_*.md | Phase 4: 执行引擎（2个文档） |
| **功能实现** | ADD_WORK_MODE_DISPLAY.md | 工作模式显示 |
| | DESIGN_PRESERVE_SEQUENCE_CONFIG.md | 保留时序配置 |
| | LOOP_MANAGER_UI_REFACTORING.md | UI 重构 |
| | INTERACTION_IMPROVEMENT.md | 交互改进 |
| **Bug 修复** | FIX_LOOP_MODE_*.md | 手动控制优化（2个文档） |
| | BUGFIX_OVERLAP_CRASH.md | 重叠崩溃修复 |
| **算法** | ALGORITHM_SNAP_DETECTION.md | 吸附检测算法 |

### 4. 固件上传文档

#### 用户指南
| 文档 | 说明 |
|:-----|:-----|
| **FIRMWARE_UPLOAD_SUCCESS_GUIDE.md** | 完整上传指南（推荐） |
| **QUICK_START_FIRMWARE_UPLOAD.md** | 快速开始 |
| **FIRMWARE_UPLOAD_TECHNICAL_SUMMARY.md** | 技术总结 |
| **OFFICIAL_UPLOADER_GUIDE.md** | 官方上传器指南 |

#### 实现文档（implementation/）
| 文档 | 说明 |
|:-----|:-----|
| **AVRGIRL_IMPLEMENTATION.md** | avrgirl-arduino 实现 |
| **FIRMWARE_UPLOAD_IMPLEMENTATION.md** | 固件上传实现 |
| **FIRMWARE_UPLOAD_FIX.md** | 固件上传修复 |
| **FIRMWARE_UPLOAD_RECONNECT.md** | 重连机制 |
| **RECONNECT_IMPLEMENTATION_SUMMARY.md** | 重连总结 |
| **FAILED_ATTEMPTS_SUMMARY.md** | 失败尝试总结 |

### 5. 版本更新文档

| 文档 | 版本 | 主要更新 |
|:-----|:-----|:---------|
| **UPDATE_v1.5.md** | v1.5 | 固件上传功能 |
| **UPDATE_v1.4.md** | v1.4 | 多页面设计 |
| **UPDATE_v1.3.md** | v1.3 | 优化提升 |
| **UPDATE_v1.2.md** | v1.2 | 横向布局 |
| **UPDATE_v1.1.md** | v1.1 | 三栏布局 |

---

## 🔍 搜索技巧

### 按关键词查找

**架构相关**
- 关键词: `PLAN`, `DESIGN`, `PROTOCOL`
- 位置: 各功能目录的顶层

**实现细节**
- 关键词: `IMPLEMENTATION`, `PHASE`, `ADD`, `FIX`
- 位置: `implementation/` 子目录

**用户指南**
- 关键词: `GUIDE`, `QUICK_START`, `SUMMARY`
- 位置: 各功能目录的顶层

**问题排查**
- 关键词: `FIX`, `BUGFIX`, `FAILED`
- 位置: `implementation/` 子目录

### 按文档类型查找

| 类型 | 后缀 | 示例 |
|:-----|:-----|:-----|
| 架构设计 | `_PLAN.md`, `_DESIGN.md` | TIMELINE_FEATURE_PLAN.md |
| 实现细节 | `_IMPLEMENTATION.md` | FIRMWARE_UPLOAD_IMPLEMENTATION.md |
| Bug 修复 | `FIX_*.md`, `BUGFIX_*.md` | FIX_LOOP_MODE_*.md |
| 阶段总结 | `PHASE*_*.md` | PHASE1_COMPLETED.md |
| 用户指南 | `*_GUIDE.md`, `QUICK_START_*.md` | FIRMWARE_UPLOAD_SUCCESS_GUIDE.md |
| 版本更新 | `UPDATE_v*.md` | UPDATE_v1.5.md |

---

## 📝 文档规范

### 命名规范

**架构文档**
- `*_PLAN.md` - 功能规划
- `*_DESIGN.md` - 设计文档
- `PROTOCOL_*.md` - 协议文档
- `README.md` - 索引文档

**实现文档**
- `PHASE*_*.md` - 阶段完成文档
- `ADD_*.md` - 新增功能
- `FIX_*.md` - Bug 修复
- `DESIGN_*.md` - 设计决策
- `ALGORITHM_*.md` - 算法说明
- `BUGFIX_*.md` - Bug 修复
- `*_IMPLEMENTATION.md` - 实现文档
- `*_REFACTORING.md` - 重构文档
- `*_IMPROVEMENT.md` - 改进文档
- `FAILED_*.md` - 失败总结

**用户文档**
- `*_GUIDE.md` - 使用指南
- `QUICK_START_*.md` - 快速开始
- `*_SUMMARY.md` - 总结文档
- `README.md` - 索引文档

**版本文档**
- `UPDATE_vX.Y.md` - 版本更新说明

### 目录组织

```
功能目录/
├── README.md                    # 功能索引（必选）
├── 架构文档1.md                 # 顶层设计
├── 架构文档2.md                 # 顶层设计
└── implementation/              # 实现细节（可选）
    ├── 阶段文档.md
    ├── 功能文档.md
    ├── 修复文档.md
    └── 算法文档.md
```

---

## 🔗 外部资源

### 技术文档
- **Vue 3**: https://vuejs.org/
- **Element Plus**: https://element-plus.org/
- **Web Serial API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API
- **Pinia**: https://pinia.vuejs.org/

### 相关论文
- ACM CHI 2022: "It Puts Life into My Creations": Understanding Fluid Fiber as a Media for Expressive Display

---

## 📊 文档统计

| 类别 | 数量 | 说明 |
|:-----|:----:|:-----|
| 架构文档 | 4 | 项目级 + 功能级 |
| 实现文档 | 24 | 具体实现细节 |
| 用户文档 | 4 | 指南和教程 |
| 版本文档 | 4 | 更新说明 |
| **总计** | **36** | 完整文档体系 |

---

## 🎯 开始使用

### 新手入门
1. 阅读 `../README.md` - 了解项目
2. 阅读 `../CLAUDE.md` - 理解架构
3. 按需查阅功能文档

### 功能开发
1. 查看对应功能的 `README.md`
2. 阅读架构文档理解设计
3. 查看实现文档了解细节

### 问题排查
1. 查看对应功能的 `implementation/` 目录
2. 查找 `FIX_*.md` 或 `BUGFIX_*.md` 文档
3. 参考失败总结文档

---

**最后更新**: 2025-01-15
**维护者**: 液动工具包项目组
