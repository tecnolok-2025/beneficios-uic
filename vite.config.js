import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:10000', '/actualizar-version': 'http://localhost:10000' } },
  build: { sourcemap: false }
})
