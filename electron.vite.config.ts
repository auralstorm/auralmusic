import path from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: {
      target: 'node22.20',
      sourcemap: true,
      rollupOptions: {
        output: {
          entryFileNames: '[name].js',
        },
      },
    },
    resolve: {
      alias: {
        '@main': path.resolve(__dirname, 'src/main'),
      },
    },
  },
  preload: {
    build: {
      target: 'node22.20',
      sourcemap: true,
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].js',
        },
      },
    },
    resolve: {
      alias: {
        '@preload': path.resolve(__dirname, 'src/preload'),
      },
    },
  },
  renderer: {
    root: path.resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/renderer'),
        '@components': path.resolve(__dirname, 'src/renderer/components'),
        '@pages': path.resolve(__dirname, 'src/renderer/pages'),
        '@styles': path.resolve(__dirname, 'src/renderer/styles'),
        '@lib': path.resolve(__dirname, 'src/renderer/lib'),
        '@api': path.resolve(__dirname, 'src/renderer/api'),
      },
    },
    plugins: [react(), tailwindcss()],
  },
})
