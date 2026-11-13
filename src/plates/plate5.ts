import type { LayoutNode, NodePatch, PatchMap, PlateValues } from '../core/types'
import { estimateLength, normalizeText } from '../core/text'
import { COLORS } from '../data/colors'
import layoutJson from './layouts/plate5.json'
import type { FieldOption, PlateBuildContext, PlateField, PlateSpec } from './types'
import { bool, str } from './types'

const layout = layoutJson as unknown as LayoutNode

/**
 * 套跑5（Plate5Activity）：
 * J4() 中 `l = (屏宽 - dp20) / 5.2`、`m = 64.5`，`k(f) = l * f / m`，
 * 即宽高比 5.2、设计高度 64.5（与封面 bg_plate_5.png 1370x263 一致）。
 */
const RATIO = 5.2
const DESIGN_HEIGHT = 64.5

/** 字体：站名 hycsj、等级 hyzhj、车次 arial_bd、拼音条 times。 */
const STATION_FONT = 'hycsj' as const
const LEVEL_FONT = 'hyzhj' as const
const NUMBER_FONT = 'arial' as const
const EN_FONT = 'times' as const

const ICON_DIR = 'icons/railway/'
const ICONS: FieldOption[] = Array.from({ length: 14 }, (_, index) => {
  const no = String(index + 1).padStart(2, '0')
  return { label: `路徽 ${index + 1}`, value: `${ICON_DIR}ic_plate_${no}.png` }
})
const DEFAULT_ICON = `${ICON_DIR}ic_plate_01.png`

interface LevelDef {
  id: string
  text: string
  color: string
  label: string
}

/** c.a.a.f.l.c()：左侧（全局）列车等级 + 颜色的备选项（等级文字见 strings.xml level_*）。 */
const LEFT_LEVELS: LevelDef[] = [
  { id: 'zhida1', text: '直达', color: COLORS.zhida1, label: '直达特快 (Z) · 藏青' },
  { id: 'zhida2', text: '直达', color: COLORS.zhida2, label: '直达特快 (Z) · 深蓝' },
  { id: 'zhida3', text: '直达', color: COLORS.zhida3, label: '直达特快 (Z) · 蓝' },
  { id: 'zhida4', text: '直达', color: COLORS.zhida4, label: '直达特快 (Z) · 青' },
  { id: 'zhida5', text: '直达', color: COLORS.zhida5, label: '直达特快 (Z) · 墨绿' },
  { id: 'tekuai1', text: '特快', color: COLORS.tekuai1, label: '特快 (T) · 灰蓝' },
  { id: 'tekuai2', text: '特快', color: COLORS.tekuai2, label: '特快 (T) · 蓝' },
  { id: 'tekuai3', text: '特快', color: COLORS.tekuai3, label: '特快 (T) · 深绿' },
  { id: 'tekuai4', text: '特快', color: COLORS.tekuai4, label: '特快 (T) · 天蓝' },
  { id: 'kuaisu1', text: '快速', color: COLORS.kuaisu1, label: '快速 (K) · 红' },
  { id: 'kuaisu2', text: '快速', color: COLORS.kuaisu2, label: '快速 (K) · 绿' },
  { id: 'lvyou', text: '旅游', color: COLORS.kuaisu1, label: '旅游 (Y) · 红' },
  { id: 'pukuai1', text: '普快', color: COLORS.pukuai1, label: '普快 · 深绿' },
  { id: 'pukuai2', text: '普快', color: COLORS.pukuai2, label: '普快 · 绿' },
  { id: 'puke1', text: '普客', color: COLORS.puke1, label: '普客 · 青' },
  { id: 'puke2', text: '普客', color: COLORS.puke2, label: '普客 · 墨绿' },
  { id: 'puke3', text: '普客', color: COLORS.puke3, label: '普客 · 黑' },
  { id: 'linke1', text: '临客', color: COLORS.linke1, label: '临客 · 墨绿' },
  { id: 'linke2', text: '临客', color: COLORS.linke2, label: '临客 · 深青' },
  { id: 'tongqin', text: '通勤', color: COLORS.puke2, label: '通勤 · 墨绿' },
  { id: 'luyong1', text: '路用', color: COLORS.luyong1, label: '路用 · 绿' },
  { id: 'luyong2', text: '路用', color: COLORS.luyong2, label: '路用 · 青绿' },
]
const LEFT_LEVEL_MAP = new Map(LEFT_LEVELS.map((item) => [item.id, item]))
const LEFT_LEVEL_OPTIONS: FieldOption[] = [
  { label: '自定义…', value: 'custom' },
  ...LEFT_LEVELS.map((item) => ({ label: item.label, value: item.id })),
]

/** c.a.a.f.l.d()：右侧列车等级（只有文字、没有颜色，显示在站名上方时使用）。 */
const RIGHT_LEVEL_OPTIONS: FieldOption[] = [
  { label: '自定义…', value: 'custom' },
  { label: '直达特快 (Z)', value: '直达' },
  { label: '特快 (T)', value: '特快' },
  { label: '快速 (K)', value: '快速' },
  { label: '旅游 (Y)', value: '旅游' },
  { label: '普快', value: '普快' },
  { label: '普客', value: '普客' },
  { label: '临客', value: '临客' },
  { label: '通勤', value: '通勤' },
  { label: '路用', value: '路用' },
]

/** CustomLevelActivity 的颜色选择（原 App 用取色器，这里给出常用色）。 */
const CUSTOM_COLORS: FieldOption[] = [
  { label: '红', value: COLORS.kuaisu1 },
  { label: '绿', value: COLORS.kuaisu2 },
  { label: '藏青', value: COLORS.zhida1 },
  { label: '深蓝', value: COLORS.zhida2 },
  { label: '蓝', value: COLORS.zhida3 },
  { label: '青', value: COLORS.zhida4 },
  { label: '墨绿', value: COLORS.zhida5 },
  { label: '灰蓝', value: COLORS.tekuai1 },
  { label: '深绿', value: COLORS.tekuai3 },
  { label: '天蓝', value: COLORS.tekuai4 },
  { label: '青绿', value: COLORS.luyong2 },
  { label: '黑', value: COLORS.puke3 },
]

const fields: PlateField[] = [
  // 左侧
  { key: 'leftStart', label: '左侧始发站（中文）', kind: 'text', maxLength: 5, required: true, group: '左侧', placeholder: '如 加格达奇' },
  { key: 'leftStartEn', label: '左侧始发站（拼音）', kind: 'text', maxLength: 17, required: true, pinyinOf: 'leftStart', placeholder: '如 JIAGEDAQI' },
  { key: 'leftEnd', label: '左侧终到站（中文）', kind: 'text', maxLength: 5, required: true, placeholder: '如 哈尔滨' },
  { key: 'leftEndEn', label: '左侧终到站（拼音）', kind: 'text', maxLength: 17, required: true, pinyinOf: 'leftEnd', placeholder: '如 HAERBIN' },
  { key: 'leftStart2', label: '左侧始发站2（中文，开启双站名后显示）', kind: 'text', maxLength: 5, placeholder: '如 加格达奇' },
  { key: 'leftStartEn2', label: '左侧始发站2（拼音）', kind: 'text', maxLength: 17, pinyinOf: 'leftStart2', placeholder: '如 JIAGEDAQI' },
  { key: 'leftEnd2', label: '左侧终到站2（中文，开启双站名后显示）', kind: 'text', maxLength: 5, placeholder: '如 哈尔滨' },
  { key: 'leftEndEn2', label: '左侧终到站2（拼音）', kind: 'text', maxLength: 17, pinyinOf: 'leftEnd2', placeholder: '如 HAERBIN' },
  { key: 'leftNumber1', label: '左侧车次 第一行', kind: 'text', maxLength: 15, placeholder: '如 K7104' },
  { key: 'leftNumber2', label: '左侧车次 第二行（可选）', kind: 'text', maxLength: 15, placeholder: '如 K7103' },
  // 右侧
  { key: 'rightStart', label: '右侧始发站（中文）', kind: 'text', maxLength: 5, required: true, group: '右侧', placeholder: '如 漠河' },
  { key: 'rightStartEn', label: '右侧始发站（拼音）', kind: 'text', maxLength: 17, required: true, pinyinOf: 'rightStart', placeholder: '如 MOHE' },
  { key: 'rightEnd', label: '右侧终到站（中文）', kind: 'text', maxLength: 5, required: true, placeholder: '如 哈尔滨' },
  { key: 'rightEndEn', label: '右侧终到站（拼音）', kind: 'text', maxLength: 17, required: true, pinyinOf: 'rightEnd', placeholder: '如 HAERBIN' },
  { key: 'rightStart2', label: '右侧始发站2（中文，开启双站名后显示）', kind: 'text', maxLength: 5, placeholder: '如 漠河' },
  { key: 'rightStartEn2', label: '右侧始发站2（拼音）', kind: 'text', maxLength: 17, pinyinOf: 'rightStart2', placeholder: '如 MOHE' },
  { key: 'rightEnd2', label: '右侧终到站2（中文，开启双站名后显示）', kind: 'text', maxLength: 5, placeholder: '如 哈尔滨' },
  { key: 'rightEndEn2', label: '右侧终到站2（拼音）', kind: 'text', maxLength: 17, pinyinOf: 'rightEnd2', placeholder: '如 HAERBIN' },
  { key: 'rightNumber1', label: '右侧车次 第一行', kind: 'text', maxLength: 15, placeholder: '如 K7042' },
  { key: 'rightNumber2', label: '右侧车次 第二行（可选）', kind: 'text', maxLength: 15, placeholder: '如 K7041' },
  // 中缝车次
  { key: 'middleNumber1', label: '中间车次 第一行（可选）', kind: 'text', maxLength: 20, group: '中间路徽', placeholder: '如 0' },
  { key: 'middleNumber2', label: '中间车次 第二行（可选）', kind: 'text', maxLength: 20, placeholder: '如 0' },
  { key: 'middleNumber3', label: '中间车次 第三行（可选）', kind: 'text', maxLength: 20, placeholder: '如 0' },
  { key: 'icon', label: '路徽图标', kind: 'select', options: ICONS, group: '中间路徽' },
  // 列车等级
  { key: 'levelLeft', label: '左侧列车等级（同时决定等级颜色）', kind: 'select', options: LEFT_LEVEL_OPTIONS, group: '列车等级' },
  { key: 'customLevelLeft', label: '左侧自定义等级（2 或 4 个汉字）', kind: 'text', maxLength: 4, placeholder: '如 直达' },
  { key: 'customLevelColor', label: '左侧自定义等级颜色', kind: 'select', options: CUSTOM_COLORS },
  { key: 'levelRight', label: '右侧列车等级（显示在站名上方时使用）', kind: 'select', options: RIGHT_LEVEL_OPTIONS },
  { key: 'customLevelRight', label: '右侧自定义等级（2 或 4 个汉字）', kind: 'text', maxLength: 4, placeholder: '如 快速' },
  // 显示选项
  { key: 'showAboveStation', label: '列车等级分别显示在站名上方', kind: 'checkbox', group: '显示选项' },
  { key: 'alignSides', label: '拼音栏贴边', kind: 'checkbox' },
  { key: 'leftStartDouble', label: '开启左侧始发站双站名', kind: 'checkbox' },
  { key: 'leftEndDouble', label: '开启左侧终到站双站名', kind: 'checkbox' },
  { key: 'rightStartDouble', label: '开启右侧始发站双站名', kind: 'checkbox' },
  { key: 'rightEndDouble', label: '开启右侧终到站双站名', kind: 'checkbox' },
  { key: 'leftEnDouble', label: '开启左侧双行拼音', kind: 'checkbox' },
  { key: 'rightEnDouble', label: '开启右侧双行拼音', kind: 'checkbox' },
]

const defaults: PlateValues = {
  leftStart: '加格达奇',
  leftStartEn: 'JIAGEDAQI',
  leftEnd: '哈尔滨',
  leftEndEn: 'HAERBIN',
  leftStart2: '',
  leftStartEn2: '',
  leftEnd2: '',
  leftEndEn2: '',
  leftNumber1: 'K7104',
  leftNumber2: 'K7103',
  rightStart: '漠河',
  rightStartEn: 'MOHE',
  rightEnd: '哈尔滨',
  rightEndEn: 'HAERBIN',
  rightStart2: '',
  rightStartEn2: '',
  rightEnd2: '',
  rightEndEn2: '',
  rightNumber1: 'K7042',
  rightNumber2: 'K7041',
  middleNumber1: '',
  middleNumber2: '',
  middleNumber3: '',
  icon: DEFAULT_ICON,
  levelLeft: 'kuaisu1',
  customLevelLeft: '',
  customLevelColor: COLORS.kuaisu1,
  levelRight: '快速',
  customLevelRight: '',
  showAboveStation: false,
  alignSides: true,
  leftStartDouble: false,
  leftEndDouble: false,
  rightStartDouble: false,
  rightEndDouble: false,
  leftEnDouble: false,
  rightEnDouble: false,
}

/** 等级文字拆成左右两半（tv_level_1 / tv_level_2）。 */
function splitLevel(text: string): { left: string; right: string } {
  if (!text) return { left: '', right: '' }
  const middle = Math.floor(text.length / 2)
  return { left: text.slice(0, middle), right: text.slice(middle) }
}

/**
 * 源码 N4()/O4()：把拼音字段拼成单行拼音条文本。
 * 双行拼音以“始发站两张 + 终到站两张”的顺序用空格连接。
 */
function composeEn(
  start: string,
  start2: string,
  end: string,
  end2: string,
  startDouble: boolean,
  endDouble: boolean,
): string {
  const parts: string[] = []
  if (startDouble) {
    parts.push(start, start2)
    if (endDouble) parts.push(end, end2)
    else parts.push(end)
  } else if (endDouble) {
    parts.push(start, end, end2)
  } else {
    parts.push(start, end)
  }
  return parts
    .map((item) => item.toUpperCase())
    .filter((item) => item.length > 0)
    .join(' ')
}

/**
 * M4()：按站名文字长度计算左右两栏的 layout_weight（双站名时除以 1.5）。
 * 两边长度相等时都用 1，否则取 max(2, 估算长度)。
 */
function sideWeights(
  start: string,
  start2: string,
  end: string,
  end2: string,
  startDouble: boolean,
  endDouble: boolean,
  spaceStyle: 0 | 1 | 2,
): { start: number; end: number } {
  let startLength = estimateLength(start, spaceStyle)
  let endLength = estimateLength(end, spaceStyle)
  if (startDouble) {
    startLength = Math.max(startLength, estimateLength(start2, spaceStyle)) / 1.5
  }
  if (endDouble) {
    endLength = Math.max(endLength, estimateLength(end2, spaceStyle)) / 1.5
  }
  if (startLength === endLength) return { start: 1, end: 1 }
  return { start: Math.max(2, startLength), end: Math.max(2, endLength) }
}

export const plate5: PlateSpec = {
  id: 'plate5',
  name: '套跑5',
  ratio: RATIO,
  designHeight: DESIGN_HEIGHT,
  cover: 'covers/bg_plate_5.png',
  layout,
  fonts: [STATION_FONT, LEVEL_FONT, NUMBER_FONT, EN_FONT],
  fields,
  defaults,

  build(values: PlateValues, ctx: PlateBuildContext): PatchMap {
    const patches: PatchMap = new Map<string, NodePatch>()
    const set = (id: string, patch: NodePatch): void => {
      const previous = patches.get(id)
      patches.set(id, previous ? { ...previous, ...patch } : patch)
    }
    const k = ctx.k
    const spaceStyle = ctx.spaceStyle

    // 源码里的开关：showAbove=E1、alignSides=L1、leftStartDouble=F1、leftEndDouble=G1、
    // rightStartDouble=H1、rightEndDouble=I1、leftEnDouble=J1、rightEnDouble=K1。
    const showAbove = bool(values, 'showAboveStation')
    const alignSides = values['alignSides'] !== false
    const leftStartDouble = bool(values, 'leftStartDouble')
    const leftEndDouble = bool(values, 'leftEndDouble')
    const rightStartDouble = bool(values, 'rightStartDouble')
    const rightEndDouble = bool(values, 'rightEndDouble')
    const leftEnDouble = bool(values, 'leftEnDouble')
    const rightEnDouble = bool(values, 'rightEnDouble')

    // 中文站名走 c.a.a.f.c.w()（括号半角化、空格替换、去换行）。
    const zh = (key: string): string => normalizeText(str(values, key), spaceStyle)
    const upper = (key: string): string => str(values, key).toUpperCase()

    const leftStart = zh('leftStart')
    const leftStart2 = zh('leftStart2')
    const leftEnd = zh('leftEnd')
    const leftEnd2 = zh('leftEnd2')
    const rightStart = zh('rightStart')
    const rightStart2 = zh('rightStart2')
    const rightEnd = zh('rightEnd')
    const rightEnd2 = zh('rightEnd2')

    const leftNumber1 = upper('leftNumber1')
    const leftNumber2 = upper('leftNumber2')
    const rightNumber1 = upper('rightNumber1')
    const rightNumber2 = upper('rightNumber2')
    const middleNumbers = [upper('middleNumber1'), upper('middleNumber2'), upper('middleNumber3')]

    // —— 主板与顶部等级行 ——
    // J4()：rl_plate_main 高度 = l = 屏宽 / 5.2。
    set('rl_plate_main', { height: k(DESIGN_HEIGHT) })
    if (showAbove) {
      // v()：显示顶部等级行，主板向上重叠（A1 = 屏宽/5 - l）。
      set('ll_plate_ex', { visible: true, height: k(15), padding: { t: k(2) } })
      set('rl_plate_main', {
        margin: { t: ctx.widthPx / 5 - ctx.heightPx - k(15) },
      })
    } else {
      set('ll_plate_ex', { visible: false })
    }

    // —— 列车等级文字与颜色 ——
    const levelId = str(values, 'levelLeft') || 'kuaisu1'
    let levelText = ''
    let levelColor: string = COLORS.kuaisu1
    if (levelId === 'custom') {
      levelText = str(values, 'customLevelLeft').trim()
      levelColor = str(values, 'customLevelColor') || COLORS.kuaisu1
    } else {
      const preset = LEFT_LEVEL_MAP.get(levelId) ?? LEFT_LEVEL_MAP.get('kuaisu1')
      if (preset) {
        levelText = preset.text
        levelColor = preset.color
      }
    }
    const level = splitLevel(levelText)

    const rightLevelValue = str(values, 'levelRight') || '快速'
    const rightLevelText =
      rightLevelValue === 'custom' ? str(values, 'customLevelRight').trim() : rightLevelValue
    const rightLevel = splitLevel(rightLevelText)

    // 顶部等级行（ll_plate_ex）用全角空格分隔两字；文字加粗（setFakeBoldText）。
    set('tv_level_ex_1', {
      text: levelText ? `${level.left}\u3000${level.right}` : '',
      sizePx: k(10.5),
      font: LEVEL_FONT,
      bold: true,
    })
    set('tv_level_ex_2', {
      text: rightLevelText ? `${rightLevel.left}\u3000${rightLevel.right}` : '',
      sizePx: k(10.5),
      font: LEVEL_FONT,
      bold: true,
      margin: { l: k(66.8) },
    })

    // 中缝图标两侧的单字等级（J4()：I(m0,...) / I(n0,...)）。
    set('tv_level_1', {
      text: level.left,
      sizePx: k(10),
      font: LEVEL_FONT,
      scaleX: 1.15,
      visible: !showAbove,
      margin: { l: 0, t: k(3), r: k(-3), b: 0 },
    })
    set('tv_level_2', {
      text: level.right,
      sizePx: k(10),
      font: LEVEL_FONT,
      scaleX: 1.15,
      visible: !showAbove,
      margin: { l: k(-3), t: k(3), r: 0, b: 0 },
    })

    // —— 中缝路徽 ——
    // I4()：中间车次决定路徽大小（都空 43.8；仅第二行有值 42.5；其余 37.0）。
    const hasMiddle2 = middleNumbers[1].length > 0
    const hasMiddle3 = middleNumbers[2].length > 0
    let iconSize = 37
    if (!hasMiddle2 && !hasMiddle3) iconSize = 43.8
    else if (hasMiddle2 && !hasMiddle3) iconSize = 42.5
    set('rl_icon', { width: k(90) })
    set('iv_icon', {
      width: k(iconSize),
      height: k(iconSize),
      margin: { t: k(showAbove ? 7 : 9) },
      image: str(values, 'icon') || DEFAULT_ICON,
    })

    // 中间车次三行（U4 中 c.a.a.f.c.g(..., 1)：大写 + mode 1、最大 1.05 压缩）。
    set('ll_number_middle', { margin: { l: k(11.6), r: k(11.6) } })
    const middleIds = ['tv_number_31', 'tv_number_32', 'tv_number_33']
    middleNumbers.forEach((text, index) => {
      const patch: NodePatch = {
        text,
        visible: text.length > 0,
        sizePx: k(6),
        font: NUMBER_FONT,
        bold: true,
        lineHeightFactor: 1.32,
        fit: { maxScale: 1.05, mode: 1 },
      }
      if (index > 0) patch.margin = { t: k(-3.5) }
      set(middleIds[index], patch)
    })

    // —— 左右两组 ——
    const singleSize = showAbove ? 29 : 31
    const doubleSize = showAbove ? 16.5 : 17.5

    // J4()：左右 parent 边距（r 为负值，向图标方向外扩）。
    const leftParentBottom = showAbove
      ? leftStartDouble || leftEndDouble
        ? 0.5
        : 4
      : leftStartDouble || leftEndDouble
        ? 0.5
        : 6
    const rightParentBottom = showAbove
      ? rightStartDouble || rightEndDouble
        ? 0.5
        : 4
      : rightStartDouble || rightEndDouble
        ? 0.5
        : 6
    set('ll_left_parent', { margin: { l: k(2), t: 0, r: k(-9.6), b: k(leftParentBottom) } })
    set('ll_right_parent', { margin: { l: k(-9.6), t: 0, r: k(2), b: k(rightParentBottom) } })

    // M4()：中文站名与拼音子行按长度分权重。
    const leftWeights = sideWeights(
      leftStart,
      leftStart2,
      leftEnd,
      leftEnd2,
      leftStartDouble,
      leftEndDouble,
      spaceStyle,
    )
    const rightWeights = sideWeights(
      rightStart,
      rightStart2,
      rightEnd,
      rightEnd2,
      rightStartDouble,
      rightEndDouble,
      spaceStyle,
    )
    set('ll_left_1', { weight: leftWeights.start })
    set('ll_left_2', { weight: leftWeights.end })
    set('ll_right_1', { weight: rightWeights.start })
    set('ll_right_2', { weight: rightWeights.end })
    set('ll_left_en_1', { weight: leftWeights.start })
    set('ll_left_en_2', { weight: leftWeights.end })
    set('ll_right_en_1', { weight: rightWeights.start })
    set('ll_right_en_2', { weight: rightWeights.end })

    // 车次块：J4() 中 ll_number_* 左右边距 3.5、分隔线高 1 且上下 1。
    set('ll_number_left', { margin: { l: k(3.5), r: k(3.5) } })
    set('ll_number_right', { margin: { l: k(3.5), r: k(3.5) } })
    const numberPatch = (): NodePatch => ({
      sizePx: k(6),
      font: NUMBER_FONT,
      padding: { l: k(0.5), r: k(0.5) },
      // Android includeFontPadding：arial 行盒比 Skia 字体包围盒约高 19%。
      lineHeightFactor: 1.32,
    })
    // tv_number_11 在 XML 里是 match_parent；父容器 wrap_content 时 Android 按文字行高处理，
    // 这里用 height: 'wrap' 等价表达（否则会撑满整个车次块把第二行挤出裁剪区）。
    set('tv_number_11', { text: leftNumber1, height: 'wrap', ...numberPatch() })
    set('tv_number_12', {
      text: leftNumber2,
      visible: leftNumber2.length > 0,
      ...numberPatch(),
    })
    set('v_divider_left', {
      visible: leftNumber2.length > 0,
      height: k(1),
      margin: { t: k(1), b: k(1) },
    })
    set('tv_number_21', { text: rightNumber1, ...numberPatch() })
    set('tv_number_22', {
      text: rightNumber2,
      visible: rightNumber2.length > 0,
      ...numberPatch(),
    })
    set('v_divider_right', {
      visible: rightNumber2.length > 0,
      height: k(1),
      margin: { t: k(1), b: k(1) },
    })

    // —— 中文站名 ——
    const fitBase = (double: boolean): number => (double ? 1 : 0.8)
    set('tv_left_start_1', {
      text: leftStart,
      sizePx: k(leftStartDouble ? doubleSize : singleSize),
      font: STATION_FONT,
      fitLength: { maxScale: fitBase(leftStartDouble) },
      margin: { b: k(leftStartDouble ? (showAbove ? 4 : 1) : 0) },
    })
    set('tv_left_start_2', {
      text: leftStart2,
      visible: leftStartDouble,
      sizePx: k(doubleSize),
      font: STATION_FONT,
      fitLength: { maxScale: fitBase(leftStartDouble) },
    })
    set('tv_left_end_1', {
      text: leftEnd,
      sizePx: k(leftEndDouble ? doubleSize : singleSize),
      font: STATION_FONT,
      fitLength: { maxScale: fitBase(leftEndDouble) },
      margin: { b: k(leftEndDouble ? (showAbove ? 4 : 1) : 0) },
    })
    set('tv_left_end_2', {
      text: leftEnd2,
      visible: leftEndDouble,
      sizePx: k(doubleSize),
      font: STATION_FONT,
      fitLength: { maxScale: fitBase(leftEndDouble) },
    })
    set('tv_right_start_1', {
      text: rightStart,
      sizePx: k(rightStartDouble ? doubleSize : singleSize),
      font: STATION_FONT,
      fitLength: { maxScale: fitBase(rightStartDouble) },
      margin: { b: k(rightStartDouble ? (showAbove ? 4 : 1) : 0) },
    })
    set('tv_right_start_2', {
      text: rightStart2,
      visible: rightStartDouble,
      sizePx: k(doubleSize),
      font: STATION_FONT,
      fitLength: { maxScale: fitBase(rightStartDouble) },
    })
    set('tv_right_end_1', {
      text: rightEnd,
      sizePx: k(rightEndDouble ? doubleSize : singleSize),
      font: STATION_FONT,
      fitLength: { maxScale: fitBase(rightEndDouble) },
      margin: { b: k(rightEndDouble ? (showAbove ? 4 : 1) : 0) },
    })
    set('tv_right_end_2', {
      text: rightEnd2,
      visible: rightEndDouble,
      sizePx: k(doubleSize),
      font: STATION_FONT,
      fitLength: { maxScale: fitBase(rightEndDouble) },
    })

    // —— 拼音条 ——
    // P4()/Q4()：只有开启双站名且开启双行拼音时，才拆成上下两行。
    const leftEnDoubleLine = (leftStartDouble || leftEndDouble) && leftEnDouble
    const rightEnDoubleLine = (rightStartDouble || rightEndDouble) && rightEnDouble
    const leftEn = composeEn(
      str(values, 'leftStartEn'),
      str(values, 'leftStartEn2'),
      str(values, 'leftEndEn'),
      str(values, 'leftEndEn2'),
      leftStartDouble,
      leftEndDouble,
    )
    const rightEn = composeEn(
      str(values, 'rightStartEn'),
      str(values, 'rightStartEn2'),
      str(values, 'rightEndEn'),
      str(values, 'rightEndEn2'),
      rightStartDouble,
      rightEndDouble,
    )

    const barHeight = k(showAbove ? 14 : 16.5)
    set('tv_left_en', {
      text: leftEnDoubleLine ? '' : leftEn,
      sizePx: k(12),
      font: EN_FONT,
      height: barHeight,
      bg: levelColor,
      padding: { l: k(2), r: k(2) },
      margin: { l: k(alignSides ? 0 : 3), r: k(-11.6), b: k(4.5) },
      fit: leftEnDoubleLine ? undefined : { maxScale: 1, mode: 0 },
    })
    set('tv_right_en', {
      text: rightEnDoubleLine ? '' : rightEn,
      sizePx: k(12),
      font: EN_FONT,
      height: barHeight,
      bg: levelColor,
      padding: { l: k(2), r: k(2) },
      margin: { l: k(-11.6), r: k(alignSides ? 0 : 3), b: k(4.5) },
      fit: rightEnDoubleLine ? undefined : { maxScale: 1, mode: 0 },
    })

    // R4()：拼音条双行模式下的四个子行（尺寸 7 或 12，等宽分栏）。
    const enPatch = (text: string, sizeUnits: number, visible: boolean): NodePatch => ({
      text,
      visible,
      sizePx: k(sizeUnits),
      font: EN_FONT,
      fit: { maxScale: 1, mode: 0 },
    })
    const leftEnPatches: Array<[string, string, boolean]> = [
      ['tv_left_start_en_1', str(values, 'leftStartEn'), true],
      ['tv_left_start_en_2', str(values, 'leftStartEn2'), leftStartDouble],
      ['tv_left_end_en_1', str(values, 'leftEndEn'), true],
      ['tv_left_end_en_2', str(values, 'leftEndEn2'), leftEndDouble],
    ]
    const rightEnPatches: Array<[string, string, boolean]> = [
      ['tv_right_start_en_1', str(values, 'rightStartEn'), true],
      ['tv_right_start_en_2', str(values, 'rightStartEn2'), rightStartDouble],
      ['tv_right_end_en_1', str(values, 'rightEndEn'), true],
      ['tv_right_end_en_2', str(values, 'rightEndEn2'), rightEndDouble],
    ]
    if (leftEnDoubleLine) {
      // 左栏：始发站拼音 / 终到站拼音各自上下两行。
      const sizes = [leftStartDouble ? 7 : 12, leftStartDouble ? 7 : 12, leftEndDouble ? 7 : 12, leftEndDouble ? 7 : 12]
      leftEnPatches.forEach(([id, text, visible], index) => {
        set(id, enPatch(text.toUpperCase(), sizes[index], visible))
      })
    } else {
      set('tv_left_start_en_1', { text: '' })
      set('tv_left_start_en_2', { text: '' })
      set('tv_left_end_en_1', { text: '' })
      set('tv_left_end_en_2', { text: '' })
    }
    if (rightEnDoubleLine) {
      const sizes = [
        rightStartDouble ? 7 : 12,
        rightStartDouble ? 7 : 12,
        rightEndDouble ? 7 : 12,
        rightEndDouble ? 7 : 12,
      ]
      rightEnPatches.forEach(([id, text, visible], index) => {
        set(id, enPatch(text.toUpperCase(), sizes[index], visible))
      })
    } else {
      set('tv_right_start_en_1', { text: '' })
      set('tv_right_start_en_2', { text: '' })
      set('tv_right_end_en_1', { text: '' })
      set('tv_right_end_en_2', { text: '' })
    }

    return patches
  },
}
