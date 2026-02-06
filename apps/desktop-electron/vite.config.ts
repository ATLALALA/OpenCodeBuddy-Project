import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  publicDir: resolve(__dirname, '../../'), // 项目根目录作为 public
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    fs: {
      // 允许访问项目根目录的 ArtAssets 和 Config
      allow: [
        resolve(__dirname, '../../'),
      ],
    },
  },
});
