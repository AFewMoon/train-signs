# 模板矩阵

Web 端实现以 `src/plates/plateN.ts` 中的 `PlateSpec` 为准；本表记录反编译得到的页面信息与移植状态。

| 页面 | 名称 | 宽高比 | 设计高度 | 导出尺寸（1370 宽） | 状态 |
| --- | --- | --- | --- | --- | --- |
| Plate0 | 标准/套跑 | 5:1 | 72 | 1370×274 | 已实现 |
| Plate1 | 套跑1 | 5.5:1 | 66.13 | 1370×249 | 已实现 |
| Plate2 | 套跑2 | 5:1 | 72 | 1370×274 | 已实现 |
| Plate3 | 套跑3 | 5:1 | 72 | 1370×274 | 已实现 |
| Plate4 | 套跑4 | 5.15:1 | 69.5 | 1370×266 | 已实现（附加区裁底） |
| Plate5 | 套跑5 | 5.2:1 | 64.5 | 1370×263 | 已实现 |
| Plate6 | 套跑6 | 5.1:1 | 70 | 1370×269 | 已实现 |
| Plate7 | 套跑7 | 5:1 | 72 | 1370×274 | 已实现 |
| Plate8 | 电子水牌1 | 5.4578:1 | 72 | 1370×251 | 已实现 |
| Plate9 | 电子水牌2 | 3.7333:1 | 106 | 1370×367 | 已实现 |

Plate4 的比例来自 `Plate4Activity.u1()`：`l = (屏宽 - 20dp) / 5.15`、`m = 69.5`，等价 `K(..., 69.5)`；XML 中 `ll_plate_main` 高度 69.5dp 与封面 1369×266 亦可印证。

## 字体分配

| 字体 key | 文件 | 典型用途 |
| --- | --- | --- |
| `fzxbs` | fzxbs_gbk.ttf | 套跑7 中文站名 |
| `hycsj` | hycsj.ttf | 中文站名 / 车次中文 |
| `hyzhj` | hyzhj.ttf | 列车等级文字 |
| `times` | times_lt_std_semibold.otf | 拼音栏 |
| `arial` | arial_bd.ttf | 车次、拼音栏 |
| `mnydz` | mnydz.otf | 电子水牌车次 |
| `toshiba` | toshiba-bfa.ttf | 电子水牌车厢号 |
| `fzxs15` | fzxs15.ttf | 电子水牌站名 |
| `fzxs18` | fzxs18.ttf | 电子水牌车厢号 |

## 各页要点

### Plate0 标准/套跑

- 字体：hycsj / times / hyzhj / arial；31 个字段。
- 布局：`x2()`/`w2()` 的 K/Y/G/H/X/L/u/V/I/N 全部转为 `ctx.k` patch；路徽随车次行数缩放（52.27 → 46.27 → 40.27）。
- 文本：中文站名用 `c.a.a.f.c.f()` 的估算长度压缩；拼音 `fit(mode 0)`、车次 `fit(mode 1, 1.05)`；车次 1–3 行使用 `lineHeightFactor: 1.3` 还原 Android 行盒，避免负 margin 下多行重叠。
- 开关：左右双站名、双行拼音、中文车次、站名下方车次、贴边、窄拼音栏、扁长字体、左右分别等级、自定义等级文字/颜色。

### Plate1 / Plate7（套跑1/7）

- Plate1：5.5:1、66.13；左右两组站名 + 中间路徽与等级；拼音色条沿用等级色。
- Plate7：5:1、72；三段站名（杭州/阿克苏/乌鲁木齐），两组车次；`iv_icon` 为 19.8 单位小图标。
- 校准：车次 `lineHeightFactor 1.3`，拼音 `baselineOffset ≈ 0.15em`。

### Plate2 / Plate3（套跑2/3）

- 左右镜像布局、中间路徽；中文站名 32/24 号两档，双行时 18 号；路徽随车次行数缩放。
- Plate3 的 `swap` 表示“左单右双 ↔ 左双右单”；App 的物理重排在 Web 端以镜像数据近似。
- 拼音栏与车次行使用 `baselineOffset ≈ 0.172em`、`lineHeightFactor 1.28` 校准。

### Plate4 / Plate6（套跑4/6）

- 三列布局，中间路徽 + 等级 + 左右车次块；Plate4 另有附加车次区。
- Plate4 的 root 在原 App 中是 `wrap_content`，开启附加区后画布会增高；Web 固定 5.15 比例，附加文字可能被裁底（已知差异）。
- 车次 `lineHeightFactor 1.3`。

### Plate5（套跑5）

- 最大模板：左/中/右三组车次、站名、路徽（43.8/42.5/37.0 三档）、顶部等级行、拼音双行、动态权重（按站名估算长度 4:3 等）。
- 引擎为此新增 `fitLength`、`weight` 与 `width/height: 'wrap'`。
- 已知差异：右侧车次块权重按源码 2:3（封面示意约 2:2.44）；双行拼音模式分隔线宽度保持 XML 15dp。

### Plate8 / Plate9（电子水牌1/2）

- Plate8：车厢号黑块（55×52 单位）+ 车次 37 号 + 站名 36 号，字体 toshiba/mnydz/fzxs15。
- Plate9：左侧车厢号区 105 单位 + 两行 39 号文字，字体 fzxs18/fzxs15；长文本为 Marquee 滚动，导出取当前帧。
- 颜色：Plate8 使用 `ELEC_STATION_COLORS`，Plate9 使用 `ELEC_LINE_COLORS`。

## 通用规则

- 画布参数来自各页 `K((m()-k.a(20f))/ratio, designHeight)`；Web 端固定导出宽 1370px、参考水牌宽 340dp，`dpScale = 1370/340`。
- 代码内的 `k(unit)` 尺寸 = `导出高度 × unit ÷ designHeight`。
- 压缩：`fit`（App 的 h()/f() 字符宽度表）与 `fitLength`（按 1em/字估算的站名压缩）。
- `lineHeightFactor` 只改变行盒高度（wrap 高度/多行行距）；固定高度且 gravity=center 时基线不受影响，需用 `baselineOffset` 校准。
- 路徽：`public/icons/railway/ic_plate_01.png` – `ic_plate_14.png`，各页默认值取自封面（01 或 07）。
- 列车等级/颜色：`src/data/colors.ts` 的 `LEVEL_PRESETS`（源自 `c.a.a.f.l.c()`/`d()` 与 `values/colors.xml`）。

## 已知差异汇总

1. 封面配图为设计稿，中文/拼音常带人工字距；Web 按源码渲染，字距更紧凑。
2. 自定义等级颜色：原 App 支持 6 位颜色代码/取色器，Web 目前为预设 19–22 色 + 自定义文字。
3. Plate2/3/4/5 的“交换/重排”按钮以复选框近似。
4. Plate4 附加车次区在固定画布下可能裁底。
5. 未运行原 App，仅静态分析 + 封面比对。
6. 车次输入：原 App 仅允许 `rule_train_number`（`ZzTtKkYyLlNnAa0123456789 /→`）中的字母；Web 端不做字母限制，任意字母（含 V/v）与数字均可输入，只过滤表情等无关符号。
