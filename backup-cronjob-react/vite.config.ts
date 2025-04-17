import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests to backend
      '/api': 'http://localhost:8080',
      '/login': 'http://localhost:8080',
      '/logout': 'http://localhost:8080',
      '/dump': 'http://localhost:8080',
      '/upload': 'http://localhost:8080',
      '/upload-last': 'http://localhost:8080',
      '/upload-all': 'http://localhost:8080',
      '/download': 'http://localhost:8080',
      '/me': 'http://localhost:8080',
      '/auth': 'http://localhost:8080',
      '/callback': 'http://localhost:8080',
    },
  },
})
