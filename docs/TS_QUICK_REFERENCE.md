# TypeScript 迁移快速参考

**版本**: v1.6
**TypeScript**: 5.9.3
**更新时间**: 2025-01-19

---

## 🚀 快速开始

### 1. 类型检查

```bash
# 运行类型检查
npm run type-check

# 构建（包含类型检查）
npm run build

# 开发模式
npm run dev
```

### 2. 文件扩展名

```
.js → .ts
.vue.js → .vue.ts (或保持 .vue 使用 lang="ts")
```

---

## 📋 常用类型定义

### 接口定义

```typescript
// 基础接口
interface DeviceState {
  hardwareVersion: string
  firmwareVersion: string
  name: string
}

// 可选属性
interface TimelineConfig {
  totalDuration: number
  loopCount: number
  interval?: number    // 可选
}

// 只读属性
interface ReadOnlyConfig {
  readonly version: string
  readonly buildTime: number
}

// 嵌套接口
interface ChannelState {
  pumpType: PumpType
  pwm: number
  isRunning: boolean
}

interface DeviceState {
  channels: {
    ch1: ChannelState
    ch2: ChannelState
  }
}
```

### 枚举定义

```typescript
// 数字枚举
enum PumpType {
  AIR = 0,
  LIQUID1 = 1,
  LIQUID2 = 2,
  STOP = 255
}

// 字符串枚举
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  ERROR = 'error'
}

// 使用
const pump: PumpType = PumpType.AIR
```

### 类型别名

```typescript
// 基本别名
type ChannelKey = 'ch1' | 'ch2'
type PumpKey = 'air' | 'water1' | 'water2'

// 函数类型
type SerialWriter = (data: Uint8Array) => Promise<void>
type Callback = (error: Error | null) => void

// 联合类型
type Status = 'running' | 'paused' | 'stopped'
type NumberOrString = number | string

// 类型映射
type DeviceStateMap = Record<ChannelKey, ChannelState>
```

---

## 🔧 常见模式

### Pinia Store (Composition API)

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useConnectionStore = defineStore('connection', () => {
  // State
  const connected = ref<boolean>(false)
  const deviceInfo = ref<DeviceInfo>({
    hardwareVersion: '-',
    firmwareVersion: '-',
    name: '-'
  })

  // Getters
  const deviceDisplayName = computed(() =>
    `${deviceInfo.value.name} (${deviceInfo.value.hardwareVersion})`
  )

  // Actions
  function setConnected(value: boolean): void {
    connected.value = value
  }

  return {
    connected,
    deviceInfo,
    deviceDisplayName,
    setConnected
  }
})
```

### Pinia Store (Options API)

```typescript
import { defineStore } from 'pinia'

export const useTimelineStore = defineStore('timeline', {
  state: () => ({
    channels: {
      ch1: [] as SegmentData[],
      ch2: [] as SegmentData[]
    }
  }),

  getters: {
    totalSegments(): number {
      return this.channels.ch1.length + this.channels.ch2.length
    }
  },

  actions: {
    addSegment(channel: 'ch1' | 'ch2', segment: SegmentData): void {
      this.channels[channel].push(segment)
    }
  }
})
```

### Composable

```typescript
import { ref } from 'vue'

export function useSerial() {
  const connected = ref<boolean>(false)

  async function connect(): Promise<boolean> {
    // ...
    return true
  }

  function disconnect(): void {
    // ...
  }

  return {
    connected,
    connect,
    disconnect
  }
}
```

### 类

```typescript
export class TimelineExecutor {
  private isRunning = false
  private config: TimelineConfig | null = null

  private onProgress: ((data: ProgressData) => void) | null = null
  private onError: ((error: string) => void) | null = null

  setCallbacks(callbacks: TimelineCallbacks): void {
    this.onProgress = callbacks.onProgress || null
    this.onError = callbacks.onError || null
  }

  async execute(config: TimelineConfig): Promise<void> {
    if (!this.serialWrite) {
      this.onError?.('串口未连接')
      return
    }

    try {
      // 执行逻辑
    } catch (error) {
      const err = error as Error
      this.onError?.(err.message)
    }
  }
}
```

---

## 🛠️ 类型工具

### 类型守卫

```typescript
// typeof
function process(value: string | number) {
  if (typeof value === 'string') {
    // 这里 value 是 string
    console.log(value.toUpperCase())
  } else {
    // 这里 value 是 number
    console.log(value.toFixed(2))
  }
}

// instanceof
function processValue(value: Date | string) {
  if (value instanceof Date) {
    // 这里 value 是 Date
    console.log(value.getFullYear())
  } else {
    // 这里 value 是 string
    console.log(value.toUpperCase())
  }
}

// 自定义类型守卫
interface Fish {
  swim: () => void
}

interface Bird {
  fly: () => void
}

function isFish(pet: Fish | Bird): pet is Fish {
  return 'swim' in pet
}

function move(pet: Fish | Bird) {
  if (isFish(pet)) {
    pet.swim()  // TypeScript 知道这是 Fish
  } else {
    pet.fly()   // TypeScript 知道这是 Bird
  }
}
```

### 类型断言

```typescript
// as 断言（尽量避免使用）
const value = data as string

// 非空断言（确定值不为 null/undefined）
function process(value: string | null) {
  const str = value!  // 告诉 TypeScript 这里不是 null
  console.log(str.toUpperCase())
}

// 双重断言（最后手段）
const value = data as unknown as MyType
```

### 泛型

```typescript
// 基础泛型
function identity<T>(value: T): T {
  return value
}

const num = identity<number>(42)
const str = identity('hello')

// 泛型约束
interface Lengthwise {
  length: number
}

function logLength<T extends Lengthwise>(arg: T): void {
  console.log(arg.length)
}

logLength('hello')  // ✅
logLength([1, 2, 3])  // ✅
// logLength(42)  // ❌ 没有length属性

// 泛型接口
interface Box<T> {
  value: T
}

const numberBox: Box<number> = { value: 42 }
const stringBox: Box<string> = { value: 'hello' }
```

---

## ⚠️ 常见错误和解决

### 错误 1: Property does not exist

```typescript
// ❌ 错误
const data: any = {}
data.name = 'John'

// ✅ 解决 1: 定义类型
interface Person {
  name: string
}
const data: Person = { name: 'John' }

// ✅ 解决 2: 使用接口
interface Person {
  name?: string  // 可选
}
const data: Person = {}
data.name = 'John'
```

### 错误 2: Type 'X' is not assignable to type 'Y'

```typescript
// ❌ 错误
let num: number = '123'

// ✅ 解决 1: 类型转换
let num: number = Number('123')

// ✅ 解决 2: 联合类型
let value: string | number = '123'
value = 456

// ✅ 解决 3: 类型断言
let num = '123' as unknown as number  // 不推荐
```

### 错误 3: Object is possibly 'null' or 'undefined'

```typescript
// ❌ 错误
function process(value: string | null) {
  console.log(value.toUpperCase())  // value 可能是 null
}

// ✅ 解决 1: 检查
function process(value: string | null) {
  if (value !== null) {
    console.log(value.toUpperCase())  // 安全
  }
}

// ✅ 解决 2: 可选链
function process(value: string | null) {
  console.log(value?.toUpperCase())  // 如果是 null 返回 undefined
}

// ✅ 解决 3: 非空断言
function process(value: string | null) {
  console.log(value!.toUpperCase())  // 确定不为 null
}

// ✅ 解决 4: 空值合并
function process(value: string | null) {
  const str = value ?? 'default'
  console.log(str.toUpperCase())
}
```

### 错误 4: Parameter implicitly has an 'any' type

```typescript
// ❌ 错误
function process(value) {  // value 隐式 any
  console.log(value)
}

// ✅ 解决 1: 明确类型
function process(value: string): void {
  console.log(value)
}

// ✅ 解决 2: any 类型（不推荐）
function process(value: any): void {
  console.log(value)
}

// ✅ 解决 3: unknown 类型（推荐）
function process(value: unknown): void {
  if (typeof value === 'string') {
    console.log(value)
  }
}
```

### 错误 5: Cannot find module

```typescript
// ❌ 错误
import { something } from './myfile'  // 找不到 myfile

// ✅ 解决 1: 添加扩展名
import { something } from './myfile.ts'

// ✅ 解决 2: 添加类型声明
// myfile.d.ts
declare module './myfile' {
  export function something(): void
}

// ✅ 解决 3: 检查路径
import { something } from '@/utils/myfile'  // 使用 @ 别名
```

---

## 🎯 最佳实践清单

### ✅ DO（推荐）

```typescript
// ✅ 明确类型
function process(value: string): void {
  console.log(value)
}

// ✅ 使用接口
interface Person {
  name: string
  age: number
}

// ✅ 使用枚举
enum Status {
  Active = 1,
  Inactive = 0
}

// ✅ 类型守卫
function isString(value: unknown): value is string {
  return typeof value === 'string'
}

// ✅ 可选链
const name = user?.profile?.name

// ✅ 空值合并
const value = input ?? 'default'

// ✅ readonly
function process(config: Readonly<Config>): void {
  // config 不能被修改
}

// ✅ as const
const config = {
  api: 'https://api.example.com',
  timeout: 5000
} as const
```

### ❌ DON'T（避免）

```typescript
// ❌ 使用 any
function process(value: any) {  // 避免
  console.log(value)
}

// ❌ 使用 @ts-ignore（除非必要）
// @ts-ignore
const value = someUndefinedVariable

// ❌ 类型断言过度使用
const str = data as string  // 避免

// ❌ 非空断言不安全
function process(value: string | null) {
  console.log(value!.toUpperCase())  // 可能运行时错误
}

// ❌ 可选属性过度使用
interface Config {
  name?: string  // 如果是必需的，不要用可选
  age?: number
}
```

---

## 📊 项目统计

### 已完成文件

| 类别 | 数量 | 代码行数 |
|-----|------|---------|
| 类型定义 | 2 | 300+ |
| 工具函数 | 4 | 1500+ |
| Stores | 5 | 800+ |
| Composables | 3 | 700+ |
| **总计** | **14** | **3300+** |

### 类型定义

- 接口: 25+
- 类型别名: 15+
- 枚举: 8+

---

## 🔗 相关文档

- **MIGRATION_JS_TO_TS.md** - 完整迁移指南
- **TS_BEST_PRACTICES.md** - 最佳实践
- **TS_MIGRATION_PROGRESS.md** - 进度报告
- **README_TS_MIGRATION.md** - 快速开始

---

## 📞 获取帮助

### 检查类型

```bash
# 查看类型错误详情
npm run type-check

# 查看具体文件类型
npx tsc --noEmit src/utils/protocol.ts
```

### 调试技巧

```typescript
// 1. 使用类型断言查看推断类型
const value = data as any  // 临时查看

// 2. 使用 typeof 查看类型
type MyType = typeof someValue

// 3. 使用 keyof 获取键
type Keys = keyof MyInterface

// 4. 使用 ReturnType 获取返回类型
type Return = ReturnType<typeof myFunction>
```

---

**文档版本**: 1.0
**最后更新**: 2025-01-19
**项目**: 液动控制系统 Web 上位机 v1.6
