import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    glsl({
      include: ['**/*.glsl', '**/*.vert', '**/*.frag', '**/*.vs', '**/*.fs'],
    }),
  ],
  resolve: {
    alias: [
      // Direct barrel imports (must come before wildcard patterns)
      { find: '@/hooks', replacement: path.resolve(__dirname, './src/api/hooks') },
      { find: '@/stores', replacement: path.resolve(__dirname, './src/stores') },
      { find: '@/types', replacement: path.resolve(__dirname, './src/types') },
      { find: '@/utils', replacement: path.resolve(__dirname, './src/utils') },
      { find: '@/api', replacement: path.resolve(__dirname, './src/api') },
      { find: '@/shaders', replacement: path.resolve(__dirname, './src/shaders') },
      { find: '@/simulation', replacement: path.resolve(__dirname, './src/simulation') },
      { find: '@/components', replacement: path.resolve(__dirname, './src/components') },
      // Catch-all for @/*
      { find: /^@\/(.*)/, replacement: path.resolve(__dirname, './src/$1') },
    ],
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          'react-three': [
            '@react-three/fiber',
            '@react-three/drei',
            '@react-three/postprocessing',
          ],
          d3: ['d3-force', 'd3-scale', 'd3-color'],
        },
      },
    },
  },
})
