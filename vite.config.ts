import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@preload': path.resolve(__dirname, 'src/preload'),
      '@components': path.resolve(__dirname, 'src/renderer/components'),
      '@pages': path.resolve(__dirname, 'src/renderer/pages'),
      '@styles': path.resolve(__dirname, 'src/renderer/styles'),
      '@lib': path.resolve(__dirname, 'src/renderer/lib'),
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json', '.css'],
  },
  plugins: [react(), tailwindcss()],
})
