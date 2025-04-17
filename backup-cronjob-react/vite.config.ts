import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
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
  }
})
