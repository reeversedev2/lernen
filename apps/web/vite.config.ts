import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@lernen/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      // Required for HMR inside Docker on macOS — inotify events
      // don't propagate through volume mounts, so Vite must poll.
      usePolling: true,
      interval: 300,
    },
    hmr: {
      // Browser connects to HMR WebSocket on the host machine,
      // not inside the container network.
      host: 'localhost',
      port: 5173,
    },
    proxy: {
      '/api': {
        // In Docker the API is reachable via its service name.
        // Locally (pnpm dev) fallback to localhost.
        target: process.env.VITE_API_URL ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
