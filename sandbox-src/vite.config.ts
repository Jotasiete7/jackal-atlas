import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: '../sandbox',
    emptyOutDir: true,
  },
});
