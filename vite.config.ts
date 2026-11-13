import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Pages 项目站点部署在 /train-signs/ 子路径下；本地开发使用根路径。
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/train-signs/' : '/',
  plugins: [vue()],
  resolve: {
    alias: {
      // 强制使用 ESM 构建，避免 UMD 默认导出在动态 import 下缺少 named export。
      'opentype.js': fileURLToPath(new URL('./node_modules/opentype.js/dist/opentype.mjs', import.meta.url)),
    },
  },
  build: {
    // 字体、图标均放在 public/ 下按原文件名提供，不做内联。
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
  },
})
