import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Single source of truth for API contracts — see shared/contracts.js
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    fs: {
      // Allow Vite to read the shared/ folder, which lives outside the
      // frontend workspace root.
      allow: [path.resolve(__dirname, '..')],
    },
  },
})
