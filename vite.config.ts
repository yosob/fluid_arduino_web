import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Node.js polyfills for browser
      'buffer': 'buffer',
      'events': 'events',
      'stream': 'stream-events',
      'process': 'process/browser'
    }
  },
  define: {
    // Node.js global polyfills
    global: 'globalThis',
    'process.env': '{}'
  },
  server: {
    port: 5173,
    open: true
  },
  optimizeDeps: {
    include: ['buffer', 'events', 'stream-events', 'process']
  }
})
