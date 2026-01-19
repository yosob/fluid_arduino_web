/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Web Serial API 类型声明
declare global {
  interface SerialPort extends SerialPort {
    productId: number
    vendorId: number
  }
}

export {}
