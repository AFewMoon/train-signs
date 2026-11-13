import type { LayoutNode, PatchMap, PlateValues } from '../core/types'
import type { SpaceStyle } from '../core/text'
import { estimateLength, fitScaleX, normalizeText } from '../core/text'
import { LEVEL_PRESETS } from '../data/colors'
import layoutJson from './layouts/plate4.json'
import type { FieldOption, PlateSpec } from './types'
import { bool, str } from './types'

const layout = layoutJson as unknown as LayoutNode

/** Plate4Activity.u1()：l = 屏宽 / 5.15、m = 69.5 → 比例 5.15、设计高度 69.5。 */
const RATIO = 5.15
const DESIGN_HEIGHT = 69.5
/** Plate4Activity.u1()：ll_plate_main 左右 padding（k 单位）。 */
const MAIN_PADDING = 6
/** 中文站名：f(text, 0.9, 2.5, 贴边 ? 2.8 : 2.6)。 */
const NAME_MAX_SCALE = 0.9
const NAME_THRESHOLD = 2.5
/** 车次行：Android TextView 行盒含 includeFontPadding，约为字号的 1.3 倍；
 *  引擎默认按字体包围盒（约 1.12 倍）计算，用 lineHeightFactor 补齐行距。 */
const NUMBER_LINE_HEIGHT = 1.3

/** 路徽（APK mipmap ic_plate_01..14）。 */
const ICON_OPTIONS: FieldOption[] = Array.from({ length: 14 }, (_, index) => {
  const serial = String(index + 1).padStart(2, '0')
  return { label: `路徽 ${index + 1}`, value: `icons/railway/ic_plate_${serial}.png` }
})
const DEFAULT_ICON = 'icons/railway/ic_plate_01.png'

/** 列车等级预设（c.a.a.f.l.c()）：选项值取预设 id，等级文字与颜色由 id 推导。 */
const LEVEL_OPTIONS: FieldOption[] = LEVEL_PRESETS.map((preset) => ({
  label: preset.label,
  value: preset.id,
}))

/** 与 Java 一致：预设同时决定等级文字与颜色，自定义文字只覆盖文字。 */
function resolveLevel(values: PlateValues): { text: string; color: string } {
  const id = str(values, 'level') || 'tekuai2'
  const preset = LEVEL_PRESETS.find((item) => item.id === id) ?? LEVEL_PRESETS[0]
  return { text: preset.text, color: preset.color }
}

/** 把等级文字按 App 的 substring(0, len/2) / substring(len/2) 拆成左右两半。 */
function splitLevel(text: string): [string, string] {
  const half = Math.floor(text.length / 2)
  return [text.slice(0, half), text.slice(half)]
}

/**
 * 对应 c.a.a.f.c.f()：中文站名按估算字宽压缩。
 * 估算宽度 > threshold 时 scale = maxScale / (宽度 / 可用字宽)。
 */
function nameScale(
  text: string,
  spaceStyle: SpaceStyle,
  maxScale: number,
  threshold: number,
  widthUnits: number,
): number {
  const normalized = normalizeText(text, spaceStyle)
  const length = estimateLength(normalized, spaceStyle)
  if (length <= threshold) return maxScale
  return maxScale / (length / widthUnits)
}

/** 套跑4（Plate4Activity）：3 站 2 路徽 2 组车次，可附加一组车次。 */
export const plate4: PlateSpec = {
  id: 'plate4',
  name: '套跑4',
  ratio: RATIO,
  designHeight: DESIGN_HEIGHT,
  cover: 'covers/bg_plate_4.png',
  layout,
  fonts: ['hycsj', 'times', 'hyzhj', 'arial'],
  fields: [
    // 必填校验顺序与 Plate4Activity.h() 一致：中文站名 → 拼音 → 首行车次 → 附加车次。
    // 中文站名（B(et_start/a0/b0, 7)），拼音 XML maxLength 20。
    { key: 'start', label: '始发站（中文）', kind: 'text', maxLength: 7, placeholder: '如 上海', required: true, group: '站名（中文）' },
    { key: 'middle', label: '终到/始发站（中文）', kind: 'text', maxLength: 7, placeholder: '如 大连', required: true, group: '站名（中文）' },
    { key: 'end', label: '终到站（中文）', kind: 'text', maxLength: 7, placeholder: '如 大庆', required: true, group: '站名（中文）' },
    { key: 'startEn', label: '始发站（拼音）', kind: 'text', maxLength: 20, placeholder: '如 SHANGHAI', pinyinOf: 'start', required: true, group: '拼音' },
    { key: 'middleEn', label: '终到/始发站（拼音）', kind: 'text', maxLength: 20, placeholder: '如 DALIAN', pinyinOf: 'middle', required: true, group: '拼音' },
    { key: 'endEn', label: '终到站（拼音）', kind: 'text', maxLength: 20, placeholder: '如 DAQING', pinyinOf: 'end', required: true, group: '拼音' },
    // 等级与颜色（sp_level_1 全局颜色 + 左右两侧等级文字，l.c() 预设）。
    { key: 'level', label: '列车等级与颜色', kind: 'select', options: LEVEL_OPTIONS, group: '列车等级与外观' },
    { key: 'levelTextLeft', label: '自定义左侧等级文字（留空使用预设）', kind: 'text', maxLength: 4, placeholder: '如 特快', group: '列车等级与外观' },
    { key: 'levelTextRight', label: '自定义右侧等级文字（留空使用预设）', kind: 'text', maxLength: 4, placeholder: '如 特快', group: '列车等级与外观' },
    { key: 'icon', label: '路徽', kind: 'select', options: ICON_OPTIONS, group: '列车等级与外观' },
    { key: 'alignSides', label: '拼音栏贴边', kind: 'checkbox', group: '列车等级与外观' },
    // 车次：2 组 × 3 行，XML maxLength 20。
    { key: 'train11', label: '车次1 第一行', kind: 'text', maxLength: 20, placeholder: '如 T132/3/2', required: true, group: '车次信息' },
    { key: 'train12', label: '车次1 第二行（可选）', kind: 'text', maxLength: 20, group: '车次信息' },
    { key: 'train13', label: '车次1 第三行（可选）', kind: 'text', maxLength: 20, group: '车次信息' },
    { key: 'train21', label: '车次2 第一行', kind: 'text', maxLength: 20, placeholder: '如 T129/30', required: true, group: '车次信息' },
    { key: 'train22', label: '车次2 第二行（可选）', kind: 'text', maxLength: 20, group: '车次信息' },
    { key: 'train23', label: '车次2 第三行（可选）', kind: 'text', maxLength: 20, group: '车次信息' },
    // 附加车次（cb_extra 关闭时整块隐藏，界面上也需要先勾选才会校验）。
    { key: 'extra', label: '开启附加车次编辑', kind: 'checkbox', group: '附加车次（可选）' },
    { key: 'extraStart', label: '附加始发站（中文）', kind: 'text', maxLength: 10, placeholder: '如 长春', group: '附加车次（可选）' },
    { key: 'extraEnd', label: '附加终到站（中文）', kind: 'text', maxLength: 10, placeholder: '如 图们', group: '附加车次（可选）' },
    { key: 'extraTrain', label: '附加车次', kind: 'text', maxLength: 40, placeholder: '如 K7325/6', group: '附加车次（可选）' },
  ],
  defaults: {
    start: '上海',
    middle: '大连',
    end: '大庆',
    startEn: 'SHANGHAI',
    middleEn: 'DALIAN',
    endEn: 'DAQING',
    level: 'tekuai2',
    levelTextLeft: '',
    levelTextRight: '',
    icon: DEFAULT_ICON,
    alignSides: false,
    train11: 'T132/3/2',
    train12: 'T131/4/1',
    train13: '',
    train21: 'T129/30',
    train22: 'T130/29',
    train23: '',
    extra: false,
    extraStart: '',
    extraEnd: '',
    extraTrain: '',
  },
  build(values: PlateValues, ctx): PatchMap {
    const level = resolveLevel(values)
    /** 预设等级文字；自定义文字非空时覆盖。 */
    const levelText = (key: string): string => str(values, key).trim() || level.text
    const color = level.color
    const icon = str(values, 'icon') || DEFAULT_ICON
    const alignSides = bool(values, 'alignSides')
    const showExtra = bool(values, 'extra')
    /** 贴边（cb_align_sides）时可用字宽 2.8，否则 2.6。 */
    const nameWidth = alignSides ? 2.8 : 2.6
    /** App 的车次 TextView 宽 = 83 - 16*2 = 51 设计单位（ll_number 缩小 16 边距）。 */
    const numberWidth = ctx.k(51)
    const numberSize = ctx.k(6)
    const patches: PatchMap = new Map()

    /** 车次行：h()/g() 用 mode 1、最大 scaleX 1.0。 */
    const setNumber = (id: string, raw: string, top?: number, hideWhenEmpty = false): void => {
      const text = raw.toUpperCase()
      patches.set(id, {
        text,
        font: 'arial',
        sizePx: numberSize,
        scaleX: fitScaleX(text, numberWidth, numberSize, 1, 1),
        lineHeightFactor: NUMBER_LINE_HEIGHT,
        visible: hideWhenEmpty ? text.length > 0 : true,
        ...(top === undefined ? {} : { margin: { t: ctx.k(top) } }),
      })
    }

    // 主行：高度为版心高度（Java: r.height = l = 屏宽 / 5.15），左右 padding 由贴边开关决定。
    patches.set('ll_plate_main', {
      height: ctx.k(DESIGN_HEIGHT),
      padding: alignSides ? { l: 0, r: 0 } : { l: ctx.k(MAIN_PADDING), r: ctx.k(MAIN_PADDING) },
    })

    // 三站中文名（hycsj，k(30)）：f(..., 0.9, 2.5, 2.6/2.8)。
    const setStation = (id: string, raw: string): void => {
      patches.set(id, {
        text: normalizeText(raw, ctx.spaceStyle),
        font: 'hycsj',
        sizePx: ctx.k(30),
        scaleX: nameScale(raw, ctx.spaceStyle, NAME_MAX_SCALE, NAME_THRESHOLD, nameWidth),
        margin: { t: ctx.k(11) },
      })
    }
    setStation('tv_start', str(values, 'start'))
    setStation('tv_middle', str(values, 'middle'))
    setStation('tv_end', str(values, 'end'))

    // 拼音栏（times，k(13)）：g(A, n(c0), 0) → h(mode 0, maxScale 1.0)。
    const setPinyin = (id: string, raw: string): void => {
      patches.set(id, {
        text: raw.toUpperCase(),
        font: 'times',
        sizePx: ctx.k(13),
        height: ctx.k(17.37),
        margin: { b: ctx.k(7.78) },
        padding: { l: ctx.k(1), r: ctx.k(1) },
        bg: color,
        fit: { maxScale: 1, mode: 0 },
      })
    }
    setPinyin('tv_start_en', str(values, 'startEn'))
    setPinyin('tv_middle_en', str(values, 'middleEn'))
    setPinyin('tv_end_en', str(values, 'endEn'))

    // 两个路徽位（宽度 k(83)，左右各 -16.5 设计单位；路徽 k(44)）。
    for (const index of [1, 2] as const) {
      patches.set(`rl_icon_${index}`, {
        width: ctx.k(83),
        margin: { l: ctx.k(-16.5), r: ctx.k(-16.5) },
      })
      patches.set(`iv_icon_${index}`, {
        width: ctx.k(44),
        height: ctx.k(44),
        margin: { t: ctx.k(7.79) },
        image: icon,
      })
    }

    // 等级文字（hyzhj，k(10)）：按 App 拆成左右两半，textScaleX 由 XML 的 1.15 保持。
    const setLevel = (index: 1 | 2, raw: string): void => {
      const [left, right] = splitLevel(raw)
      patches.set(`tv_level_${index}1`, {
        text: left,
        font: 'hyzhj',
        sizePx: ctx.k(10),
        margin: { t: ctx.k(5.5), r: ctx.k(-5) },
      })
      patches.set(`tv_level_${index}2`, {
        text: right,
        font: 'hyzhj',
        sizePx: ctx.k(10),
        margin: { l: ctx.k(-5), t: ctx.k(5.5) },
      })
    }
    setLevel(1, levelText('levelTextLeft'))
    setLevel(2, levelText('levelTextRight'))

    // 车次数字块（arial，k(6)），高度撑满但数字在路徽下方垂直居中。
    // ll_number 左右各 16 设计单位边距 → 车次可用宽度 83 - 32 = 51 单位。
    for (const index of [1, 2] as const) {
      patches.set(`ll_number_${index}`, { margin: { l: ctx.k(16), r: ctx.k(16) } })
    }
    // 注意：u1() 只对 12/22/23 行覆写 k(-3.5)，13 行沿用 XML 的 -3.5dp。
    setNumber('tv_number_11', str(values, 'train11'))
    setNumber('tv_number_12', str(values, 'train12'), -3.5, true)
    setNumber('tv_number_13', str(values, 'train13'), undefined, true)
    setNumber('tv_number_21', str(values, 'train21'))
    setNumber('tv_number_22', str(values, 'train22'), -3.5, true)
    setNumber('tv_number_23', str(values, 'train23'), -3.5, true)

    // 附加车次区（ll_plate_ex）：仅 cb_extra 打开时显示。
    patches.set('ll_plate_ex', {
      visible: showExtra,
      margin: { t: ctx.k(-8) },
      padding: { b: ctx.k(2) },
    })
    patches.set('tv_start_ex', {
      text: normalizeText(str(values, 'extraStart'), ctx.spaceStyle),
      font: 'hyzhj',
      sizePx: ctx.k(8),
      bold: true,
      margin: { r: ctx.k(1) },
    })
    patches.set('tv_end_ex', {
      text: normalizeText(str(values, 'extraEnd'), ctx.spaceStyle),
      font: 'hyzhj',
      sizePx: ctx.k(8),
      bold: true,
      margin: { l: ctx.k(1) },
    })
    patches.set('tv_number_ex', {
      text: str(values, 'extraTrain').toUpperCase(),
      font: 'arial',
      sizePx: ctx.k(8),
    })
    patches.set('v_divider_ex', { width: ctx.k(7), height: ctx.k(1) })

    return patches
  },
}
