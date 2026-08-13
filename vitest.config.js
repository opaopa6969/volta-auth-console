import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // JSX を含むテスト（コンポーネント / routes.jsx）を読むために必要 (#22)。
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
