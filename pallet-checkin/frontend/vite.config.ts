import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Pinned (not just Vite's default 5173) so the backend's CORS
    // allowlist (FRONTEND_ORIGIN) always matches reality. strictPort
    // makes a port conflict fail loudly instead of silently drifting to
    // the next free port — a silent drift is exactly what caused a CORS
    // mismatch ("Failed to fetch") when a stale leftover dev server was
    // still occupying this port.
    port: 5174,
    strictPort: true,
  },
})
