import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: '../sandbox',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three';
          }
        },
      },
    },
  },
});
