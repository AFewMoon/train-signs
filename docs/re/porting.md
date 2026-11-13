# 模板移植指南（给协作 Agent）

目标：把 `PlateNActivity` 的预览渲染移植为 `src/plates/plateN.ts`，并保证 `npm run render -- plateN` 生成的图片与 APK 布局/代码常量一致。

## 必读文件

1. `analysis/jadx/sources/org/piaoyu/directionplatemaker/activities/PlateN.java`
   - `q()`：View 字段与 id 对应、字体（`r("xxx.ttf")`）。
   - 形如 `x2()/s0()/o0()` 的私有方法：所有 `K/Y/G/H/X/L/u/V/I/N` 调用都是尺寸覆写。
   - 内部类 `implements base.a.m`：文本变化 → TextView 的绑定逻辑（大写、`w()`、`h()`、`A()` 注音等）。
   - `h()`：必填校验顺序与提示文案。
2. `analysis/jadx/resources/res/layout/activity_plate_N.xml`：`rl_plate` / `ll_plate` 子树（已转成 `src/plates/layouts/plateN.json`）。
3. `src/plates/plate8.ts`、`src/plates/plate9.ts`：参考实现。
4. `src/core/layout.ts`、`src/core/render.ts`、`src/core/text.ts`、`src/plates/types.ts`。

## 引擎约定

- 布局 JSON 已由 `scripts/extract-layouts.mjs` 从 XML 提取：dp 值、`match_parent`、`wrap_content`、相对规则、gravity、背景色、`src` 图标都保留。**不要手改 JSON**；如提取有误请报告。
- `ctx.k(units)` = APK 的 `k(float)`（设计单位 → px）；`ctx.dp(value)` = XML dp → px。
- `build()` 返回 `PatchMap`：key 为 View id，value 支持 `text/font/color/sizePx/scaleX/bold/visible/width/height/margin/padding/bg/image/gravity/marquee/scrollX`。
- 代码里通过 `Y/G/H/X/L/u/V/I/N` 设置的尺寸/边距一律用 `ctx.k()`；XML 里已有且代码未覆写的值交给引擎。
- 字体 key：`arial / fzxbs / fzxs15 / fzxs18 / hycsj / hyzhj / mnydz / times / toshiba / sans`，对应 `public/fonts`。
- 文本处理工具：`normalizeText(text, spaceStyle)`（`w()`）、`fitScaleX(text, 可用宽度, 字号, maxScale, mode)`（`h()`）。`mode 0/1` 对应 App 两套英文宽度表。
- 电子水牌的长文本用 `marquee: true`（XML 标签为 `MarqueeTextView` 时自动开启），静态导出取 `scrollX = 0`。

### 关键 Android 语义

- `match_parent` 宽度 + 单侧锚点（`toRightOf` / `toLeftOf` / `alignParentRight`）= 从父容器边缘到锚点的剩余空间；双侧锚点 = 两锚点之间。负 margin 会向外扩展。
- `layout_centerHorizontal/Vertical`、`alignParentBottom/Right`、`above/below`、`alignLeft/Right/Top/Bottom` 已支持。
- `LinearLayout` 支持 `layout_weight`、`gravity`、主轴剩余空间对齐。
- TextView 的 `wrap_content` 用浏览器字体度量；不要用固定高度猜测。

## 步骤

1. 从 Java 中找 `K(...)` 得到宽高比与设计高度：
   `K((m()-k.a(20f))/5f, 72f)` → ratio 5、designHeight 72。
2. 读 `q()` 记录每个 id 的字体；读尺寸覆写方法逐条转成 patch（单位保留原值，乘 `ctx.k`）。
3. 读文本监听内部类，实现字段 → 文本的转换（大写、`-`→`—`、括号/空格规范化、拼接双站名等）。
4. 实现 `fields`（`kind: text/textarea/number/select/checkbox`，拼音字段加 `pinyinOf`）与 `defaults`（用封面图里的示例内容）。
5. 运行 `npm run render -- plateN`，用 read_image 查看 `analysis/preview-plateN.png`，与 `public/covers/bg_plate_N.png` 对照迭代。
6. 自查：字段 id 全部有绑定；默认值无空文本；必填校验顺序与 Java `h()` 一致。

## 约束

- 只改 `src/plates/plateN.ts`（必要时加 `tests/plates/plateN.test.ts`）。
- 不要改 `src/core/**`、`src/plates/index.ts`、`src/plates/types.ts`、`package.json`、其他模板文件；需要引擎能力时报告 Lead。
- 保持 `PlateSpec | null` 导出名，完成后导出真实对象。
- 中文注释，TypeScript strict，不得引入新依赖。
- 完成后报告：用到的常量、字段/限长、字体、已知差异与未实现项。
