import type { LayoutNode, PatchMap, PlateValues } from '../core/types'
import { COLORS, ELEC_LINE_COLORS } from '../data/colors'
import layoutJson from './layouts/plate9.json'
import type { PlateSpec } from './types'
import { str } from './types'

const layout = layoutJson as unknown as LayoutNode

/** 电子水牌2（Plate9Activity）：3.7333:1，双行文字。 */
export const plate9: PlateSpec = {
  id: 'plate9',
  name: '电子水牌2',
  ratio: 3.7333,
  designHeight: 106,
  cover: 'covers/bg_plate_9.png',
  layout,
  fonts: ['fzxs18', 'fzxs15'],
  fields: [
    { key: 'carNumber', label: '车厢号', kind: 'text', maxLength: 2, placeholder: '如 8', required: true },
    { key: 'line1', label: '第一行显示内容', kind: 'text', maxLength: 15, placeholder: '如 D6385', required: true },
    { key: 'line2', label: '第二行显示内容', kind: 'text', maxLength: 15, placeholder: '如 上海南-义乌', required: true },
    {
      key: 'color',
      label: '文字颜色',
      kind: 'select',
      options: ELEC_LINE_COLORS,
    },
  ],
  defaults: {
    carNumber: '8',
    line1: 'D6385',
    line2: '上海南-义乌',
    color: COLORS.elecLine1,
  },
  build(values: PlateValues, ctx): PatchMap {
    const car = str(values, 'carNumber')
    const line1 = str(values, 'line1').toUpperCase()
    const line2 = str(values, 'line2').toUpperCase()
    const color = str(values, 'color') || COLORS.elecLine1
    const patches: PatchMap = new Map()
    patches.set('ll_car_number', { width: ctx.k(105) })
    patches.set('tv_car_number', {
      text: car,
      sizePx: ctx.k(55),
      color,
      font: 'fzxs18',
    })
    patches.set('tv_line_1', {
      text: line1,
      sizePx: ctx.k(39),
      margin: { t: ctx.k(13) },
      color,
      font: 'fzxs15',
      gravity: 'center_horizontal',
    })
    patches.set('tv_line_2', {
      text: line2,
      sizePx: ctx.k(39),
      margin: { t: ctx.k(3) },
      color,
      font: 'fzxs15',
      gravity: 'center_horizontal',
    })
    return patches
  },
}
