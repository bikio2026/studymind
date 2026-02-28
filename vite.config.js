import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3060,
    proxy: {
      '/api': {
        target: 'http://localhost:3061',
        changeOrigin: true,
      },
    },
  },
})
