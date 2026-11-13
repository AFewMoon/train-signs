import type { LayoutNode, PatchMap, PlateValues } from '../core/types'
import { estimateLength, normalizeText } from '../core/text'
import { COLORS, LEVEL_PRESETS } from '../data/colors'
import layoutJson from './layouts/plate0.json'
import type { FieldOption, PlateSpec } from './types'
import { bool, str } from './types'

const layout = layoutJson as unknown as LayoutNode

/** c.a.a.f.j.a()：14 个路徽，顺序与 mipmap ic_plate_01…14 一致。 */
const ICON_OPTIONS: FieldOption[] = Array.from({ length: 14 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0')
  return { label: `路徽 ${number}`, value: `icons/railway/ic_plate_${number}.png` }
})

const DEFAULT_ICON = 'icons/railway/ic_plate_01.png'

/** 等级下拉选项：value 用预设 id，显示文字与颜色从共享常量 LEVEL_PRESETS 读取。 */
const LEVEL_OPTIONS: FieldOption[] = LEVEL_PRESETS.map((preset) => ({
  label: preset.label,
  value: preset.id,
}))

/** 等级预设兜底：快速（红），与封面示例一致。 */
const DEFAULT_LEVEL = 'kuaisu1'

function presetById(id: string) {
  return (
    LEVEL_PRESETS.find((preset) => preset.id === id) ??
    LEVEL_PRESETS.find((preset) => preset.id === DEFAULT_LEVEL) ??
    LEVEL_PRESETS[0]
  )
}

/** 预设等级在预览中显示的文字（G0/左右两半），取自共享常量 LEVEL_PRESETS.text。 */
function presetText(id: string): string {
  return presetById(id).text
}

/** 预设等级对应的拼音栏底色。 */
function presetColor(id: string): string {
  return presetById(id).color
}

/** 自定义颜色（#RRGGBB），格式不合法时用预设色。 */
function customColor(value: string): string | null {
  const trimmed = value.trim()
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : null
}

/**
 * c.a.a.f.c.f()/e()：按“估算字符长度”压缩 textScaleX（不是按 TextView 实测宽度）。
 * 估算长度 m = c.a.a.f.c.m()（见 core/text.ts estimateLength）。
 * 结果与原 App 一致：m <= 阈值时保持基准 scaleX，m > 阈值时 scaleX = 基准 × 除数 / m。
 */
function estimateScaleX(
  text: string,
  base: number,
  threshold: number,
  divisor: number,
  spaceStyle: 0 | 1 | 2,
): number {
  const normalized = normalizeText(text, spaceStyle)
  const m = estimateLength(normalized, spaceStyle)
  return m > threshold ? (base * divisor) / m : base
}

/** 中文站名显示文本：c.a.a.f.c.w() 规范化（括号/空格/换行），不转大写。 */
function stationText(text: string, spaceStyle: 0 | 1 | 2): string {
  return normalizeText(text, spaceStyle)
}

/**
 * 标准/套跑（Plate0Activity）：5:1，设计高度 72（x2() 的 K((屏幕宽-20dp)/5, 72)）。
 * 中文站名 t/u/v/w/x/y 用 hycsj，拼音栏 z/A/B/C/E/F 用 times，等级 G/H 用 hyzhj，车次 J/K/L/M/N 用 arial。
 *
 * 必填校验顺序（原 App h()，Web 端无校验钩子，仅在此记录，方便后续对齐）：
 * 1. 权限检查；2. 始发站中文 V；3. 终到站中文 X；4. 始发站拼音 Z；5. 终到站拼音 b0；
 * 6. 左侧双站名 L0 时：始发站2中文 W → 始发站2拼音 a0；
 *    否则右侧双站名 M0 时：终到站2中文 Y → 终到站2拼音 c0；
 *    否则未开启“站名下方显示车次”S0 时：车次第一行 s0；
 *    S0 时：左侧车次 v0 → 右侧车次 w0。
 * 字段限长：车次第一行由代码改为 32，车次第二/三行 25，站名下方车次 40；
 * 拼音 XML 为 38，双站名第二站拼音 19（开启双行拼音时由代码 F() 放宽到 38）。
 *
 * 已知差异：封面图的中文站名/拼音使用了设计稿字距（App 代码无 letterSpacing），
 * Web 端按代码原样渲染，字形大小一致但字距更紧凑。
 */
export const plate0: PlateSpec = {
  id: 'plate0',
  name: '标准/套跑',
  ratio: 5,
  designHeight: 72,
  cover: 'covers/bg_plate_0.png',
  layout,
  fonts: ['hycsj', 'times', 'hyzhj', 'arial'],
  fields: [
    // —— 始发站 ——
    {
      key: 'startStation',
      label: '始发站（中文）',
      kind: 'text',
      placeholder: '如 成都',
      hint: '必填；开启左侧双站名时填写始发站1',
    },
    {
      key: 'startPinyin',
      label: '始发站（拼音）',
      kind: 'text',
      maxLength: 38,
      pinyinOf: 'startStation',
      placeholder: '如 CHENGDU',
      hint: '必填；开启左侧双行拼音时可用 38 字符，否则上限 19',
    },
    {
      key: 'startStation2',
      label: '始发站2（中文，左侧双站名）',
      kind: 'text',
      placeholder: '如 成都',
      hint: '开启“左侧双站名”后必填',
    },
    {
      key: 'startPinyin2',
      label: '始发站2（拼音，左侧双站名）',
      kind: 'text',
      maxLength: 19,
      pinyinOf: 'startStation2',
      placeholder: '如 CHENGDU',
      hint: '开启左侧双行拼音时上限放宽到 38',
    },
    // —— 终到站 ——
    {
      key: 'endStation',
      label: '终到站（中文）',
      kind: 'text',
      placeholder: '如 昆明',
      hint: '必填；开启右侧双站名时填写终到站1',
    },
    {
      key: 'endPinyin',
      label: '终到站（拼音）',
      kind: 'text',
      maxLength: 38,
      pinyinOf: 'endStation',
      placeholder: '如 KUNMING',
      hint: '必填；开启右侧双行拼音时可用 38 字符，否则上限 19',
    },
    {
      key: 'endStation2',
      label: '终到站2（中文，右侧双站名）',
      kind: 'text',
      placeholder: '如 昆明',
      hint: '开启“右侧双站名”后必填',
    },
    {
      key: 'endPinyin2',
      label: '终到站2（拼音，右侧双站名）',
      kind: 'text',
      maxLength: 19,
      pinyinOf: 'endStation2',
      placeholder: '如 KUNMING',
      hint: '开启右侧双行拼音时上限放宽到 38',
    },
    // —— 车次 ——
    {
      key: 'trainNumber1',
      label: '车次 第一行',
      kind: 'text',
      maxLength: 32,
      placeholder: '如 K113/4',
      hint: '输入时自动转大写，- 转为 —；允许字符：ZzTtKkYyLlNnAa0123456789 /→',
    },
    {
      key: 'trainNumber2',
      label: '车次 第二行（可选）',
      kind: 'text',
      maxLength: 25,
      placeholder: '如 K113',
    },
    {
      key: 'trainNumber3',
      label: '车次 第三行（可选）',
      kind: 'text',
      maxLength: 25,
      placeholder: '如 4',
    },
    {
      key: 'trainNumberBelowStart',
      label: '左侧站名下方车次',
      kind: 'text',
      maxLength: 40,
      placeholder: '如 K113',
      hint: '勾选“站名下方显示车次”后显示',
    },
    {
      key: 'trainNumberBelowEnd',
      label: '右侧站名下方车次',
      kind: 'text',
      maxLength: 40,
      placeholder: '如 4',
      hint: '勾选“站名下方显示车次”后显示',
    },
    // —— 列车等级与路徽 ——
    {
      key: 'levelPreset',
      label: '列车等级（全局）',
      kind: 'select',
      options: LEVEL_OPTIONS,
    },
    {
      key: 'separateLevels',
      label: '左右分别设置等级和颜色',
      kind: 'checkbox',
    },
    {
      key: 'levelLeft',
      label: '左侧列车等级（勾选“分别设置”后生效）',
      kind: 'select',
      options: LEVEL_OPTIONS,
    },
    {
      key: 'levelRight',
      label: '右侧列车等级（勾选“分别设置”后生效）',
      kind: 'select',
      options: LEVEL_OPTIONS,
    },
    {
      key: 'levelCustomTextLeft',
      label: '左侧自定义等级文字（留空用预设）',
      kind: 'text',
      maxLength: 8,
      placeholder: '如 直达特快',
    },
    {
      key: 'levelCustomColorLeft',
      label: '左侧自定义等级颜色（#RRGGBB，留空用预设）',
      kind: 'text',
      placeholder: '如 #ff3145',
    },
    {
      key: 'levelCustomTextRight',
      label: '右侧自定义等级文字（分别设置时生效）',
      kind: 'text',
      maxLength: 8,
      placeholder: '如 直达特快',
    },
    {
      key: 'levelCustomColorRight',
      label: '右侧自定义等级颜色（分别设置时生效）',
      kind: 'text',
      placeholder: '如 #406148',
    },
    {
      key: 'icon',
      label: '路徽',
      kind: 'select',
      options: ICON_OPTIONS,
    },
    // —— 显示选项 ——
    {
      key: 'leftDoubleStation',
      label: '开启左侧双站名',
      kind: 'checkbox',
    },
    {
      key: 'rightDoubleStation',
      label: '开启右侧双站名',
      kind: 'checkbox',
    },
    {
      key: 'leftPinyinDouble',
      label: '开启左侧双行拼音',
      kind: 'checkbox',
    },
    {
      key: 'rightPinyinDouble',
      label: '开启右侧双行拼音',
      kind: 'checkbox',
    },
    {
      key: 'oblateFont',
      label: '中文双站名使用扁长字体',
      kind: 'checkbox',
    },
    {
      key: 'alignSides',
      label: '拼音栏贴边',
      kind: 'checkbox',
      hint: '取消勾选时预览左右各留 5 个设计单位内边距',
    },
    {
      key: 'thinPinyin',
      label: '使用窄拼音栏',
      kind: 'checkbox',
      hint: '拼音栏高度 15.04、距离底部 9.7 个设计单位',
    },
    {
      key: 'showNumberBelowStation',
      label: '站名下方显示车次',
      kind: 'checkbox',
      hint: '与双站名互斥（原 App 会取消其一）',
    },
    {
      key: 'enableChineseTrain',
      label: '开启中文车次输入',
      kind: 'checkbox',
      hint: '车次第一行按中文显示（不转大写），字号改为 9',
    },
  ],
  defaults: {
    startStation: '成都',
    startPinyin: 'CHENGDU',
    startStation2: '',
    startPinyin2: '',
    endStation: '昆明',
    endPinyin: 'KUNMING',
    endStation2: '',
    endPinyin2: '',
    trainNumber1: 'K113/4',
    trainNumber2: '',
    trainNumber3: '',
    trainNumberBelowStart: '',
    trainNumberBelowEnd: '',
    levelPreset: DEFAULT_LEVEL,
    separateLevels: false,
    levelLeft: DEFAULT_LEVEL,
    levelRight: DEFAULT_LEVEL,
    levelCustomTextLeft: '',
    levelCustomColorLeft: '',
    levelCustomTextRight: '',
    levelCustomColorRight: '',
    icon: DEFAULT_ICON,
    leftDoubleStation: false,
    rightDoubleStation: false,
    leftPinyinDouble: false,
    rightPinyinDouble: false,
    oblateFont: false,
    alignSides: true,
    thinPinyin: false,
    showNumberBelowStation: false,
    enableChineseTrain: false,
  },
  build(values: PlateValues, ctx): PatchMap {
    const style = ctx.spaceStyle
    const patches: PatchMap = new Map()

    // —— 开关（对应 Plate0Activity 的 L0/M0/O0/P0/N0/Q0/R0/S0/T0） ——
    const leftDouble = bool(values, 'leftDoubleStation')
    const rightDouble = bool(values, 'rightDoubleStation')
    const leftPinyinDouble = leftDouble && bool(values, 'leftPinyinDouble')
    const rightPinyinDouble = rightDouble && bool(values, 'rightPinyinDouble')
    const oblate = bool(values, 'oblateFont')
    const alignSides = bool(values, 'alignSides')
    const thinPinyin = bool(values, 'thinPinyin')
    const chineseTrain = bool(values, 'enableChineseTrain')
    // 双站名与“站名下方显示车次”互斥：App 在勾选双站名后会取消后者。
    const showBelow = bool(values, 'showNumberBelowStation') && !leftDouble && !rightDouble

    // —— 原始输入 ——
    const startCN1 = str(values, 'startStation')
    const startCN2 = str(values, 'startStation2')
    const endCN1 = str(values, 'endStation')
    const endCN2 = str(values, 'endStation2')
    const startPY1 = str(values, 'startPinyin').toUpperCase()
    const startPY2 = str(values, 'startPinyin2').toUpperCase()
    const endPY1 = str(values, 'endPinyin').toUpperCase()
    const endPY2 = str(values, 'endPinyin2').toUpperCase()

    // —— 车次文本（J 与 K/L/M/N 的转换规则不同） ——
    const train1 = str(values, 'trainNumber1')
    const train2 = str(values, 'trainNumber2')
    const train3 = str(values, 'trainNumber3')
    const belowStart = str(values, 'trainNumberBelowStart')
    const belowEnd = str(values, 'trainNumberBelowEnd')
    // J：中文模式 c.w() 规范化；普通模式 - 转 — 后转大写。
    const trainText1 = chineseTrain
      ? normalizeText(train1, style)
      : train1.replace(/-/g, '—').toUpperCase()
    // K/L/M/N：base.a.f() 仅转大写（不规范化空格）。
    const trainText2 = train2.toUpperCase()
    const trainText3 = train3.toUpperCase()
    const belowStartText = belowStart.toUpperCase()
    const belowEndText = belowEnd.toUpperCase()

    // —— 等级文字与底色 ——
    const globalPreset = str(values, 'levelPreset') || DEFAULT_LEVEL
    const separateLevels = bool(values, 'separateLevels')
    const leftPresetId = separateLevels ? str(values, 'levelLeft') || globalPreset : globalPreset
    const rightPresetId = separateLevels ? str(values, 'levelRight') || globalPreset : globalPreset
    const leftPresetText = presetText(leftPresetId)
    const rightPresetText = presetText(rightPresetId)
    const leftLevelText = str(values, 'levelCustomTextLeft') || leftPresetText
    const rightLevelText = separateLevels
      ? str(values, 'levelCustomTextRight') || rightPresetText
      : leftLevelText
    const leftLevelColor = customColor(str(values, 'levelCustomColorLeft')) ?? presetColor(leftPresetId)
    const rightLevelColor = separateLevels
      ? customColor(str(values, 'levelCustomColorRight')) ?? presetColor(rightPresetId)
      : leftLevelColor
    // 未“分别设置”时 G0 左右各取一半（java substring(0, len/2) / (len/2, len)）。
    let levelLeftText: string
    let levelRightText: string
    if (separateLevels) {
      levelLeftText = leftLevelText
      levelRightText = rightLevelText
    } else {
      const mid = Math.floor(leftLevelText.length / 2)
      levelLeftText = leftLevelText.slice(0, mid)
      levelRightText = leftLevelText.slice(mid)
    }

    // —— 拼音栏不贴边时，根布局左右各留 5 个设计单位内边距（q.setPadding）。 ——
    if (!alignSides) {
      patches.set('rl_plate', { padding: { l: ctx.k(5), r: ctx.k(5) } })
    }

    // —— 路徽区域与路徽尺寸（x2 / w2） ——
    patches.set('rl_icon', { width: ctx.k(140.27) })
    let iconSize = 52.27
    if (train2.length > 0 && train3.length > 0) {
      iconSize = chineseTrain ? 40.27 : 46.27
    } else if (train2.length > 0) {
      // 只有第二行：中文车次时缩小，否则维持默认 52.27。
      iconSize = chineseTrain ? 46.27 : 52.27
    }
    // 只有第三行时 App 的 w2() 直接 return（不改变尺寸），按默认值渲染。
    patches.set('iv_icon', {
      width: ctx.k(iconSize),
      height: ctx.k(iconSize),
      margin: { t: ctx.k(6.23) },
      image: str(values, 'icon') || DEFAULT_ICON,
      scaleType: 'centerCrop',
    })

    // —— 中文站名：单行 t/w 与双站名 u/v/x/y ——
    const singleSize = showBelow ? 28 : 32
    const singleScaleStart = estimateScaleX(startCN1, 1, 4, 4.2, style)
    const singleScaleEnd = estimateScaleX(endCN1, 1, 4, 4.2, style)
    // 双站名基准与阈值随“扁长字体”“拼音栏贴边”变化（F2 / f0 / h0 / g0 / i0）。
    const doubleBase = oblate ? 1.5 : 1.1
    const doubleThreshold = oblate ? 5 : 6.5
    const doubleDivisor = alignSides ? doubleThreshold : doubleThreshold - 0.1
    const doubleScale = (text: string) =>
      estimateScaleX(text, doubleBase, doubleThreshold, doubleDivisor, style)

    patches.set('tv_start', {
      text: stationText(startCN1, style),
      sizePx: ctx.k(singleSize),
      font: 'hycsj',
      scaleX: singleScaleStart,
      visible: !leftDouble,
      margin: {
        l: ctx.k(3),
        t: ctx.k(thinPinyin ? 11.5 : 9),
        r: ctx.k(-32),
        b: 0,
      },
    })
    patches.set('tv_start_1', {
      text: stationText(startCN1, style),
      sizePx: ctx.k(18),
      font: 'hycsj',
      scaleX: doubleScale(startCN1),
      visible: leftDouble,
      margin: { l: ctx.k(3), t: 0, r: ctx.k(-32), b: 0 },
    })
    patches.set('tv_start_2', {
      text: stationText(startCN2, style),
      sizePx: ctx.k(18),
      font: 'hycsj',
      scaleX: doubleScale(startCN2),
      visible: leftDouble,
      margin: { l: ctx.k(3), t: ctx.k(3), r: ctx.k(-32), b: ctx.k(2) },
    })
    patches.set('tv_end', {
      text: stationText(endCN1, style),
      sizePx: ctx.k(singleSize),
      font: 'hycsj',
      scaleX: singleScaleEnd,
      visible: !rightDouble,
      margin: {
        l: ctx.k(-32),
        t: ctx.k(thinPinyin ? 11.5 : 9),
        r: ctx.k(3),
        b: 0,
      },
    })
    patches.set('tv_end_1', {
      text: stationText(endCN1, style),
      sizePx: ctx.k(18),
      font: 'hycsj',
      scaleX: doubleScale(endCN1),
      visible: rightDouble,
      margin: { l: ctx.k(-32), t: 0, r: ctx.k(3), b: 0 },
    })
    patches.set('tv_end_2', {
      text: stationText(endCN2, style),
      sizePx: ctx.k(18),
      font: 'hycsj',
      scaleX: doubleScale(endCN2),
      visible: rightDouble,
      margin: { l: ctx.k(-32), t: ctx.k(3), r: ctx.k(3), b: ctx.k(2) },
    })

    // —— 拼音栏（z/A 单行条，B/C/E/F 双行小字） ——
    const barHeight = thinPinyin ? 15.04 : 19.04
    const barBottom = thinPinyin ? 9.7 : 5.54
    // 单行拼音：双站名时左右拼成“拼音1 拼音2”（y2()/z2()）。
    const startBarText = leftDouble ? `${startPY1} ${startPY2}` : startPY1
    const endBarText = rightDouble ? `${endPY1} ${endPY2}` : endPY1
    patches.set('tv_start_en', {
      text: leftPinyinDouble ? '' : startBarText.toUpperCase(),
      sizePx: ctx.k(13),
      font: 'times',
      color: COLORS.white,
      bg: leftLevelColor,
      height: ctx.k(barHeight),
      margin: { l: 0, t: 0, r: ctx.k(-35), b: ctx.k(barBottom) },
      padding: { l: ctx.k(2), r: ctx.k(2) },
      fit: { maxScale: 1, mode: 0 },
    })
    patches.set('tv_end_en', {
      text: rightPinyinDouble ? '' : endBarText.toUpperCase(),
      sizePx: ctx.k(13),
      font: 'times',
      color: COLORS.white,
      bg: rightLevelColor,
      height: ctx.k(barHeight),
      margin: { l: ctx.k(-35), t: 0, r: 0, b: ctx.k(barBottom) },
      padding: { l: ctx.k(2), r: ctx.k(2) },
      fit: { maxScale: 1, mode: 0 },
    })
    patches.set('tv_start_en_1', {
      text: leftPinyinDouble ? startPY1 : '',
      sizePx: ctx.k(8),
      font: 'times',
      color: COLORS.white,
      padding: { l: ctx.k(2), r: ctx.k(2) },
      fit: { maxScale: 1, mode: 0 },
    })
    patches.set('tv_start_en_2', {
      text: leftPinyinDouble ? startPY2 : '',
      sizePx: ctx.k(8),
      font: 'times',
      color: COLORS.white,
      margin: { t: ctx.k(-2) },
      padding: { l: ctx.k(2), r: ctx.k(2) },
      fit: { maxScale: 1, mode: 0 },
    })
    patches.set('tv_end_en_1', {
      text: rightPinyinDouble ? endPY1 : '',
      sizePx: ctx.k(8),
      font: 'times',
      color: COLORS.white,
      padding: { l: ctx.k(2), r: ctx.k(2) },
      fit: { maxScale: 1, mode: 0 },
    })
    patches.set('tv_end_en_2', {
      text: rightPinyinDouble ? endPY2 : '',
      sizePx: ctx.k(8),
      font: 'times',
      color: COLORS.white,
      margin: { t: ctx.k(-2) },
      padding: { l: ctx.k(2), r: ctx.k(2) },
      fit: { maxScale: 1, mode: 0 },
    })

    // —— 左右列车等级（G/H）：中文车次时字号上移 2 个单位 ——
    patches.set('tv_level_1', {
      text: levelLeftText,
      sizePx: ctx.k(10),
      font: 'hyzhj',
      margin: {
        l: 0,
        t: ctx.k(chineseTrain ? 8.5 : 6.5),
        r: ctx.k(chineseTrain ? -2 : -4),
        b: 0,
      },
    })
    patches.set('tv_level_2', {
      text: levelRightText,
      sizePx: ctx.k(10),
      font: 'hyzhj',
      margin: {
        l: ctx.k(chineseTrain ? -2 : -4),
        t: ctx.k(chineseTrain ? 8.5 : 6.5),
        r: 0,
        b: 0,
      },
    })

    // —— 车次 1-3 行（ll_number 在路徽下方居中） ——
    // lineHeightFactor=1.3 模拟 Android includeFontPadding 的行盒高度：
    // 只有 marginTop=-3.5 时引擎默认行盒约 1.1em，相邻行基线间距 ~9.5px，小于数字墨迹高度会重叠。
    const trainSize = chineseTrain ? 9 : 6
    patches.set('ll_number', {
      margin: { l: ctx.k(35), t: 0, r: ctx.k(35), b: 0 },
    })
    patches.set('tv_number_1', {
      text: trainText1,
      sizePx: ctx.k(trainSize),
      font: 'arial',
      visible: !showBelow && trainText1.length > 0,
      fit: { maxScale: 1.05, mode: 1 },
      lineHeightFactor: 1.3,
    })
    patches.set('tv_number_2', {
      text: trainText2,
      sizePx: ctx.k(trainSize),
      font: 'arial',
      visible: !showBelow && trainText2.length > 0,
      margin: { t: ctx.k(chineseTrain ? -1 : -3.5) },
      fit: { maxScale: 1.05, mode: 1 },
      lineHeightFactor: 1.3,
    })
    patches.set('tv_number_3', {
      text: trainText3,
      sizePx: ctx.k(trainSize),
      font: 'arial',
      visible: !showBelow && trainText3.length > 0,
      margin: { t: ctx.k(-3.5) },
      fit: { maxScale: 1.05, mode: 1 },
      lineHeightFactor: 1.3,
    })

    // —— 站名下方车次（M/N）：仅 S0 时显示 ——
    patches.set('tv_bs_number_1', {
      text: belowStartText,
      sizePx: ctx.k(8),
      font: 'arial',
      visible: showBelow && belowStartText.length > 0,
      fit: { maxScale: 1.05, mode: 1 },
    })
    patches.set('tv_bs_number_2', {
      text: belowEndText,
      sizePx: ctx.k(8),
      font: 'arial',
      visible: showBelow && belowEndText.length > 0,
      fit: { maxScale: 1.05, mode: 1 },
    })

    return patches
  },
}
