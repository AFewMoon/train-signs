# 列车水牌制作 · Web 版

用 Vue 3 + Canvas 复刻 Android 应用《列车水牌制作》v9.5 的静态网站：在线填写车次、站名、等级、路徽等信息，实时预览并导出高清水牌图片。

- 线上地址：<https://afewmoon.github.io/train-signs/>
- 原应用：`列车水牌制作 Android v9.5`（`org.piaoyu.directionplatemaker`）
- 技术栈：Vue 3、TypeScript、Vite、Canvas 2D

## 功能

- 10 种水牌样式：标准/套跑、套跑1–7、电子水牌1/2。
- 与原 App 一致的画布比例、字体、字号、边距、文字横向压缩与贴边算法。
- 拼音自动注音（内置原 App 的 `characters.dat` / `words.dat` 多音字地名表）。
- 列车等级与颜色、路徽、双站名、套跑、车厢号等参数。
- 导出 PNG / JPEG；本地图库（IndexedDB）。
- 纯静态、无后端，适配桌面与手机。

## 开发

```bash
npm install
npm run dev        # 本地开发
npm run build      # 类型检查 + 构建
npm run test       # 单元测试
npm run render -- plate8 plate9   # 用 Node + Skia 渲染指定水牌预览（Windows 本地校验用）
```

> 本机 npm 缓存需指向工作区（沙箱限制）：
> `$env:npm_config_cache="$PWD/.npm-cache"`

## 部署

推送到 `main` 后，GitHub Actions（[deploy.yml](.github/workflows/deploy.yml)）会自动构建并发布到 GitHub Pages。首次部署前若 Pages 未启用，可在仓库 Settings → Pages 将 Source 设为 **GitHub Actions**。

## 目录

```
public/fonts     原 App 字体（见 NOTICE）
public/icons     路徽图标
public/covers    原 App 水牌配图
public/data      拼音数据
src/core         布局引擎、文本压缩、字体、渲染
src/plates       10 个水牌模板与布局 JSON
docs/re          反向工程记录与模板规格
```

## 声明

本项目为非官方、非商业的学习交流项目，与原作者及中国国家铁路集团无关。字体、路徽与水牌配图的版权归原权利人所有，详见 [NOTICE.md](NOTICE.md)。请勿将生成的图片用于伪造运营信息或任何违法用途。
