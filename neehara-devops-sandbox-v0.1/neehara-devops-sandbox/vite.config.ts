import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3001,
    allowedHosts: ["neehar-124.ngrok-free.app"],
    watch: {
      usePolling: true
    }
  }
})
