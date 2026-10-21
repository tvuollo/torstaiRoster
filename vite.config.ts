import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    // `npm run api` serves the PHP admin API here during development
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
