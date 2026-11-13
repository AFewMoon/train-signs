# 模板矩阵

Web 端实现以 `src/plates/specs` 中的 `PlateSpec` 为准；本表记录反编译得到的页面信息与移植状态。

| 页面 | 名称 | 宽高比 | 设计高度 | 导出尺寸（1370 宽） | 状态 |
| --- | --- | --- | --- | --- | --- |
| Plate0 | 标准/套跑 | 5:1 | 72 | 1370×274 | 待补 |
| Plate1 | 套跑1 | 5.5:1 | 66.13 | 1370×249 | 待补 |
| Plate2 | 套跑2 | 5:1 | 72 | 1370×274 | 待补 |
| Plate3 | 套跑3 | 5:1 | 72 | 1370×274 | 待补 |
| Plate4 | 套跑4 | 见实现 | 见实现 | — | 待补 |
| Plate5 | 套跑5 | 5.2:1 | 64.5 | 1370×263 | 待补 |
| Plate6 | 套跑6 | 5.1:1 | 70 | 1370×269 | 待补 |
| Plate7 | 套跑7 | 5:1 | 72 | 1370×274 | 待补 |
| Plate8 | 电子水牌1 | 5.4578:1 | 72 | 1370×251 | 已实现 |
| Plate9 | 电子水牌2 | 3.7333:1 | 106 | 1370×367 | 已实现 |

## 字体分配（来自各页 `q()` 的 `setTypeface`）

| 字体 key | 文件 | 典型用途 |
| --- | --- | --- |
| `fzxbs` | fzxbs_gbk.ttf | 纸质水牌中文站名（部分页） |
| `hycsj` | hycsj.ttf | 中文站名/车次中文 |
| `hyzhj` | hyzhj.ttf | 列车等级文字 |
| `times` | times_lt_std_semibold.otf | 拼音栏 |
| `arial` | arial_bd.ttf | 车次、拼音栏 |
| `mnydz` | mnydz.otf | 电子水牌车次 |
| `toshiba` | toshiba-bfa.ttf | 电子水牌车厢号 |
| `fzxs15` | fzxs15.ttf | 电子水牌站名 |
| `fzxs18` | fzxs18.ttf | 电子水牌车厢号 |

## 通用规则

- 画布参数来自各页 `K((m()-k.a(20f))/ratio, designHeight)`；Web 端固定导出宽 1370px、参考水牌宽 340dp，`dpScale = 1370/340`。
- 所有代码内的 `k(unit)` 尺寸 = `导出高度 × unit ÷ designHeight`。
- 压缩：`fit`（App 的 h()/f() 字符宽度表）、`fitLength`（按 1em/字估算的站名压缩）两种模式。
- 电子水牌的长文本为 Marquee 滚动，导出取当前帧。

## 路徽

`public/icons/railway/ic_plate_01.png` – `ic_plate_14.png`，来自 APK `mipmap-nodpi`，默认 `ic_plate_01.png`。

## 列车等级/颜色

见 `src/data/colors.ts` 的 `LEVEL_PRESETS`（源自 `c.a.a.f.l.c()`/`d()` 与 `values/colors.xml`）。
