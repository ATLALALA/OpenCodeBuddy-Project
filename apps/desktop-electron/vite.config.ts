import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  publicDir: false, // 禁用默认 publicDir 行为，防止递归复制
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: resolve(__dirname, '../../ArtAssets'),
          dest: 'ArtAssets'
        },
        {
          src: resolve(__dirname, '../../Config'),
          dest: 'Config'
        }
      ]
    })
  ],
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
