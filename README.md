# 列车水牌制作 · Web 版

用 Vue 3 + Canvas 复刻 Android 应用《列车水牌制作》v9.5 的静态网站：在线填写车次、站名、等级、路徽等信息，实时预览并导出高清水牌图片。

- 线上地址：<https://afewmoon.github.io/train-signs/>
- 原应用：`列车水牌制作 Android v9.5`（`org.piaoyu.directionplatemaker`）
- 技术栈：Vue 3、TypeScript、Vite、Canvas 2D

![标准/套跑](docs/previews/plate0.png)
![套跑5](docs/previews/plate5.png)
![电子水牌1](docs/previews/plate8.png)

## 功能

- **10 种水牌样式**：标准/套跑、套跑1–7、电子水牌1/2，比例与设计高度取自各页 `K(...)` 常量。
- **按反编译常量还原**：画布尺寸、字体、字号、边距、相对布局、文字横向压缩（`fit` / `fitLength`）、贴边、双站名、套跑权重、路徽缩放等。
- **自动注音**：内置原 App 的 `characters.dat` / `words.dat` 多音字地名表，中文站名变化时自动填充拼音。
- **列车等级与颜色**：19–22 种预设等级色（直达/特快/快速/普快/普客/临客/路用/旅游/通勤），支持自定义等级文字。
- **14 种路徽**：来自原 App `mipmap-nodpi`。
- **导出与图库**：PNG / WebP / **SVG 真矢量**导出；自定义导出宽度（1370/1920/2560/4096 或任意 320–8192px，宽高比锁定）；IndexedDB 本地图库；空格样式与图片格式设置持久化。
- **渐进加载与缓存**：字体按需加载并写入 Cache API，切换模板先显示占位、字体就绪后自动替换；导航使用 WebP 缩略图，二次访问字体不再重复下载。
- **纯静态、无后端**：桌面与手机自适应，支持 `?` 无路由直开（单页）。

## 导出

- 默认 1370px 宽（与原 App 参考版心一致），可在“设置 → 导出分辨率”中选择预设或输入 320–8192px 的自定义宽度；高度按水牌比例自动计算，画布面积限制 1600 万像素。
- **PNG / WebP**：按所选分辨率重新排版并导出，图库保存同分辨率 PNG。
- **SVG**：文字转为字体轮廓路径、路徽内嵌 data URI，自包含且可无损放大，适合印刷；极少数生僻字/字体不可用时会自动回退为该文字框的位图嵌入。

## 已知差异与限制

- 原 App 的封面配图是设计稿，中文/拼音常带人工字距；Web 端严格按源码渲染，故字距更紧凑。
- “自定义等级颜色”在原 App 支持 6 位颜色代码/取色器，目前为预设色 + 自定义文字。
- 套跑页的“交换/重排”在原 App 是带状态的 View 搬移，Web 用复选框语义近似；部分镜像顺序与 App 略有不同。
- Plate4 附加车次区在原 App 会增高画布，Web 固定 5.15 比例，开启后附加文字可能裁底。
- 电子水牌长文本为 Marquee 滚动，导出取当前帧（与原 App 一致）。
- 首次使用某个模板需要下载其字体（约 0.5–10MB，取决于模板）；字体就绪前预览使用系统字体占位，完成后自动替换。字体写入 Cache API，二次访问不再重复下载。
- SVG 的文字已转路径，不能再作为文本编辑；极少数生僻字会以位图文字回退。
- 仅做静态逆向分析，未在真机运行原 App；字体度量差异已用 `lineHeightFactor`/`baselineOffset` 按封面校准，详见 [docs/re/plate-matrix.md](docs/re/plate-matrix.md)。

## 许可证

本项目 **代码** 以 [GNU Affero General Public License v3.0](LICENSE)（AGPL-3.0-only）授权，源码仓库即对应源码。

`public/fonts`、`public/icons`、`public/covers`、`public/data` 为从原 App 提取的第三方素材（字体、路徽、配图、拼音数据），**不属于 AGPL 授权范围**，版权归原权利人所有，使用限制见 [NOTICE.md](NOTICE.md)。

## 开发

```bash
npm install
npm run dev        # 本地开发
npm run build      # 类型检查 + 构建
npm run test       # 单元测试（109 例）
npm run render -- plate8 plate9   # Node + Skia 渲染预览图到 analysis/（Windows 本地校验用）
npm run covers     # 重新生成 public/covers/thumbs 下的 WebP 缩略图
```

> 本机 npm 缓存需指向工作区（沙箱限制）：
> `$env:npm_config_cache="$PWD/.npm-cache"`

## 部署

推送到 `main` 后，GitHub Actions（[deploy.yml](.github/workflows/deploy.yml)）会执行测试、构建并发布到 GitHub Pages。仓库 Settings → Pages 的 Source 需为 **GitHub Actions**。

若本机 `git push` 因网络不可用，可用 GitHub API 回退同步（需要具 `contents:write` 的 token）：

```powershell
$env:GITHUB_TOKEN = '<token>'
$env:GITHUB_REPO = 'AFewMoon/train-signs'
$env:GITHUB_MESSAGE = 'feat: ...'
npm run sync
```

## 目录

```
public/fonts     原 App 字体（见 NOTICE）
public/icons     路徽图标（14 种）
public/covers    原 App 水牌配图（thumbs/ 为导航用 WebP 缩略图）
public/data      拼音数据（characters.dat / words.dat）
src/core         布局引擎、文本压缩、字体、拼音、渲染、设置/图库
src/plates       10 个水牌模板 + 从 XML 提取的布局 JSON
src/components   预览、设置、图库等组件
docs/re          反向工程记录、移植指南、模板矩阵
docs/previews    渲染示例
```

## 声明

本项目为非官方、非商业的学习交流项目，与原作者及中国国家铁路集团无关。字体、路徽与水牌配图的版权归原权利人所有，详见 [NOTICE.md](NOTICE.md)。请勿将生成的图片用于伪造运营信息或任何违法用途。
