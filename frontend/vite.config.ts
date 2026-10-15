import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { cwd } from 'node:process'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd(), '')
  const proxy = { '/api': env.API_PROXY_TARGET || 'http://localhost:8080' }
  return {
    plugins: [react()],
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, proxy },
  }
})
