import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    host: true, // 允许通过本机 IP 或公网代理访问（默认仅 localhost）
    port: 5173,
    proxy: {
      // Proxy MinerU API requests to bypass CORS
      // Target can be overridden via VITE_MINERU_URL env variable
      '/api/mineru': {
        target: process.env.VITE_MINERU_URL || 'http://192.168.18.206:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mineru/, ''),
      },
      // Backend API Proxy
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})
