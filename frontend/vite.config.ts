import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/login': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/logout': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/auth/google/login': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/me': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/callback': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/config': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/backups': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/backup': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/profiles': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/auth/url': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/auth/callback': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/drive/auth-url': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/drive/auth-callback': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/drive/status': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/delete-backup': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/dump': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/upload': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/upload-last': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/upload-all': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/download': {
        target: 'http://localhost:8080',
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
