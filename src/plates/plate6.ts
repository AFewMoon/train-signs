import type { LayoutNode, PatchMap, PlateValues } from '../core/types'
import type { SpaceStyle } from '../core/text'
import { estimateLength, normalizeText } from '../core/text'
import { LEVEL_PRESETS } from '../data/colors'
import layoutJson from './layouts/plate6.json'
import type { FieldOption, PlateSpec } from './types'
import { bool, str } from './types'

const layout = layoutJson as unknown as LayoutNode

/** Plate6Activity.B1()：K((屏宽 - k(20)) / 5.1f, 70f) → 比例 5.1、设计高度 70。 */
const RATIO = 5.1
const DESIGN_HEIGHT = 70
/** Plate6Activity.x 监听：未贴边时根容器左右 padding 为 k(3)。 */
const ROOT_PADDING = 3
/** 中文站名：f(text, 0.8, 2.6, 贴边 ? 2.7 : 2.6)。 */
const NAME_MAX_SCALE = 0.8
const NAME_THRESHOLD = 2.6
/** 车次行：Android TextView 行盒含 includeFontPadding，约为字号的 1.3 倍。 */
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

/** 与 Java 一致：sp_level_1 预设决定全局颜色与默认等级文字，sp_level_2/3 只覆盖文字。 */
function resolveLevel(values: PlateValues): { text: string; color: string } {
  const id = str(values, 'level') || 'kuaisu1'
  const preset = LEVEL_PRESETS.find((item) => item.id === id) ?? LEVEL_PRESETS[0]
  return { text: preset.text, color: preset.color }
}

/** App 的 substring(0, len/2) / substring(len/2) 拆分等级文字。 */
function splitLevel(text: string): [string, string] {
  const half = Math.floor(text.length / 2)
  return [text.slice(0, half), text.slice(half)]
}

/** 对应 c.a.a.f.c.f()：中文站名按估算字宽压缩。 */
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

/** 套跑6（Plate6Activity）：4 站 3 路徽 3 组车次，等级/颜色全局统一。 */
export const plate6: PlateSpec = {
  id: 'plate6',
  name: '套跑6',
  ratio: RATIO,
  designHeight: DESIGN_HEIGHT,
  cover: 'covers/bg_plate_6.png',
  layout,
  fonts: ['hycsj', 'times', 'hyzhj', 'arial'],
  fields: [
    // 必填校验顺序与 Plate6Activity.h() 一致：4 个中文站名 → 4 个拼音 → 3 组首行车次。
    // 中文站名（B(et_start..et_end, 5)），拼音 XML maxLength 20。
    { key: 'start', label: '始发站（中文）', kind: 'text', maxLength: 5, placeholder: '如 沈阳', required: true, group: '站名（中文）' },
    { key: 'middleLeft', label: '终到/始发站1（中文）', kind: 'text', maxLength: 5, placeholder: '如 抚顺北', required: true, group: '站名（中文）' },
    { key: 'middleRight', label: '终到/始发站2（中文）', kind: 'text', maxLength: 5, placeholder: '如 北京', required: true, group: '站名（中文）' },
    { key: 'end', label: '终到站（中文）', kind: 'text', maxLength: 5, placeholder: '如 辽源', required: true, group: '站名（中文）' },
    { key: 'startEn', label: '始发站（拼音）', kind: 'text', maxLength: 20, placeholder: '如 SHEN YANG', pinyinOf: 'start', required: true, group: '拼音' },
    { key: 'middleLeftEn', label: '终到/始发站1（拼音）', kind: 'text', maxLength: 20, placeholder: '如 FU SHUN BEI', pinyinOf: 'middleLeft', required: true, group: '拼音' },
    { key: 'middleRightEn', label: '终到/始发站2（拼音）', kind: 'text', maxLength: 20, placeholder: '如 BEI JING', pinyinOf: 'middleRight', required: true, group: '拼音' },
    { key: 'endEn', label: '终到站（拼音）', kind: 'text', maxLength: 20, placeholder: '如 LIAO YUAN', pinyinOf: 'end', required: true, group: '拼音' },
    // 等级：sp_level_1 全局底色 + 左侧等级，sp_level_2/3 只覆盖中间/右侧等级文字。
    { key: 'level', label: '列车等级与颜色', kind: 'select', options: LEVEL_OPTIONS, group: '列车等级与外观' },
    { key: 'levelTextLeft', label: '自定义左侧等级文字（留空使用预设）', kind: 'text', maxLength: 4, placeholder: '如 快速', group: '列车等级与外观' },
    { key: 'levelTextMiddle', label: '自定义中间等级文字（留空使用预设）', kind: 'text', maxLength: 4, placeholder: '如 快速', group: '列车等级与外观' },
    { key: 'levelTextRight', label: '自定义右侧等级文字（留空使用预设）', kind: 'text', maxLength: 4, placeholder: '如 普快', group: '列车等级与外观' },
    { key: 'icon', label: '路徽', kind: 'select', options: ICON_OPTIONS, group: '列车等级与外观' },
    { key: 'alignSides', label: '拼音栏贴边', kind: 'checkbox', group: '列车等级与外观' },
    // 车次：3 组 × 3 行，XML maxLength 10。
    { key: 'train11', label: '车次1 第一行', kind: 'text', maxLength: 10, placeholder: '如 K7325/6', required: true, group: '车次信息' },
    { key: 'train12', label: '车次1 第二行（可选）', kind: 'text', maxLength: 10, group: '车次信息' },
    { key: 'train13', label: '车次1 第三行（可选）', kind: 'text', maxLength: 10, group: '车次信息' },
    { key: 'train21', label: '车次2 第一行', kind: 'text', maxLength: 10, placeholder: '如 K96/5', required: true, group: '车次信息' },
    { key: 'train22', label: '车次2 第二行（可选）', kind: 'text', maxLength: 10, group: '车次信息' },
    { key: 'train23', label: '车次2 第三行（可选）', kind: 'text', maxLength: 10, group: '车次信息' },
    { key: 'train31', label: '车次3 第一行', kind: 'text', maxLength: 10, placeholder: '如 2589/92', required: true, group: '车次信息' },
    { key: 'train32', label: '车次3 第二行（可选）', kind: 'text', maxLength: 10, placeholder: '如 2691/90', group: '车次信息' },
    { key: 'train33', label: '车次3 第三行（可选）', kind: 'text', maxLength: 10, group: '车次信息' },
  ],
  defaults: {
    start: '沈阳',
    middleLeft: '抚顺北',
    middleRight: '北京',
    end: '辽源',
    startEn: 'SHEN YANG',
    middleLeftEn: 'FU SHUN BEI',
    middleRightEn: 'BEI JING',
    endEn: 'LIAO YUAN',
    level: 'kuaisu1',
    levelTextLeft: '',
    levelTextMiddle: '',
    levelTextRight: '普快',
    icon: DEFAULT_ICON,
    alignSides: true,
    train11: 'K7325/6',
    train12: '',
    train13: '',
    train21: 'K96/5',
    train22: '',
    train23: '',
    train31: '2589/92',
    train32: '2691/90',
    train33: '',
  },
  build(values: PlateValues, ctx): PatchMap {
    const level = resolveLevel(values)
    /** 预设等级文字；对应列的自定义文字非空时覆盖。 */
    const levelText = (key: string): string => str(values, key).trim() || level.text
    const color = level.color
    const icon = str(values, 'icon') || DEFAULT_ICON
    const alignSides = bool(values, 'alignSides')
    /** 贴边（cb_align_sides 默认勾选）时可用字宽 2.7，否则 2.6。 */
    const nameWidth = alignSides ? 2.7 : 2.6
    const patches: PatchMap = new Map()

    // 根容器：贴边时 padding 0，否则左右各 k(3)。
    patches.set('ll_plate', {
      padding: alignSides ? { l: 0, r: 0 } : { l: ctx.k(ROOT_PADDING), r: ctx.k(ROOT_PADDING) },
    })

    // 4 个站点列：rl_left / rl_middle_left / rl_middle_right / rl_right 的 1.48 分隔边距。
    patches.set('rl_left', { margin: { r: ctx.k(1.48) } })
    patches.set('rl_middle_left', { margin: { l: ctx.k(1.48), r: ctx.k(1.48) } })
    patches.set('rl_middle_right', { margin: { l: ctx.k(1.48), r: ctx.k(1.48) } })
    patches.set('rl_right', { margin: { l: ctx.k(1.48) } })

    // 4 站中文名（hycsj，k(28.3)）：f(..., 0.8, 2.6, 2.6/2.7)。
    const setStation = (id: string, raw: string): void => {
      patches.set(id, {
        text: normalizeText(raw, ctx.spaceStyle),
        font: 'hycsj',
        sizePx: ctx.k(28.3),
        scaleX: nameScale(raw, ctx.spaceStyle, NAME_MAX_SCALE, NAME_THRESHOLD, nameWidth),
        margin: { t: ctx.k(10.38) },
      })
    }
    setStation('tv_start', str(values, 'start'))
    setStation('tv_middle_left', str(values, 'middleLeft'))
    setStation('tv_middle_right', str(values, 'middleRight'))
    setStation('tv_end', str(values, 'end'))

    // 拼音栏（times，k(11.08)）：g(..., 0) → h(mode 0, maxScale 1.0)。
    const setPinyin = (id: string, raw: string): void => {
      patches.set(id, {
        text: raw.toUpperCase(),
        font: 'times',
        sizePx: ctx.k(11.08),
        height: ctx.k(18.68),
        margin: { b: ctx.k(5) },
        padding: { l: ctx.k(2), r: ctx.k(2) },
        bg: color,
        fit: { maxScale: 1, mode: 0 },
      })
    }
    setPinyin('tv_start_en', str(values, 'startEn'))
    setPinyin('tv_middle_left_en', str(values, 'middleLeftEn'))
    setPinyin('tv_middle_right_en', str(values, 'middleRightEn'))
    setPinyin('tv_end_en', str(values, 'endEn'))

    // 3 个路徽位（宽度 k(70)，左右各 -20 设计单位；路徽 k(31.44)）。
    for (const index of [1, 2, 3] as const) {
      patches.set(`rl_icon_${index}`, {
        width: ctx.k(70),
        margin: { l: ctx.k(-20), r: ctx.k(-20) },
      })
      patches.set(`iv_icon_${index}`, {
        width: ctx.k(31.44),
        height: ctx.k(31.44),
        margin: { t: ctx.k(9.72) },
        image: icon,
      })
    }

    // 等级文字（hyzhj，k(8.31)）：按 App 拆左右两半，textScaleX 保持 XML 的 1.15。
    const setLevel = (index: 1 | 2 | 3, raw: string): void => {
      const [left, right] = splitLevel(raw)
      patches.set(`tv_level_${index}1`, {
        text: left,
        font: 'hyzhj',
        sizePx: ctx.k(8.31),
        margin: { t: ctx.k(3), r: ctx.k(-2.37) },
      })
      patches.set(`tv_level_${index}2`, {
        text: right,
        font: 'hyzhj',
        sizePx: ctx.k(8.31),
        margin: { l: ctx.k(-2.37), t: ctx.k(3) },
      })
    }
    setLevel(1, levelText('levelTextLeft'))
    setLevel(2, levelText('levelTextMiddle'))
    setLevel(3, levelText('levelTextRight'))

    // 车次数字块（arial，k(6.52)）：高 k(28.68)、宽为路徽宽 + 左右 -1 边距（= 33.44 单位）。
    for (const index of [1, 2, 3] as const) {
      patches.set(`ll_number_${index}`, {
        width: ctx.k(33.44),
        height: ctx.k(28.68),
        margin: { l: ctx.k(-1), r: ctx.k(-1) },
      })
    }

    // 车次行：h()/g() 用 mode 1、最大 scaleX 1.0；第 2/3 行空内容时隐藏。
    const setNumber = (id: string, raw: string, top?: number, hideWhenEmpty = false): void => {
      const text = raw.toUpperCase()
      patches.set(id, {
        text,
        font: 'arial',
        sizePx: ctx.k(6.52),
        fit: { maxScale: 1, mode: 1 },
        lineHeightFactor: NUMBER_LINE_HEIGHT,
        visible: hideWhenEmpty ? text.length > 0 : true,
        ...(top === undefined ? {} : { margin: { t: ctx.k(top) } }),
      })
    }
    setNumber('tv_number_11', str(values, 'train11'))
    setNumber('tv_number_12', str(values, 'train12'), -3.5, true)
    setNumber('tv_number_13', str(values, 'train13'), -3.5, true)
    setNumber('tv_number_21', str(values, 'train21'))
    setNumber('tv_number_22', str(values, 'train22'), -3.5, true)
    setNumber('tv_number_23', str(values, 'train23'), -3.5, true)
    setNumber('tv_number_31', str(values, 'train31'))
    setNumber('tv_number_32', str(values, 'train32'), -3.5, true)
    setNumber('tv_number_33', str(values, 'train33'), -3.5, true)

    return patches
  },
}
