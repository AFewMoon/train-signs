import { estimateLength, normalizeText } from '../core/text'
import type { LayoutNode, NodePatch, PatchMap, PlateValues } from '../core/types'
import { LEVEL_PRESETS } from '../data/colors'
import layoutJson from './layouts/plate1.json'
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
function resolveLevel(values: PlateValues): { text: string; color: string } {
  const id = str(values, 'level') || 'zhida3'
  const preset = LEVEL_PRESETS.find((item) => item.id === id) ?? LEVEL_PRESETS[0]
  const custom = str(values, 'levelText').trim()
  return { text: custom || preset.text, color: preset.color }
}

/**
 * c.a.a.f.c.f()：中文站名按「估算显示长度」压缩 textScaleX（不是按 TextView 宽度）。
 * f() 中 maxScale=0.9、阈值与目标在 l1() 里随「拼音栏贴边」切换。
 */
function stationScaleX(text: string, spaceStyle: 0 | 1 | 2, flush: boolean): number {
  const threshold = flush ? 2.6 : 2.5
  const target = flush ? 2.3 : 2.2
  const length = estimateLength(text, spaceStyle)
  if (length <= threshold) return 0.9
  return (0.9 * target) / length
}

/** 中文站名：与 Java c.e()/f() 一致，做全角括号/空格规范化。 */
function stationPatch(text: string, spaceStyle: 0 | 1 | 2, flush: boolean, sizePx: number): NodePatch {
  const normalized = normalizeText(text, spaceStyle)
  return {
    text: normalized,
    sizePx,
    scaleX: stationScaleX(normalized, spaceStyle, flush),
    font: 'hycsj',
  }
}

/** Plate1Activity：套跑1（5.5:1，设计高度 66.13）。左右各一组「始发—终到」双站名。 */
export const plate1: PlateSpec = {
  id: 'plate1',
  name: '套跑1',
  ratio: 5.5,
  designHeight: 66.13,
  cover: 'covers/bg_plate_1.png',
  layout,
  fonts: ['hycsj', 'times', 'hyzhj', 'arial'],
  fields: [
    { key: 'start1', group: '站名 1（左侧）', label: '始发站1（中文）', kind: 'text', maxLength: 6, placeholder: '如 成都' },
    { key: 'startEn1', group: '站名 1（左侧）', label: '始发站1（拼音）', kind: 'text', maxLength: 17, pinyinOf: 'start1', placeholder: '如 CHENGDU' },
    { key: 'end1', group: '站名 1（左侧）', label: '终到站1（中文）', kind: 'text', maxLength: 6, placeholder: '如 北京西' },
    { key: 'endEn1', group: '站名 1（左侧）', label: '终到站1（拼音）', kind: 'text', maxLength: 17, pinyinOf: 'end1', placeholder: '如 BEIJINGXI' },
    { key: 'start2', group: '站名 2（右侧）', label: '始发站2（中文）', kind: 'text', maxLength: 6, placeholder: '如 成都' },
    { key: 'startEn2', group: '站名 2（右侧）', label: '始发站2（拼音）', kind: 'text', maxLength: 17, pinyinOf: 'start2', placeholder: '如 CHENGDU' },
    { key: 'end2', group: '站名 2（右侧）', label: '终到站2（中文）', kind: 'text', maxLength: 6, placeholder: '如 广州' },
    { key: 'endEn2', group: '站名 2（右侧）', label: '终到站2（拼音）', kind: 'text', maxLength: 17, pinyinOf: 'end2', placeholder: '如 GUANGZHOU' },
    { key: 'number11', group: '车次 1（左侧）', label: '车次1 第一行', kind: 'text', maxLength: 6, placeholder: '如 Z50/49' },
    { key: 'number12', group: '车次 1（左侧）', label: '车次1 第二行（可选）', kind: 'text', maxLength: 6, placeholder: '如 Z50/49' },
    { key: 'number13', group: '车次 1（左侧）', label: '车次1 第三行（可选）', kind: 'text', maxLength: 6 },
    { key: 'number21', group: '车次 2（右侧）', label: '车次2 第一行', kind: 'text', maxLength: 6, placeholder: '如 Z124/1' },
    { key: 'number22', group: '车次 2（右侧）', label: '车次2 第二行（可选）', kind: 'text', maxLength: 6, placeholder: '如 Z122/3' },
    { key: 'number23', group: '车次 2（右侧）', label: '车次2 第三行（可选）', kind: 'text', maxLength: 6 },
    { key: 'level', group: '等级与外观', label: '列车等级（文字与颜色）', kind: 'select', options: LEVEL_OPTIONS },
    {
      key: 'levelText',
      group: '等级与外观',
      label: '自定义等级文字（留空使用预设）',
      kind: 'text',
      maxLength: 4,
      placeholder: '如 直达',
      hint: '自定义文字会替换预设等级文字，颜色仍取上面的预设',
    },
    { key: 'icon', group: '等级与外观', label: '路徽', kind: 'select', options: ICON_OPTIONS },
    { key: 'alignSides', group: '等级与外观', label: '拼音栏贴边', kind: 'checkbox' },
  ],
  defaults: {
    // 封面示例中两字站名带空格（App 的拼音输入框去掉空格后注音），三字站名不带。
    start1: '成 都',
    startEn1: 'CHENGDU',
    end1: '北京西',
    endEn1: 'BEIJINGXI',
    start2: '成 都',
    startEn2: 'CHENGDU',
    end2: '广 州',
    endEn2: 'GUANGZHOU',
    number11: 'Z50/49',
    number12: '',
    number13: '',
    number21: 'Z124/1',
    number22: 'Z122/3',
    number23: '',
    level: 'zhida3',
    levelText: '',
    icon: DEFAULT_ICON,
    alignSides: false,
  },
  build(values: PlateValues, ctx): PatchMap {
    const patches: PatchMap = new Map()
    const flush = bool(values, 'alignSides')
    const level = resolveLevel(values)

    // K((m()-k(20))/5.5, 66.13) 由 PlateSpec 的 ratio/designHeight 表达。
    // 路徽：N(r,46.93,46.93) + X(r,6.23)
    patches.set('iv_icon', {
      image: str(values, 'icon') || DEFAULT_ICON,
      width: ctx.k(46.93),
      height: ctx.k(46.93),
      margin: { t: ctx.k(6.23) },
    })

    // 左右站名行：I(s,4,11,9,0) / I(t,9,11,4,0)，贴边时外侧 4 → 0
    patches.set('ll_left', {
      margin: { l: flush ? 0 : ctx.k(4), t: ctx.k(11), r: ctx.k(9), b: 0 },
    })
    patches.set('ll_right', {
      margin: { l: ctx.k(9), t: ctx.k(11), r: flush ? 0 : ctx.k(4), b: 0 },
    })
    // 站名之间的红色横杠：N(u,14,4) + I(u,5,0,5,0)
    patches.set('v_left', {
      width: ctx.k(14),
      height: ctx.k(4),
      margin: { l: ctx.k(5), t: 0, r: ctx.k(5), b: 0 },
    })
    patches.set('v_right', {
      width: ctx.k(14),
      height: ctx.k(4),
      margin: { l: ctx.k(5), t: 0, r: ctx.k(5), b: 0 },
    })
    // 拼音栏：G(w,16.29) + I(w,4,0,9,6.4) / G(x,16.29) + I(x,9,0,4,6.4)
    patches.set('ll_left_en', {
      height: ctx.k(16.29),
      margin: { l: flush ? 0 : ctx.k(4), t: 0, r: ctx.k(9), b: ctx.k(6.4) },
    })
    patches.set('ll_right_en', {
      height: ctx.k(16.29),
      margin: { l: ctx.k(9), t: 0, r: flush ? 0 : ctx.k(4), b: ctx.k(6.4) },
    })
    // 车次栏宽度：Y(y,25) / Y(z,25)
    patches.set('ll_number_left', { width: ctx.k(25) })
    patches.set('ll_number_right', { width: ctx.k(25) })

    // 中文站名：V(...,27)，字体 hycsj（华文行楷），压缩规则见 c.a.a.f.c.f()
    const stations: Array<[string, string]> = [
      ['tv_start_1', 'start1'],
      ['tv_end_1', 'end1'],
      ['tv_start_2', 'start2'],
      ['tv_end_2', 'end2'],
    ]
    for (const [id, key] of stations) {
      patches.set(id, stationPatch(str(values, key), ctx.spaceStyle, flush, ctx.k(27)))
    }

    // 拼音栏：V(...,9.5)，字体 times；h(...,0,1.0) → fit mode 0 / maxScale 1
    const pinyin: Array<[string, string]> = [
      ['tv_start_en_1', 'startEn1'],
      ['tv_end_en_1', 'endEn1'],
      ['tv_start_en_2', 'startEn2'],
      ['tv_end_en_2', 'endEn2'],
    ]
    for (const [id, key] of pinyin) {
      patches.set(id, {
        text: str(values, key).toUpperCase(),
        sizePx: ctx.k(9.5),
        font: 'times',
        bg: level.color,
        padding: { l: ctx.k(1.5), r: ctx.k(1.5) },
        fit: { maxScale: 1, mode: 0 },
        // canvas 字体的 descent 预留比 Times 大写字母实际下沿大，居中时字母偏高；
        // 用 0.15em 的基线偏移校准，使拼音在色条中与封面一样垂直居中。
        baselineOffset: ctx.k(9.5) * 0.15,
      })
    }

    // 等级文字：J/K 各取等级文字的一半（hyzhj），颜色不随预设变化，保持黑色。
    const half = Math.floor(level.text.length / 2)
    patches.set('tv_level_1', {
      text: level.text.slice(0, half),
      sizePx: ctx.k(9),
      font: 'hyzhj',
      margin: { l: 0, t: ctx.k(7.5), r: ctx.k(-3.5), b: 0 },
    })
    patches.set('tv_level_2', {
      text: level.text.slice(half),
      sizePx: ctx.k(9),
      font: 'hyzhj',
      margin: { l: ctx.k(-3.5), t: ctx.k(7.5), r: 0, b: 0 },
    })

    // 车次行：V(...,5)，字体 arial_bd；h(...,1,1.05) → fit mode 1 / maxScale 1.05。
    // 第一行始终可见（空文本也占行高，与 App 的 c.h() 一致）；第二、三行空则隐藏（c.e()）。
    // lineHeightFactor：Android includeFontPadding 的行盒比 canvas 的 ascent+descent 高，
    // 取 1.3 让「-2.5 单位」的行间距与封面一致（封面两行车次 ink 间距约 18px）。
    const NUMBER_LINE_HEIGHT = 1.3
    const numbers: Array<[string, string, number | null]> = [
      ['tv_number_11', 'number11', null],
      ['tv_number_12', 'number12', ctx.k(-2.5)],
      ['tv_number_13', 'number13', ctx.k(-2.5)],
      ['tv_number_21', 'number21', null],
      ['tv_number_22', 'number22', ctx.k(-2.5)],
      ['tv_number_23', 'number23', ctx.k(-2.5)],
    ]
    for (const [id, key, marginTop] of numbers) {
      const text = str(values, key).toUpperCase()
      const optional = key !== 'number11' && key !== 'number21'
      patches.set(id, {
        text,
        sizePx: ctx.k(5),
        font: 'arial',
        fit: { maxScale: 1.05, mode: 1 },
        lineHeightFactor: NUMBER_LINE_HEIGHT,
        ...(optional ? { visible: text.length > 0 } : {}),
        ...(marginTop === null ? {} : { margin: { t: marginTop } }),
      })
    }

    return patches
  },
}
