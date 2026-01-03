import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl(), // Enable HTTPS for Web Share API on mobile
  ],
  server: {
    host: true, // Expose on network for mobile debugging
    https: true, // Enable HTTPS
  },
})
