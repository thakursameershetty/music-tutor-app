import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    allowedHosts: true,
    // Proxy is only for local dev, you can leave it or remove it.
    // It won't affect Vercel deployment.
  }
})