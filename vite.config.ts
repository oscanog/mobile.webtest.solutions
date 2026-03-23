import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://localhost/bugcatcher',
        changeOrigin: true,
      },
      '/ws/notifications': {
        target: 'ws://127.0.0.1:8090',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
