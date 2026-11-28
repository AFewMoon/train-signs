import { describe, expect, it } from 'vitest'
import { plate8 } from '../../src/plates/plate8'
import { plate9 } from '../../src/plates/plate9'
import { createBuildContext } from '../../src/plates/types'
import { layoutPlate } from '../../src/core/layout'
import type { Box, Measurer } from '../../src/core/types'

/** 与 Skia 无关的固定度量，用于锁定布局几何。 */
const measurer: Measurer = {
  measure(text, _font, size, scaleX) {
    return {
      width: [...text].length * size * 0.6 * scaleX,
      ascent: size * 0.8,
      descent: size * 0.2,
    }
  },
}

function render(spec: typeof plate8): Box {
  const ctx = createBuildContext(spec.ratio, spec.designHeight, 0)
  return layoutPlate(spec.layout, {
    widthPx: ctx.widthPx,
    heightPx: ctx.heightPx,
    dpScale: ctx.widthPx / 340,
    unitScale: ctx.heightPx / spec.designHeight,
    spaceStyle: 0,
    measurer,
    patches: spec.build({ ...spec.defaults }, ctx),
  })
}

function findById(box: Box, id: string): Box | undefined {
  if (box.id === id) return box
  for (const child of box.children) {
    const found = findById(child, id)
    if (found) return found
  }
  return undefined
}

function byId(box: Box, id: string): Box {
  const found = findById(box, id)
  if (!found) throw new Error(`未找到 ${id}`)
  return found
}

function expectedHeight(spec: typeof plate8): number {
  return 1000 / spec.ratio
}

describe('电子水牌1（Plate8）布局', () => {
  const box = render(plate8)

  it('画布为 1000×183', () => {
    expect(box.w).toBe(1000)
    expect(box.h).toBeCloseTo(expectedHeight(plate8), 3)
  })

  it('车厢号按 55/72 设计单位定位', () => {
    const car = byId(box, 'll_car_number')
    expect(car.w).toBeCloseTo((box.h / 72) * 55, 4)
    expect(car.h).toBeCloseTo((box.h / 72) * 52, 4)
    expect(car.y).toBeCloseTo((box.h - car.h) / 2, 4)
  })

  it('站名区域从车厢号右侧 50 单位开始', () => {
    const car = byId(box, 'll_car_number')
    const station = byId(box, 'll_station')
    expect(station.x).toBeCloseTo(car.x + car.w + (box.h / 72) * 50, 4)
  })

  it('文本内容与字体正确', () => {
    expect(byId(box, 'tv_car_number_1').text?.value).toBe('8')
    expect(byId(box, 'tv_car_number_1').text?.font).toBe('toshiba')
    expect(byId(box, 'tv_number').text?.value).toBe('D6385')
    expect(byId(box, 'tv_number').text?.font).toBe('mnydz')
    expect(byId(box, 'tv_station').text?.value).toBe('上海南-义乌')
    expect(byId(box, 'tv_station').text?.font).toBe('fzxs15')
  })
})

describe('电子水牌2（Plate9）布局', () => {
  const box = render(plate9)

  it('画布为 1000×268', () => {
    expect(box.w).toBe(1000)
    expect(box.h).toBeCloseTo(expectedHeight(plate9), 3)
  })

  it('车厢号区宽 105 设计单位', () => {
    const car = byId(box, 'll_car_number')
    expect(car.w).toBeCloseTo((1000 / 3.7333 / 106) * 105, 3)
  })

  it('两行文字都从车厢号区右侧开始', () => {
    const car = byId(box, 'll_car_number')
    expect(byId(box, 'tv_line_1').x).toBeCloseTo(car.x + car.w, 4)
    expect(byId(box, 'tv_line_2').x).toBeCloseTo(car.x + car.w, 4)
    expect(byId(box, 'tv_line_2').y).toBeGreaterThan(byId(box, 'tv_line_1').y)
  })
})
