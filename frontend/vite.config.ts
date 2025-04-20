import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// Biến chung cho origin API
const API_ORIGIN = 'https://dump.uniko.id.vn'
// const API_ORIGIN = 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/login': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/logout': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/auth': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/auth/google/login': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/me': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/callback': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/config': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/backups': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/backup': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/profiles': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/auth/url': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/auth/callback': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/drive/auth-url': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/drive/auth-callback': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/drive/status': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/api/drive/info': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
      '/delete-backup': {
        target: API_ORIGIN,
        changeOrigin: true,
        secure: false
      },
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
      },
      '/api/drive/disconnect': {
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
