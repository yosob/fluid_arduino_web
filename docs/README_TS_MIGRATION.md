# TypeScript 迁移快速指南

## ✅ 已完成

### 环境配置
- ✅ TypeScript 5.9.3 安装
- ✅ tsconfig.json 配置完成
- ✅ vite.config.ts 配置完成
- ✅ 类型声明文件创建

### 核心文件迁移
- ✅ `src/utils/crc8.ts` - CRC8 校验算法
- ✅ `src/utils/protocol.ts` - 通讯协议封装
- ✅ `src/utils/serialManager.ts` - 串口管理器
- ✅ `src/stores/connection.ts` - 连接状态管理
- ✅ `src/main.ts` - 应用入口

### 类型系统
- ✅ `src/types/index.ts` - 全局类型定义
- ✅ `src/vite-env.d.ts` - Vue 环境声明
- ✅ `src/typings/avrgirl-arduino.d.ts` - 第三方库类型

## 📋 待迁移文件

### 高优先级
- ⏳ `src/stores/device.ts`
- ⏳ `src/stores/loop.ts`
- ⏳ `src/stores/timeline.ts`
- ⏳ `src/stores/log.ts`
- ⏳ `src/composables/useHeartbeat.js`
- ⏳ `src/composables/useLoopControl.js`
- ⏳ `src/composables/useSerial.js`
- ⏳ `src/utils/timelineExecutor.js`

### 中优先级（Vue 组件）
- ⏳ `src/components/pages/*.vue`
- ⏳ `src/components/device/*.vue`
- ⏳ `src/components/timeline/*.vue`

## 🚀 如何开始

### 1. 类型检查
```bash
npm run type-check
```

### 2. 开发模式
```bash
npm run dev
```

### 3. 构建项目
```bash
npm run build
```

## 📖 迁移一个文件的步骤

### JS 文件 → TS 文件

```bash
# 1. 重命名文件
mv src/utils/xxx.js src/utils/xxx.ts

# 2. 编辑文件添加类型
```

```typescript
// Before (xxx.js)
export function processData(data) {
  return data.map(item => item.value * 2)
}

// After (xxx.ts)
interface DataItem {
  value: number
}

export function processData(data: DataItem[]): number[] {
  return data.map(item => item.value * 2)
}
```

### Vue 组件添加 TS 支持

```vue
<!-- Before -->
<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<!-- After -->
<script setup lang="ts">
import { ref } from 'vue'

const count = ref<number>(0)

interface User {
  name: string
  age: number
}

const user = ref<User>({
  name: 'John',
  age: 30
})
</script>
```

## 🎯 迁移优先级建议

1. **先迁移核心工具**（utils/）- ✅ 已完成
2. **再迁移状态管理**（stores/）- 部分完成
3. **然后迁移组合函数**（composables/）- 待完成
4. **最后迁移 UI 组件**（components/）- 待完成

## 📚 详细文档

完整的迁移指南请查看：[docs/MIGRATION_JS_TO_TS.md](./MIGRATION_JS_TO_TS.md)

## ⚠️ 重要提示

- ✅ 项目支持 JS 和 TS 混合开发
- ✅ 可以逐文件渐进式迁移
- ✅ 未迁移的 JS 文件仍可正常工作
- ✅ 不影响现有功能

## 🔧 常用命令

```bash
# 类型检查（不生成文件）
npm run type-check

# 开发模式（支持热重载）
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint
```

---

**状态**: TypeScript 迁移进行中
**进度**: 核心工具和部分 Stores 已完成
**最后更新**: 2025-01-19
