import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const proxyTarget = process.env.ION_PULSE_PROXY_TARGET || 'http://127.0.0.1:8000'
const proxy = {
  '/api': { target: proxyTarget, changeOrigin: false },
  '/uploads': { target: proxyTarget, changeOrigin: false },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    allowedHosts: ['games-service.ion-pulse.keenetic.pro'],
    proxy,
  },
  preview: { proxy },
})
