import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],

  server: {
    port: 5173,
    open: true,

    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,

        // optional: remove /api prefix if your backend doesn't use it
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})