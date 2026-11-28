import { estimateLength, normalizeText } from '../core/text'
import type { LayoutNode, NodePatch, PatchMap, PlateValues } from '../core/types'
import { LEVEL_PRESETS } from '../data/colors'
import layoutJson from './layouts/plate7.json'
import type { FieldOption, PlateSpec } from './types'
import { bool, str } from './types'

const layout = layoutJson as unknown as LayoutNode

/** 路徽选项：对应 APK mipmap ic_plate_01..14（PlateIconSelectActivity）。 */
const ICON_OPTIONS: FieldOption[] = Array.from({ length: 14 }, (_, index) => {
  const serial = String(index + 1).padStart(2, '0')
  return { label: `路徽 ${index + 1}`, value: `icons/railway/ic_plate_${serial}.png` }
})
const DEFAULT_ICON = 'icons/railway/ic_plate_01.png'

/** 列车等级预设（c.a.a.f.l.c()）：选项值取预设 id，展示文字与颜色由 id 推导。 */
const LEVEL_OPTIONS: FieldOption[] = LEVEL_PRESETS.map((preset) => ({
  label: preset.label,
  value: preset.id,
}))

/** 与 Java 中 getString(gVar.getItem(i).b()) 一致：预设同时决定等级文字与颜色。 */
function resolveLevel(values: PlateValues, fallbackId: string): { text: string; color: string } {
  const id = str(values, 'level') || fallbackId
  const preset = LEVEL_PRESETS.find((item) => item.id === id) ?? LEVEL_PRESETS[0]
  const custom = str(values, 'levelText').trim()
  return { text: custom || preset.text, color: preset.color }
}

/**
 * c.a.a.f.c.f()：中文站名按「估算显示长度」压缩 textScaleX。
 * 本页 f(..., 0.88, 4.2, c0 ? 4.3 : 4.2)，「拼音栏贴边」勾选时目标宽度略大。
 */
function stationScaleX(text: string, spaceStyle: 0 | 1 | 2, flush: boolean): number {
  const threshold = 4.2
  const target = flush ? 4.3 : 4.2
  const length = estimateLength(text, spaceStyle)
  if (length <= threshold) return 0.88
  return (0.88 * target) / length
}

/** 中文站名：与 Java c.f() 一致，做全角括号/空格规范化。 */
function stationPatch(
  text: string,
  spaceStyle: 0 | 1 | 2,
  flush: boolean,
  sizePx: number,
  marginTop: number,
  baselineOffset: number,
): NodePatch {
  const normalized = normalizeText(text, spaceStyle)
  return {
    text: normalized,
    sizePx,
    scaleX: stationScaleX(normalized, spaceStyle, flush),
    font: 'fzxbs',
    margin: { t: marginTop },
    baselineOffset,
  }
}

/** Plate7Activity：套跑7（5:1，设计高度 72）。三站名（始发/终到·始发/终到）+ 两组车次。 */
export const plate7: PlateSpec = {
  id: 'plate7',
  name: '套跑7',
  ratio: 5,
  designHeight: 72,
  cover: 'covers/bg_plate_7.png',
  layout,
  fonts: ['fzxbs', 'times', 'hyzhj', 'arial'],
  fields: [
    { key: 'start', group: '站名', label: '始发站（中文）', kind: 'text', maxLength: 7, placeholder: '如 杭州' },
    { key: 'startEn', group: '站名', label: '始发站（拼音）', kind: 'text', maxLength: 23, pinyinOf: 'start', placeholder: '如 HANG ZHOU' },
    { key: 'middle', group: '站名', label: '终到/始发站（中文）', kind: 'text', maxLength: 7, placeholder: '如 阿克苏' },
    { key: 'middleEn', group: '站名', label: '终到/始发站（拼音）', kind: 'text', maxLength: 23, pinyinOf: 'middle', placeholder: '如 A KE SU' },
    { key: 'end', group: '站名', label: '终到站（中文）', kind: 'text', maxLength: 7, placeholder: '如 乌鲁木齐' },
    { key: 'endEn', group: '站名', label: '终到站（拼音）', kind: 'text', maxLength: 23, pinyinOf: 'end', placeholder: '如 WU LU MU QI' },
    { key: 'number11', group: '车次 1（左）', label: '车次1 第一行', kind: 'train', maxLength: 7, placeholder: '如 K594/5' },
    { key: 'number12', group: '车次 1（左）', label: '车次1 第二行（可选）', kind: 'train', maxLength: 7, placeholder: '如 K596/3' },
    { key: 'number13', group: '车次 1（左）', label: '车次1 第三行（可选）', kind: 'train', maxLength: 7 },
    { key: 'number21', group: '车次 2（右）', label: '车次2 第一行', kind: 'train', maxLength: 7, placeholder: '如 K9778/5' },
    { key: 'number22', group: '车次 2（右）', label: '车次2 第二行（可选）', kind: 'train', maxLength: 7, placeholder: '如 K9776/7' },
    { key: 'number23', group: '车次 2（右）', label: '车次2 第三行（可选）', kind: 'train', maxLength: 7 },
    { key: 'level', group: '等级与外观', label: '列车等级（文字与颜色）', kind: 'select', options: LEVEL_OPTIONS },
    {
      key: 'levelText',
      group: '等级与外观',
      label: '自定义等级文字（留空使用预设）',
      kind: 'text',
      maxLength: 4,
      placeholder: '如 快速',
      hint: '自定义文字会替换预设等级文字，颜色仍取上面的预设',
    },
    { key: 'icon', group: '等级与外观', label: '路徽', kind: 'select', options: ICON_OPTIONS },
    { key: 'alignSides', group: '等级与外观', label: '拼音栏贴边', kind: 'checkbox' },
  ],
  defaults: {
    start: '杭 州',
    startEn: 'HANG ZHOU',
    middle: '阿克苏',
    middleEn: 'A KE SU',
    end: '乌鲁木齐',
    endEn: 'WU LU MU QI',
    number11: 'K594/5',
    number12: 'K596/3',
    number13: '',
    number21: 'K9778/5',
    number22: 'K9776/7',
    number23: '',
    level: 'kuaisu1',
    levelText: '',
    icon: DEFAULT_ICON,
    alignSides: true,
  },
  build(values: PlateValues, ctx): PatchMap {
    const patches: PatchMap = new Map()
    const flush = bool(values, 'alignSides')
    const level = resolveLevel(values, 'kuaisu1')

    // K((m()-k(20))/5.0, 72) 由 PlateSpec 的 ratio/designHeight 表达。
    // cb_align_sides：勾选时 rl_plate 左右 padding 归零，否则 k(3)（Java j.a()）。
    patches.set('rl_plate', {
      padding: { l: flush ? 0 : ctx.k(3), r: flush ? 0 : ctx.k(3) },
    })

    // 顶部路徽区：Y(r,75)、N(s,19.8,19.8)、X(s,4.5)
    // rl_icon 在 XML 里是 wrap_content；引擎对 ImageView 的固有高度按 0 处理，这里显式按
    // Android 的测量结果补上高度 = 图标高 19.8 + 上边距 4.5（否则图标会被父容器裁切）。
    patches.set('rl_icon', { width: ctx.k(75), height: ctx.k(4.5) + ctx.k(19.8) })
    patches.set('iv_icon', {
      image: str(values, 'icon') || DEFAULT_ICON,
      width: ctx.k(19.8),
      height: ctx.k(19.8),
      margin: { t: ctx.k(4.5) },
    })
    // 等级文字（hyzhj + fakeBold）：I(A,0,6.75,2.25,0) / I(B,2.25,6.75,0,0)
    const half = Math.floor(level.text.length / 2)
    patches.set('tv_level_1', {
      text: level.text.slice(0, half),
      sizePx: ctx.k(8.25),
      font: 'hyzhj',
      bold: true,
      margin: { l: 0, t: ctx.k(6.75), r: ctx.k(2.25), b: 0 },
    })
    patches.set('tv_level_2', {
      text: level.text.slice(half),
      sizePx: ctx.k(8.25),
      font: 'hyzhj',
      bold: true,
      margin: { l: ctx.k(2.25), t: ctx.k(6.75), r: 0, b: 0 },
    })

    // 站名区：u(t,8.1)（ll_parent marginBottom）
    patches.set('ll_parent', { margin: { b: ctx.k(8.1) } })

    // 中文站名：V(...,25.9) + X(...,-1.5)，字体 fzxbs
    // 25.9dp 行盒高于「路徽底部→拼音栏顶部」的可用高度，原样绘制会被列容器裁掉字形顶部；
    // 按封面把基线整体下移 4 个单位，字形仍完整落在路徽下方、拼音栏上方。
    const stations: Array<[string, string]> = [
      ['tv_start', 'start'],
      ['tv_middle', 'middle'],
      ['tv_end', 'end'],
    ]
    for (const [id, key] of stations) {
      patches.set(
        id,
        stationPatch(str(values, key), ctx.spaceStyle, flush, ctx.k(25.9), ctx.k(-1.5), ctx.k(4)),
      )
    }

    // 拼音栏：G(...,14.05) + V(...,10.85)，字体 times；h(...,0,1.0) → fit mode 0 / maxScale 1
    const pinyin: Array<[string, string]> = [
      ['tv_start_en', 'startEn'],
      ['tv_middle_en', 'middleEn'],
      ['tv_end_en', 'endEn'],
    ]
    for (const [id, key] of pinyin) {
      patches.set(id, {
        text: str(values, key).toUpperCase(),
        sizePx: ctx.k(10.85),
        height: ctx.k(14.05),
        font: 'times',
        bg: level.color,
        padding: { l: ctx.k(1.5), r: ctx.k(1.5) },
        fit: { maxScale: 1, mode: 0 },
        // canvas 字体的 descent 预留比 Times 大写字母实际下沿大，居中时字母偏高；
        // 用 0.15em 的基线偏移校准，使拼音在色条中与封面一样垂直居中。
        baselineOffset: ctx.k(10.85) * 0.15,
      })
    }

    // 车次栏：Y(C/E,70.3) + I(C/E,-23,0,-23,12.05)
    patches.set('ll_number_1', {
      width: ctx.k(70.3),
      margin: { l: ctx.k(-23), t: 0, r: ctx.k(-23), b: ctx.k(12.05) },
    })
    patches.set('ll_number_2', {
      width: ctx.k(70.3),
      margin: { l: ctx.k(-23), t: 0, r: ctx.k(-23), b: ctx.k(12.05) },
    })

    // 车次行：V(...,7.75)，字体 arial_bd；h(...,1,0.9) → fit mode 1 / maxScale 0.9。
    // 第一行始终可见；第二、三行空则隐藏（c.e()，对应 Java 文本监听）。
    // lineHeightFactor：Android includeFontPadding 行盒更高，取 1.3 让「-4.2 单位」的
    // 行间距与封面一致（封面两行车次 ink 间距约 27px）。
    const NUMBER_LINE_HEIGHT = 1.3
    const numbers: Array<[string, string, number | null]> = [
      ['tv_number_11', 'number11', null],
      ['tv_number_12', 'number12', ctx.k(-4.2)],
      ['tv_number_13', 'number13', ctx.k(-4.2)],
      ['tv_number_21', 'number21', null],
      ['tv_number_22', 'number22', ctx.k(-4.2)],
      ['tv_number_23', 'number23', ctx.k(-4.2)],
    ]
    for (const [id, key, marginTop] of numbers) {
      const text = str(values, key).toUpperCase()
      const optional = key !== 'number11' && key !== 'number21'
      patches.set(id, {
        text,
        sizePx: ctx.k(7.75),
        font: 'arial',
        fit: { maxScale: 0.9, mode: 1 },
        lineHeightFactor: NUMBER_LINE_HEIGHT,
        ...(optional ? { visible: text.length > 0 } : {}),
        ...(marginTop === null ? {} : { margin: { t: marginTop } }),
      })
    }

    return patches
  },
}
