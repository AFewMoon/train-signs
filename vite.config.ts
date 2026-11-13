import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Pages 项目站点部署在 /train-signs/ 子路径下；本地开发使用根路径。
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/train-signs/' : '/',
  plugins: [vue()],
  build: {
    // 字体、图标均放在 public/ 下按原文件名提供，不做内联。
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
  },
})
