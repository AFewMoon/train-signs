# AGENTS.md — 列车水牌 Web 复刻项目经验

本文件记录在本仓库（Windows + DSH 沙箱）中完成「逆向 APK → Vue 静态站 → GitHub Pages」时验证过的经验、命令与坑，供后续 Agent 复用。项目说明见 [README.md](README.md)，逆向细节见 [docs/re/README.md](docs/re/README.md)，模板常量见 [docs/re/plate-matrix.md](docs/re/plate-matrix.md)。

## 1. 项目边界

- 目标产物是**纯静态** Vue 3 + Canvas 站点；`public/` 下包含原 App 字体、路徽与配图（用户明确要求完整内嵌），版权与免责见 [NOTICE.md](NOTICE.md)。
- `列车水牌制作 Android v9.5.apk`、`jadx-gui-*/`、`rea-rea-agents-*/`、`analysis/` 均**不入库**（见 `.gitignore`）；反编译产物只用于本地分析。
- 10 个模板对应 `Plate0`–`Plate9`：标准/套跑、套跑1–7、电子水牌1/2；每页一个 `src/plates/plateN.ts`。

## 2. 环境与工具链（Windows 沙箱）

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `npm.ps1 cannot be loaded` | PowerShell 执行策略 | 用 `npm.cmd` |
| `npm` 写入 `%LocalAppData%\npm-cache` 报 EPERM | 沙箱只允许写工作区 | `$env:npm_config_cache="$PWD\.npm-cache"`（已 gitignore） |
| `npm install` 生命周期脚本 `spawn EPERM` | 沙箱禁止带管道的子进程 | 加 `--ignore-scripts`（本项目依赖的 prebuilt 包无需脚本） |
| Vitest 默认 forks 报 `spawn EPERM` | 同上 | `vitest.config.ts` 使用 `pool: 'threads'`、`maxWorkers: 1` |
| `tsx` / esbuild JS API 报 `spawn EPERM` | esbuild 服务进程管道 | 直接调用 `node_modules/@esbuild/win32-x64/esbuild.exe`（见 `scripts/preview.cmd`） |
| 需要执行 git 并读取输出 | 管道 stdio 被禁 | Node `spawnSync('git', [...], { stdio: ['ignore', fd, 'inherit'] })`，stdout 重定向到文件 |
| headless Edge/Chrome 启动失败 | 浏览器沙箱/命名管道被拒 | 不用浏览器截图；用 `@napi-rs/canvas` + Node 渲染预览，`read_image` 查看 |
| 编辑文件偶发 `EIO / FS_STALE` | Vite watcher/杀软占用句柄 | 停止 `npm run dev`；稍后重试 edit（本仓库开发时未依赖 dev server） |
| jadx 启动报 `AccessDeniedException ...\AppData\Roaming\skylot` | 配置目录在沙箱外 | `JADX_CONFIG_DIR` / `JADX_CACHE_DIR` 指向 `analysis/` 下（见下） |

### jadx 反编译命令

```powershell
$env:JADX_CONFIG_DIR="$PWD\analysis\jadx-config"
$env:JADX_CACHE_DIR="$PWD\analysis\jadx-cache"
& .\jadx-gui-1.5.6-with-jre-win\jre\bin\java.exe -Xmx2g `
  -cp .\jadx-gui-1.5.6-with-jre-win\lib\jadx-gui-1.5.6-all.jar `
  jadx.cli.JadxCLI "列车水牌制作 Android v9.5.apk" -d analysis\jadx --threads-count 8
```

- REA 6.9.0 的运行要求 Node `^24.22.1`（本机 24.21.0）且 Android 桥接依赖未初始化的 `third_party/jadx-headless-mcp`；**只采用其 `reverse-engineer-anything` 工作流作为方法论**，实际引擎用 jadx CLI，不改 REA 源码。
- jadx 能恢复原始资源名（`res/layout/activity_plate_N.xml`），比 AndResGuard 的混淆名好用；活动类 `Plate0Activity`–`Plate9Activity` 未被混淆。

## 3. 反向工程与布局还原经验

### 提取布局

- `scripts/extract-layouts.mjs` 从 `activity_plate_N.xml` 的预览子树生成 `src/plates/layouts/plateN.json`。
- **必须用 `fast-xml-parser` 的 `preserveOrder: true`**：默认会按标签名合并同名子节点，打乱 `tv_start_1 → v_left → tv_end_1` 这类交错顺序（曾导致 Plate1 横杠/车次栏错位）。
- 预览根 id 可能是 `rl_plate`、`ll_plate`、`rl_plate_main` 或 `ll_plate_main`，提取时都要匹配。

### Android 布局语义（已在本项目引擎实现）

- 水牌高度：`l = (屏宽px - 20dp) / ratio`，设计单位换算 `k(unit) = l * unit / designHeight`；Web 固定导出宽 1370px、参考版心宽 340dp。
- `match_parent` + 单侧锚点（`toLeftOf`/`toRightOf`/`alignParentRight`）宽度 = 父边缘到锚点的**剩余空间**；负 margin 会向外扩展；双侧锚点取两者之间；`match_parent` 时该侧 margin 要计入。
- `GONE` 子节点不计入 `wrap_content`；`0dp + layout_weight` 不能当作固定尺寸，`>0dp` 才是固定值。
- 固定 dp 的 `View`/`ImageView`/分隔线要计入父级 `wrap_content`。
- `layout_gravity`（子）与容器 `gravity` 要分别处理；`weight` 分配前要扣掉已用主轴尺寸与 margin。

### 文本与字体

- 压缩有两套算法，不要混用：
  - `fit`：App 的 `c.a.a.f.c.h()` 字符宽度表（`fitScaleX`），公式中 `maxScale` 会约掉，**不要再乘 maxScale**；`mode 0` 空格系数 0.5294118。
  - `fitLength`：`scaleX = min(maxScale, 可用宽 / (字号 × len) − 0.02)`，`len = max(2, estimateLength(text))`，用于中文站名。
- Android `includeFontPadding` 与浏览器/Skia 行盒不同：`lineHeightFactor` 只影响行盒高度（wrap/多行），`gravity=center` 的固定高度文本基线会被抵消；要整体上下移动用 `baselineOffset`。
- 字体通过 `FontFace` 懒加载；**`drawPlate` 必须先 `ensureFonts(spec.fonts)` 再测量/布局**，否则 Canvas 会退回系统字体，预览与导出全部失真（本项目曾漏掉此步）。
- 缺字回退与 App 一致（字体缺字时回退黑体），在文档标注即可。

### 保真校准

- 封面 `public/covers/bg_plate_N.png` 是**设计示意图**（常带人工字距、旧版行距），不是程序输出；以 Java/XML 常量为准，封面用于 bbox 对照，允许字距差异。
- 用 `npm run render -- plateN` 生成 `analysis/preview-plateN.png`，`read_image` 与封面逐区比对（等级/路徽/红条/车次行位置），比浏览器截图可靠。
- 校验顺序、字数限制在 `PlateNActivity.h()` 与 XML `maxLength`；`PlateSpec` 目前没有完整 `validate` 钩子，只在字段级 `required` 与报告中记录。

## 4. 协作方式（Agent Teams）

- 5 个模板 Agent 按**互不重叠的文件**分工（`plate0.ts`、`plate1+7`、`plate2+3`、`plate4+6`、`plate5`），Lead 负责 `src/core/`、UI、部署与最终集成。
- `src/plates/index.ts` 一次性静态导入全部 `plateN.ts`；占位文件导出 `PlateSpec | null = null`，`PLATES` 过滤 null。这样队友**只改自己的 plateN.ts** 就能被 `npm run render -- plateN` 发现，无需争抢 index。
- 引擎能力由 Lead 统一加：`fitLength`、`weight`、`width/height: 'wrap'`、`minWidth`、`baselineOffset`、固定 dp intrinsic 等，队友遇到缺口先报告，不擅自改 `core/`。
- 共享任务用 `team_task_*` 记录 write scope；每完成一个模板补 `tests/plates/*.test.ts`。

## 5. 网络、凭据与推送（重要）

本机有两个独立问题，不要混淆：

1. **schannel TLS 失效**（`curl`/git 默认后端报 `SEC_E_NO_CREDENTIALS`）：git 用 OpenSSL 后端即可。
   ```powershell
   git config --local http.sslBackend openssl
   ```
   这是持久的仓库级设置，不是代理，**不需要恢复**。
2. **github.com:443 直连被重置**（`Recv failure: Connection was reset` / `Failed to connect`），但 `api.github.com` 往往正常。

### 直连不畅时：优先尝试 7890 代理，用完恢复直连

```powershell
# 1) 确认本地代理是否在监听（Clash 等常用 127.0.0.1:7890）
Get-NetTCPConnection -LocalPort 7890 -State Listen

# 2) 仅对本次命令使用代理（不要写进全局/仓库配置）
git -c http.sslBackend=openssl -c http.proxy=http://127.0.0.1:7890 push

# 3) 恢复直连状态并验证
git config --local --unset http.proxy   # 若之前误写入
git config --local --get http.proxy     # 预期：无输出
git -c http.sslBackend=openssl ls-remote origin HEAD
```

- 代理只用于临时突破，**不要持久化** `http.proxy`（全局或仓库级都不要）；推送后必须确认 `http.proxy` 已清除。
- 若 7890 未监听，先请用户启动代理，或走下面的 API 回退。
- 本会话中 7890 未监听，最终使用 API 回退完成同步；下次遇到直连失败应先按上面步骤试代理。

### 凭据

- Windows 凭据管理器已有 `git:https://github.com`（GCM）。git 直接调用 helper 在本沙箱可能失败，可用：
  ```powershell
  $gcm='C:\Program Files\Git\mingw64\bin\git-credential-manager.exe'
  $in="protocol=https`nhost=github.com`n`n"
  $out=$in | & $gcm get
  ```
- 把 token 放进环境变量并配合 `GIT_ASKPASS`（`analysis/askpass.cmd`，已 gitignore）：
  ```powershell
  $env:GIT_PASS=$pass; $env:GIT_ASKPASS="$PWD\analysis\askpass.cmd"
  git -c credential.helper= -c credential.username=AFewMoon push
  ```
- **绝不打印/提交 token**；不为调试把 token 写进 remote URL。

### API 回退同步（git 协议完全不可用时）

`scripts/github-sync.mjs`（`npm run sync`）通过 REST API 比较远端 tree 与本地 git index，上传变更 blob，创建 tree/commit 并更新 `refs/heads/main`：

```powershell
git add -A
$env:GITHUB_TOKEN='<temp token>'
$env:GITHUB_REPO='AFewMoon/train-signs'
$env:GITHUB_MESSAGE='feat: ...'
npm run sync
```

- 需要 token 具 `contents: write`；会触发 GitHub Actions 的 `push` 工作流（本仓库验证有效）。
- 只适合文本/小文件；>20MB 文件会拒绝（字体未变化时不会上传）。
- 副作用：远端提交由 API 创建，**SHA 与本地 git 历史不同**。网络恢复后可用 `git fetch origin && git reset --hard origin/main` 对齐（会丢弃本地未同步提交，先确认），或继续用 `npm run sync`。

## 6. 构建、测试与部署

- 本地：`npm.cmd run build`（`vue-tsc --noEmit && vite build`）、`npm.cmd test`、`npm.cmd run render -- plateN`。
- `vite.config.ts`：`base = process.env.GITHUB_ACTIONS ? '/train-signs/' : '/'`；资源 URL 一律走 `import.meta.env.BASE_URL`，否则 Pages 子路径 404。
- Actions：`.github/workflows/deploy.yml` 执行 `npm ci → npm test → npm run build → configure-pages（enablement: true）→ upload-pages-artifact → deploy-pages`。首次若 `enablement` 权限不足，手动 Settings → Pages → Source: GitHub Actions。
- 部署验收（匿名 API 即可）：
  ```powershell
  node -e "fetch('https://afewmoon.github.io/train-signs/').then(r=>console.log(r.status))"
  ```
  再取入口 JS 检查是否含全部模板名、字体/图标/数据是否 200。
- 字体约 40MB，`public/fonts` 直接进仓库；`drawPlate` 已按模板懒加载，避免首屏全部下载。

## 7. 容易踩的坑

1. 一次性 `git add -A` 会把 `jadx-gui-*/`、`rea-rea-agents-*/`、APK 加进索引——先确认 `.gitignore`，提交前 `git status --short` 检查。
2. `scripts/extract-layouts.mjs` 改动后要重新生成全部 `plateN.json`，否则布局顺序/像素会集体回归。
3. 修改 `core` 的尺寸逻辑后，务必跑全部模板的 `render` 与测试（Plate5/1 对 margin、weight、GONE、0dp 很敏感）。
4. 导出文件名包含模板名（如“标准/套跑”），必须过滤 `\/:*?"<>|`，否则 Windows 下载失败。
5. 字体、路徽、封面来自原 App，公开仓库内嵌是用户的明确决定；不要“顺手”移除，也不要把版权声明删掉。
6. 不要把 `analysis/`、`dist/`、`node_modules/`、`.npm-cache/` 提交；预览图只提交 `docs/previews/` 下精选几张。

## 8. 导出（分辨率 / SVG）与许可证经验

### 自定义分辨率

- `src/plates/types.ts`：
  - `createBuildContext(ratio, designHeight, spaceStyle?, widthPx?)` 是唯一的尺寸入口；所有布局/字体度量按宽度等比缩放，不要另外改字号或 margin。
  - `exportSize(ratio, requestedWidth)` 统一夹取：320–8192px、画布面积 ≤ 16,000,000px（Safari 安全线），返回 `{width,height,clamped,reason}`。
- 预览固定 1370px；导出时才用 `renderPlateCanvas(..., {widthPx})` 重新排版，避免输入时高分辨率重绘卡顿。
- 图库始终存 PNG（按导出分辨率），SVG/JPEG 导出也留档。
- `Settings` 增加字段时必须处理旧 localStorage：`loadSettings()` 做迁移与默认值。

### SVG（真矢量）

- 依赖 `opentype.js@2`（MIT）。Vite 默认可能解析到 UMD，动态 import 只有 default 导出；在 `vite.config.ts` 用 alias 指向 `node_modules/opentype.js/dist/opentype.mjs`，并在代码里兼容 `mod.parse ?? mod.default?.parse`。
- 文字位置必须与 Canvas 完全一致：`render.ts` 的 `computeTextRun()` 同时服务 `drawTextBox()` 与 SVG；逐字 x 用 Canvas `measureText` 的**前缀宽度**（含 kerning），再在组上 `scale(scaleX,1)`。
- 字形路径：`font.charToGlyph(char).getPath(0,0,sizePx).toPathData(2)`；`charToGlyphIndex===0` / 字体解析失败 / `sans` → 整个文字框回退为离屏 canvas 位图（`drawTextBox` 复用）。
- 每个 Box 输出 `<g clip-path>` + `<clipPath>`，与 Canvas 逐层裁剪对应；图标以 data URI `<image>` 内嵌，`centerCrop` 用 `preserveAspectRatio="xMidYMid slice"`；SVG 不允许外链。
- 验证方式：Node 侧用 `@napi-rs/canvas` + `opentype` 构造 host，`serializeBox()` 生成 SVG，再用 `loadImage(Buffer.from(svg))` 光栅化对比（本仓库已验证可渲染）；单测注入假 host 检查结构。

### 许可证

- 代码 AGPL-3.0-only：根 `LICENSE` 用 SPDX 文本（可通过 `api.github.com/repos/spdx/license-list-data/contents/text/AGPL-3.0-only.txt` 获取），`package.json` 的 `license`/`author`、README、NOTICE、页脚同步。
- `public/fonts|icons|covers|data` 是第三方素材，**明确不纳入 AGPL**，不要删除 NOTICE 中的例外声明。
- 用 PowerShell `ConvertTo-Json` 改 `package.json` 会把 `&&` 转成 `\u0026` 并重排格式；优先手写 JSON 或只做文本替换。

### 行高与重叠

- 多行文本（如 Plate0 三行车次）必须给 `lineHeightFactor`（arial 约 1.3）。默认 `ascent+descent≈1.1em` 配合负 margin 会压字；`gravity=center` 的固定高度容器中行盒增高对称抵消，单行位置不变。
- 修改行高后对比默认预览 SHA；三行变体必须目检。

## 9. 常用命令速查

```powershell
$env:npm_config_cache="$PWD\.npm-cache"
npm.cmd install --ignore-scripts
npm.cmd run dev            # 可选；浏览器不可用，视觉校验用 render
npm.cmd run build
npm.cmd test
npm.cmd run render -- plate0 plate5 plate8
npm.cmd run layouts        # 重新提取 src/plates/layouts/*.json
npm.cmd run sync           # 需 GITHUB_TOKEN，API 回退推送
```
