import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: { port: 5173 },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(
        process.env.VITE_API_URL || env.VITE_API_URL || 'https://msmview.onrender.com/api'
      )
    }
  }
})