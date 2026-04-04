import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/console/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 3400,
    allowedHosts: ['auth-console.unlaxer.org'],
    proxy: {
      '/api': { target: 'http://localhost:7070', changeOrigin: true },
      '/auth': { target: 'http://localhost:7070', changeOrigin: true },
      '/login': { target: 'http://localhost:7070', changeOrigin: true },
      '/callback': { target: 'http://localhost:7070', changeOrigin: true },
      '/select-tenant': { target: 'http://localhost:7070', changeOrigin: true },
      '/healthz': { target: 'http://localhost:7070', changeOrigin: true },
      '/.well-known': { target: 'http://localhost:7070', changeOrigin: true },
      '/css': { target: 'http://localhost:7070', changeOrigin: true },
      '/js': { target: 'http://localhost:7070', changeOrigin: true },
    },
  },
})
