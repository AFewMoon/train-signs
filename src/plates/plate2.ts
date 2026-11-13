import type { LayoutNode, NodePatch, PatchMap, PlateValues } from '../core/types'
import type { SpaceStyle } from '../core/text'
import { estimateLength, normalizeText } from '../core/text'
import { COLORS } from '../data/colors'
import layoutJson from './layouts/plate2.json'
import type { FieldOption, PlateSpec } from './types'
import { bool, str } from './types'

const layout = layoutJson as unknown as LayoutNode

/** 等级文字与拼音栏背景色组合，对应 c.a.a.f.l.c() 中每一项的 e()/d()。 */
const LEVEL_OPTIONS: FieldOption[] = [
  { label: '直达（藏青 Z）', value: `直达|${COLORS.zhida1}` },
  { label: '直达（深蓝 Z）', value: `直达|${COLORS.zhida2}` },
  { label: '直达（蓝 Z）', value: `直达|${COLORS.zhida3}` },
  { label: '直达（青 Z）', value: `直达|${COLORS.zhida4}` },
  { label: '直达（墨绿 Z）', value: `直达|${COLORS.zhida5}` },
  { label: '特快（灰蓝 T）', value: `特快|${COLORS.tekuai1}` },
  { label: '特快（蓝 T）', value: `特快|${COLORS.tekuai2}` },
  { label: '特快（深绿 T）', value: `特快|${COLORS.tekuai3}` },
  { label: '特快（天蓝 T）', value: `特快|${COLORS.tekuai4}` },
  { label: '快速（红 K）', value: `快速|${COLORS.kuaisu1}` },
  { label: '快速（绿 K）', value: `快速|${COLORS.kuaisu2}` },
  { label: '旅游（红 Y）', value: `旅游|${COLORS.kuaisu1}` },
  { label: '普快（深绿）', value: `普快|${COLORS.pukuai1}` },
  { label: '普快（绿）', value: `普快|${COLORS.pukuai2}` },
  { label: '普客（青）', value: `普客|${COLORS.puke1}` },
  { label: '普客（墨绿）', value: `普客|${COLORS.puke2}` },
  { label: '普客（黑）', value: `普客|${COLORS.puke3}` },
  { label: '临客（墨绿）', value: `临客|${COLORS.linke1}` },
  { label: '临客（深青）', value: `临客|${COLORS.linke2}` },
  { label: '通勤（墨绿）', value: `通勤|${COLORS.puke2}` },
  { label: '路用（绿）', value: `路用|${COLORS.luyong1}` },
  { label: '路用（青绿）', value: `路用|${COLORS.luyong2}` },
]

/** c.a.a.f.j.a()：可选路徽。 */
const ICON_OPTIONS: FieldOption[] = Array.from({ length: 14 }, (_, index) => {
  const no = String(index + 1).padStart(2, '0')
  return { label: `路徽 ${index + 1}`, value: `icons/railway/ic_plate_${no}.png` }
})

/** 解析「等级文字|颜色」组合值。 */
function parseLevel(value: string): { text: string; color: string } {
  const [text, color] = value.split('|')
  return { text: text || '快速', color: color || COLORS.kuaisu1 }
}

/**
 * c.a.a.f.c.f()：中文站名的横向缩放。
 * 估算字数不超过阈值时保持基准比例，超出后按「基准 × 目标长度 ÷ 估算长度」压缩。
 */
function stationScale(
  text: string,
  spaceStyle: SpaceStyle,
  base: number,
  threshold: number,
  target: number,
): number {
  const measure = estimateLength(text, spaceStyle)
  return measure > threshold ? (base * target) / measure : base
}

/**
 * Android TextView 默认 includeFontPadding=true，times 字体的基线比仿 Skia 度量低约 0.172em；
 * 拼音栏（gravity=center 固定高度）里文字会整体偏高，这里按封面校准补偿（已知差异）。
 */
function timesBaseline(sizePx: number): number {
  return sizePx * 0.172
}

/** arial_bd 行高在 Android 下约为 Skia (ascent+descent) 的 1.28 倍（includeFontPadding）。 */
const NUMBER_LINE_HEIGHT_FACTOR = 1.28

/** 电子水牌之外的中文站名裁切/换行统一处理（c.a.a.f.c.w()）。 */
function normalizeStation(text: string, spaceStyle: SpaceStyle): string {
  return normalizeText(text, spaceStyle)
}

/**
 * 套跑2（Plate2Activity，5:1，设计高度 72）。
 * 左侧默认双站名、右侧默认单站名，两侧可各自切换双站名；拼音栏颜色取自列车等级。
 */
export const plate2: PlateSpec = {
  id: 'plate2',
  name: '套跑2',
  ratio: 5,
  designHeight: 72,
  cover: 'covers/bg_plate_2.png',
  layout,
  fonts: ['hycsj', 'times', 'hyzhj', 'arial'],
  fields: [
    { key: 'startCn1', label: '始发站1（中文）', kind: 'text', maxLength: 8, placeholder: '如 东胜西', group: '始发站' },
    {
      key: 'startPy1',
      label: '始发站1（拼音）',
      kind: 'text',
      maxLength: 35,
      placeholder: '如 DONGSHENGXI',
      pinyinOf: 'startCn1',
    },
    { key: 'startCn2', label: '始发站2（中文，可选）', kind: 'text', maxLength: 8, placeholder: '如 呼和浩特东' },
    {
      key: 'startPy2',
      label: '始发站2（拼音，可选）',
      kind: 'text',
      maxLength: 35,
      placeholder: '如 HUHEHAOTEDONG',
      pinyinOf: 'startCn2',
    },
    { key: 'endCn1', label: '终到站1（中文）', kind: 'text', maxLength: 8, placeholder: '如 北京西', group: '终到站' },
    {
      key: 'endPy1',
      label: '终到站1（拼音）',
      kind: 'text',
      maxLength: 30,
      placeholder: '如 BEIJINGXI',
      pinyinOf: 'endCn1',
    },
    { key: 'endCn2', label: '终到站2（中文，可选）', kind: 'text', maxLength: 8, placeholder: '如 三亚' },
    {
      key: 'endPy2',
      label: '终到站2（拼音，可选）',
      kind: 'text',
      maxLength: 35,
      placeholder: '如 SANYA',
      pinyinOf: 'endCn2',
    },
    { key: 'level', label: '列车等级与颜色', kind: 'select', options: LEVEL_OPTIONS, group: '等级与车次' },
    { key: 'number1', label: '车次 第一行', kind: 'text', maxLength: 25, placeholder: '如 K573/4  K617/8' },
    { key: 'number2', label: '车次 第二行（可选）', kind: 'text', maxLength: 25, placeholder: '如 K617/8' },
    { key: 'number3', label: '车次 第三行（可选）', kind: 'text', maxLength: 25 },
    { key: 'icon', label: '路徽', kind: 'select', options: ICON_OPTIONS, group: '其他选项' },
    { key: 'doubleLeft', label: '开启左侧双站名', kind: 'checkbox' },
    { key: 'doubleRight', label: '开启右侧双站名', kind: 'checkbox' },
    { key: 'swap', label: '交换左右站名（始发/终到互换）', kind: 'checkbox' },
    { key: 'oblate', label: '中文双站名使用扁长字体', kind: 'checkbox' },
    { key: 'alignSides', label: '拼音栏贴边', kind: 'checkbox' },
  ],
  defaults: {
    startCn1: '东胜西',
    startPy1: 'DONGSHENGXI',
    startCn2: '呼和浩特东',
    startPy2: 'HUHEHAOTEDONG',
    endCn1: '北京西',
    endPy1: 'BEI JING XI',
    endCn2: '',
    endPy2: '',
    level: `快速|${COLORS.kuaisu1}`,
    number1: 'K573/4  K617/8',
    number2: '',
    number3: '',
    icon: 'icons/railway/ic_plate_07.png',
    doubleLeft: true,
    doubleRight: false,
    swap: false,
    oblate: false,
    alignSides: true,
  },
  build(values: PlateValues, ctx): PatchMap {
    const patches: PatchMap = new Map()
    const k = ctx.k
    const spaceStyle = ctx.spaceStyle
    const swap = bool(values, 'swap')
    const leftDouble = swap ? bool(values, 'doubleRight') : bool(values, 'doubleLeft')
    const rightDouble = swap ? bool(values, 'doubleLeft') : bool(values, 'doubleRight')
    const oblate = bool(values, 'oblate')
    const alignSides = bool(values, 'alignSides')

    // 交换按钮会把左右两侧的站名与拼音整体对调（对应 Plate2Activity 的 btn_change）。
    const start1 = normalizeStation(str(values, 'startCn1'), spaceStyle)
    const start2 = normalizeStation(str(values, 'startCn2'), spaceStyle)
    const end1 = normalizeStation(str(values, 'endCn1'), spaceStyle)
    const end2 = normalizeStation(str(values, 'endCn2'), spaceStyle)
    const startPy1 = str(values, 'startPy1').toUpperCase()
    const startPy2 = str(values, 'startPy2').toUpperCase()
    const endPy1 = str(values, 'endPy1').toUpperCase()
    const endPy2 = str(values, 'endPy2').toUpperCase()

    const leftA = swap ? end1 : start1
    const leftB = swap ? end2 : start2
    const leftPyA = swap ? endPy1 : startPy1
    const leftPyB = swap ? endPy2 : startPy2
    const rightA = swap ? start1 : end1
    const rightB = swap ? start2 : end2
    const rightPyA = swap ? startPy1 : endPy1
    const rightPyB = swap ? startPy2 : endPy2

    const level = parseLevel(str(values, 'level'))
    const half = Math.floor(level.text.length / 2)
    const levelLeft = level.text.slice(0, half)
    const levelRight = level.text.slice(half)

    const number1 = str(values, 'number1').toUpperCase()
    const number2 = str(values, 'number2').toUpperCase()
    const number3 = str(values, 'number3').toUpperCase()
    // t1()：第二、第三行车次同时存在时路徽缩小为 46.27（否则 52.27）。
    const iconSize = number2 && number3 ? 46.27 : 52.27

    // 根布局：拼音栏贴边开启时左右不留内边距，关闭时左右各留 6 个单位。
    patches.set('rl_plate', {
      padding: alignSides ? { l: 0, r: 0 } : { l: k(6), r: k(6) },
    })
    patches.set('rl_icon', { width: k(96.27) })
    patches.set('iv_icon', {
      width: k(iconSize),
      height: k(iconSize),
      margin: { t: k(6.23) },
      image: str(values, 'icon') || ICON_OPTIONS[0].value,
    })

    // 两侧单/双站名的显隐（v1()）。
    patches.set('rl_left', { visible: !leftDouble })
    patches.set('rl_left_1', { visible: leftDouble })
    patches.set('rl_left_2', { visible: leftDouble })
    patches.set('rl_right', { visible: !rightDouble })
    patches.set('rl_right_1', { visible: rightDouble })
    patches.set('rl_right_2', { visible: rightDouble })

    // 单站名（32 号字，c.f(tv,str,1.0,4.0,4.2)）。
    const singleLeftScale = stationScale(leftA, spaceStyle, 1, 4, 4.2)
    const singleRightScale = stationScale(rightA, spaceStyle, 1, 4, 4.2)
    patches.set('tv_start', {
      text: leftA,
      font: 'hycsj',
      sizePx: k(32),
      scaleX: singleLeftScale,
      margin: { l: k(3), t: k(9), r: k(3), b: 0 },
    })
    patches.set('tv_end', {
      text: rightA,
      font: 'hycsj',
      sizePx: k(32),
      scaleX: singleRightScale,
      margin: { l: k(3), t: k(9), r: k(3), b: 0 },
    })

    // 双行中文站名（18 号字，扁长字体开关改变基准比例与压缩阈值）。
    const doubleBase = oblate ? 1.6 : 1.2
    const doubleThreshold = oblate ? 4.5 : 6.0
    const doubleTarget = oblate ? 4.5 : 6.2
    patches.set('tv_start_1', {
      text: leftA,
      font: 'hycsj',
      sizePx: k(18),
      scaleX: stationScale(leftA, spaceStyle, doubleBase, doubleThreshold, doubleTarget),
      margin: { l: k(3) },
    })
    patches.set('tv_start_2', {
      text: leftB,
      font: 'hycsj',
      sizePx: k(18),
      scaleX: stationScale(leftB, spaceStyle, doubleBase, doubleThreshold, doubleTarget),
      margin: { l: k(3) },
    })
    patches.set('tv_end_1', {
      text: rightA,
      font: 'hycsj',
      sizePx: k(18),
      scaleX: stationScale(rightA, spaceStyle, doubleBase, doubleThreshold, doubleTarget),
      margin: { r: k(3) },
    })
    patches.set('tv_end_2', {
      text: rightB,
      font: 'hycsj',
      sizePx: k(18),
      scaleX: stationScale(rightB, spaceStyle, doubleBase, doubleThreshold, doubleTarget),
      margin: { r: k(3) },
    })

    // 单行拼音栏（13 号字，高度 19.04，拼音栏背景取等级颜色）。
    patches.set('tv_start_en', {
      text: leftPyA,
      font: 'times',
      sizePx: k(13),
      height: k(19.04),
      padding: { l: k(2), t: 0, r: k(2), b: 0 },
      bg: level.color,
      fit: { maxScale: 1, mode: 0 },
      baselineOffset: timesBaseline(k(13)),
    })
    patches.set('tv_end_en', {
      text: rightPyA,
      font: 'times',
      sizePx: k(13),
      height: k(19.04),
      padding: { l: k(2), t: 0, r: k(2), b: 0 },
      bg: level.color,
      fit: { maxScale: 1, mode: 0 },
      baselineOffset: timesBaseline(k(13)),
    })

    // 双行拼音栏（10.5 号字，高度 12.5）。
    const doublePyPatch = (text: string): NodePatch => ({
      text,
      font: 'times',
      sizePx: k(10.5),
      height: k(12.5),
      padding: { l: k(2), t: 0, r: k(2), b: 0 },
      bg: level.color,
      fit: { maxScale: 1, mode: 0 },
      baselineOffset: timesBaseline(k(10.5)),
    })
    patches.set('tv_start_en_1', doublePyPatch(leftPyA))
    patches.set('tv_start_en_2', doublePyPatch(leftPyB))
    patches.set('tv_end_en_1', doublePyPatch(rightPyA))
    patches.set('tv_end_en_2', doublePyPatch(rightPyB))

    // 等级文字：拆成左右两半贴在路徽两侧（10 号字，XML 中横向放大 1.15）。
    patches.set('tv_level_1', {
      text: levelLeft,
      font: 'hyzhj',
      sizePx: k(10),
      margin: { l: 0, t: k(6.5), r: k(-3), b: 0 },
    })
    patches.set('tv_level_2', {
      text: levelRight,
      font: 'hyzhj',
      sizePx: k(10),
      margin: { l: k(-3), t: k(6.5), r: 0, b: 0 },
    })

    // 路徽下方车次（6 号加粗 Arial，最多三行；第二、三行有内容才显示）。
    patches.set('ll_number', { margin: { l: k(13), t: 0, r: k(13), b: 0 } })
    patches.set('tv_number_1', {
      text: number1,
      font: 'arial',
      sizePx: k(6),
      bold: true,
      lineHeightFactor: NUMBER_LINE_HEIGHT_FACTOR,
      fit: { maxScale: 1.05, mode: 1 },
    })
    patches.set('tv_number_2', {
      text: number2,
      visible: Boolean(number2),
      font: 'arial',
      sizePx: k(6),
      bold: true,
      margin: { t: k(-3.5) },
      lineHeightFactor: NUMBER_LINE_HEIGHT_FACTOR,
      fit: { maxScale: 1.05, mode: 1 },
    })
    patches.set('tv_number_3', {
      text: number3,
      visible: Boolean(number3),
      font: 'arial',
      sizePx: k(6),
      bold: true,
      margin: { t: k(-3.5) },
      lineHeightFactor: NUMBER_LINE_HEIGHT_FACTOR,
      fit: { maxScale: 1.05, mode: 1 },
    })

    // 左右两侧站名容器相对路徽的位置（u1() 中的 I(t/u, ...)）。
    patches.set('ll_left_parent', {
      margin: { l: 0, t: 0, r: k(-13), b: k(5.55) },
    })
    patches.set('ll_right_parent', {
      margin: { l: k(-13), t: 0, r: 0, b: k(5.55) },
    })

    return patches
  },
}
