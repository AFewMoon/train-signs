import type { LayoutNode, PatchMap, PlateValues } from '../core/types'
import { COLORS, ELEC_STATION_COLORS } from '../data/colors'
import layoutJson from './layouts/plate8.json'
import type { PlateSpec } from './types'
import { str } from './types'

const layout = layoutJson as unknown as LayoutNode

/** 电子水牌1（Plate8Activity）：5.4578:1。 */
export const plate8: PlateSpec = {
  id: 'plate8',
  name: '电子水牌1',
  ratio: 5.4578,
  designHeight: 72,
  cover: 'covers/bg_plate_8.png',
  layout,
  fonts: ['toshiba', 'mnydz', 'fzxs15'],
  fields: [
    { key: 'carNumber', label: '车厢号', kind: 'text', maxLength: 2, placeholder: '如 8' },
    { key: 'trainNumber', label: '车次', kind: 'text', maxLength: 15, placeholder: '如 D6385' },
    { key: 'station', label: '站名显示内容', kind: 'text', maxLength: 120, placeholder: '如 上海南-义乌' },
    {
      key: 'color',
      label: '车厢号/站名文字颜色',
      kind: 'select',
      options: ELEC_STATION_COLORS,
    },
  ],
  defaults: {
    carNumber: '8',
    trainNumber: 'D6385',
    station: '上海南-义乌',
    color: COLORS.elecStation1,
  },
  build(values: PlateValues, ctx): PatchMap {
    const car = str(values, 'carNumber')
    const train = str(values, 'trainNumber').toUpperCase()
    const station = str(values, 'station').toUpperCase()
    const color = str(values, 'color') || COLORS.elecStation1
    const patches: PatchMap = new Map()
    patches.set('ll_car_number', {
      width: ctx.k(55),
      height: ctx.k(52),
    })
    patches.set('tv_car_number_1', {
      text: car.slice(0, 1),
      visible: car.length > 0,
      sizePx: ctx.k(47),
      color,
      margin: { l: ctx.k(3), t: ctx.k(1) },
      font: 'toshiba',
    })
    patches.set('tv_car_number_2', {
      text: car.slice(1, 2),
      visible: car.length > 1,
      sizePx: ctx.k(47),
      color,
      margin: { l: ctx.k(-2), t: ctx.k(1) },
      font: 'toshiba',
    })
    patches.set('ll_station', { margin: { l: ctx.k(50) } })
    patches.set('tv_number', {
      text: train,
      sizePx: ctx.k(37),
      margin: { t: ctx.k(-2) },
      color: COLORS.elecNumber,
      font: 'mnydz',
    })
    patches.set('tv_station', {
      text: station,
      sizePx: ctx.k(36),
      margin: { t: ctx.k(-2) },
      color,
      font: 'fzxs15',
      gravity: 'center_horizontal',
    })
    return patches
  },
}
