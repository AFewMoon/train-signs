# 反向工程记录

本目录记录从 `列车水牌制作 Android v9.5.apk` 还原水牌渲染规则的过程与结论。APK 与反编译产物不入库（见 `.gitignore`），可通过下列步骤在本地复现。

## 环境

- `jadx-gui-1.5.6-with-jre-win`（自带 JRE 25），CLI 入口 `jadx.cli.JadxCLI`
- Node.js 24（本机 24.21.0）、npm
- REA 6.9.0：其运行要求 Node `^24.22.1` 且 Android 工具需要自编译 JADX 桥接，本机不满足，故仅采用其 `reverse-engineer-anything` 工作流作为方法论，实际引擎使用自带 jadx CLI。

## 复现反编译

```powershell
$env:JADX_CONFIG_DIR="$PWD\analysis\jadx-config"
$env:JADX_CACHE_DIR="$PWD\analysis\jadx-cache"
& .\jadx-gui-1.5.6-with-jre-win\jre\bin\java.exe -Xmx2g `
  -cp .\jadx-gui-1.5.6-with-jre-win\lib\jadx-gui-1.5.6-all.jar `
  jadx.cli.JadxCLI "列车水牌制作 Android v9.5.apk" -d analysis\jadx --threads-count 8
node scripts/extract-layouts.mjs
```

## 关键结论

### 应用结构

- 包名 `org.piaoyu.directionplatemaker`，主页面 `MainActivity`，10 个水牌页 `Plate0Activity`–`Plate9Activity`。
- 页面名称：`Plate0` 标准/套跑，`Plate1`–`Plate7` 套跑1–7，`Plate8` 电子水牌1，`Plate9` 电子水牌2。
- 水牌预览不是用 Canvas 绘制的，而是 Android 布局（`res/layout/activity_plate_*.xml` 中的 `rl_plate` / `ll_plate` 子树）+ TextView，导出时通过 `View.getDrawingCache()` 截图。
- 渲染参数在 `base/a.java` 的 `q()` / 各页的 `x2()`、`s0()`、`o0()` 中用 `k(float)` 重新计算；`k(unit) = 水牌高度px × unit ÷ 设计高度`。

### 设计尺寸

| 页面 | 宽高比 | 设计高度（K 第二参数） |
| --- | --- | --- |
| Plate0 / 2 / 3 / 7 | 5:1 | 72 |
| Plate1 | 5.5:1 | 66.13 |
| Plate6 | 5.1:1 | 70 |
| Plate8 | 5.4578:1 | 72 |
| Plate9 | 3.7333:1 | 106 |
| Plate4 / Plate5 | 见各自代码 | — |

Web 端统一按导出宽度 **1370px**、参考水牌宽度 **340dp**（360dp 屏减 20dp）换算：`dpScale = 1370 / 340`，`unitScale = heightPx / designHeight`。

### 文本压缩（`c.a.a.f.c` / `c.a.a.f.f`）

```text
scaleX = min( maxScale × 可用宽度 × B / (Σ字宽系数 × 字号) − (n−1) × ε, maxScale )
```

- 字宽系数：中文及未列出的字符 = 1.0；英文按 `f.a(char, mode)` 表（A=1.444…、W=2.0 等）。
- `B = 2.01`（mode 0）/ `1.745508`（mode 1）；`ε = 0.003` / `0.001`。
- 空格样式：0 = 1/4 空格（宽度 0.222223）、1 = 1/5 空格（0.205）、2 = 1/2 空格（0.501）。
- `w(text)`：全角括号转半角、空格替换为对应空格字符、删除换行。

### 拼音

- `characters.dat`：`拼音#汉字/汉字…`，构建 汉字→拼音 映射（后写覆盖先写）。
- `words.dat`：`拼音#地名`，优先匹配 3 字、2 字地名（多音字修正）。
- `i.b()` 逐字输出拼音，`-`/`—` 统一为 `-`，括号保留。

### 导出

- 格式：PNG 或 JPEG（质量 100），文件名 `水牌_yyyyMMddHHmmssS`。
- 电子水牌滚动区域只截取当前瞬间。

## 模板规格

各模板的字段、字体、颜色与常量见 [plate-matrix.md](plate-matrix.md)（随实现补充）。

## 局限

- 仅静态分析，未在真机/模拟器运行原 App；设备相关的字体度量以 Web 端实测为准。
- 原文中的屏幕宽度、状态栏等与网页无关的参数未还原。
