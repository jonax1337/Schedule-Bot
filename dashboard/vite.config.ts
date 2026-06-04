import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Read BOT_API_URL without forcing a VITE_ prefix on the deploy env.
  // process.env wins (Docker ARG -> ENV, Railway service vars), then .env files, then default.
  const fileEnv = loadEnv(mode, process.cwd(), '')
  const botApiUrl = process.env.BOT_API_URL ?? fileEnv.BOT_API_URL ?? 'http://localhost:3001'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 3000,
      // Serve every team on its own subdomain locally: g2.localhost:3000, etc.
      // Browsers resolve *.localhost to 127.0.0.1 automatically.
      allowedHosts: ['localhost', '.localhost'],
    },
    define: {
      __BOT_API_URL__: JSON.stringify(botApiUrl),
    },
  }
})
