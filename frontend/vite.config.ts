import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// Biến chung cho origin API
// const API_ORIGIN = 'https://dump.uniko.id.vn'
const API_ORIGIN = 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // Quy tắc proxy duy nhất cho tất cả các API endpoints
      '^/api/.*': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      // Các đường dẫn không bắt đầu bằng /api
      '/dump': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/upload': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/upload-last': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/upload-all': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/download': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
