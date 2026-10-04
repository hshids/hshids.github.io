import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: {
    outDir: 'assets/three/dist',
    emptyOutDir: true,
    lib: { entry: 'assets/three/src/magic-world.js', formats: ['es'], fileName: () => 'faithful-world.js' },
    rollupOptions: { output: { assetFileNames: '[name][extname]', chunkFileNames: '[name]-[hash].js' } },
    target: 'es2020',
    sourcemap: false
  }
});
