import { describe, expect, it } from 'vitest'
import { plate4 } from '../../src/plates/plate4'
import { plate6 } from '../../src/plates/plate6'
import { COLORS } from '../../src/data/colors'
import { createBuildContext } from '../../src/plates/types'
import { layoutPlate } from '../../src/core/layout'
import type { Box, Measurer, PlateValues } from '../../src/core/types'
import { normalizeText } from '../../src/core/text'

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

function render(spec: typeof plate4 | typeof plate6, overrides: PlateValues = {}): Box {
  const ctx = createBuildContext(spec.ratio, spec.designHeight, 0)
  return layoutPlate(spec.layout, {
    widthPx: ctx.widthPx,
    heightPx: ctx.heightPx,
    dpScale: ctx.widthPx / 340,
    unitScale: ctx.heightPx / spec.designHeight,
    spaceStyle: 0,
    measurer,
    patches: spec.build({ ...spec.defaults, ...overrides }, ctx),
  })
}

function byId(box: Box, id: string): Box {
  if (box.id === id) return box
  for (const child of box.children) {
    const found = byIdOrUndefined(child, id)
    if (found) return found
  }
  throw new Error(`未找到 ${id}`)
}

function byIdOrUndefined(box: Box, id: string): Box | undefined {
  if (box.id === id) return box
  for (const child of box.children) {
    const found = byIdOrUndefined(child, id)
    if (found) return found
  }
  return undefined
}

describe('套跑4（Plate4）', () => {
  const box = render(plate4)
  const unit = box.h / 69.5

  it('基础信息与封面一致', () => {
    expect(plate4.id).toBe('plate4')
    expect(plate4.name).toBe('套跑4')
    expect(plate4.ratio).toBe(5.15)
    expect(plate4.designHeight).toBe(69.5)
    expect(plate4.cover).toBe('covers/bg_plate_4.png')
    expect(plate4.fonts).toEqual(expect.arrayContaining(['hycsj', 'times', 'hyzhj', 'arial']))
  })

  it('默认值覆盖全部字段', () => {
    for (const field of plate4.fields) {
      expect(plate4.defaults[field.key], field.key).toBeDefined()
    }
  })

  it('画布为 1000×194', () => {
    expect(box.w).toBe(1000)
    expect(box.h).toBeCloseTo(1000 / 5.15, 4)
  })

  it('主行高度等于版心高度，默认左右 padding 为 k(6)', () => {
    const main = byId(box, 'll_plate_main')
    expect(main.h).toBeCloseTo(box.h, 4)
    expect(main.padding.l).toBeCloseTo(6 * unit, 4)
    expect(main.padding.r).toBeCloseTo(6 * unit, 4)
  })

  it('三站等宽，路徽宽 k(83) 且负边距 -16.5', () => {
    const columns = box.children[0].children.filter((child) => child.tag === 'RelativeLayout' && !child.id)
    expect(columns).toHaveLength(3)
    expect(columns[0].w).toBeCloseTo(columns[1].w, 4)
    expect(columns[1].w).toBeCloseTo(columns[2].w, 4)
    const icon = byId(box, 'rl_icon_1')
    expect(icon.w).toBeCloseTo(83 * unit, 4)
    expect(icon.margin.l).toBeCloseTo(-16.5 * unit, 4)
  })

  it('拼音栏贴底、高 k(17.37)、底边距 k(7.78)', () => {
    const bar = byId(box, 'tv_start_en')
    expect(bar.h).toBeCloseTo(17.37 * unit, 4)
    expect(bar.y + bar.h).toBeCloseTo(box.h - 7.78 * unit, 4)
    expect(bar.bg).toBe(COLORS.tekuai2)
  })

  it('站名文本归一化且短名保持 0.9 压缩比', () => {
    const start = byId(box, 'tv_start')
    expect(start.text?.value).toBe('上海')
    expect(start.text?.scaleX).toBeCloseTo(0.9, 4)
    expect(start.text?.font).toBe('hycsj')
    expect(normalizeText('（上海）', 0)).toBe('(上海)')
  })

  it('等级文字按 App 拆成左右两半', () => {
    expect(byId(box, 'tv_level_11').text?.value).toBe('特')
    expect(byId(box, 'tv_level_12').text?.value).toBe('快')
  })

  it('车次两行可见、第三行隐藏且缩小宽度为 51 设计单位', () => {
    const number = byId(box, 'll_number_1')
    expect(number.w).toBeCloseTo(51 * unit, 4)
    expect(byId(box, 'tv_number_11').text?.value).toBe('T132/3/2')
    expect(byId(box, 'tv_number_11').text?.lineHeightFactor).toBe(1.3)
    expect(byId(box, 'tv_number_12').visible).toBe(true)
    expect(byId(box, 'tv_number_13').visible).toBe(false)
  })

  it('附加区默认隐藏', () => {
    expect(byId(box, 'll_plate_ex').visible).toBe(false)
  })

  it('等级预设决定颜色，自定义文字只覆盖文字', () => {
    const ctx = createBuildContext(plate4.ratio, plate4.designHeight, 0)
    const patches = plate4.build(
      { ...plate4.defaults, level: 'kuaisu1', levelTextLeft: '直达特快' },
      ctx,
    )
    expect(patches.get('tv_start_en')?.bg).toBe(COLORS.kuaisu1)
    expect(patches.get('tv_level_11')?.text).toBe('直达')
    expect(patches.get('tv_level_12')?.text).toBe('特快')
    expect(patches.get('iv_icon_1')?.image).toBe(plate4.defaults.icon)
  })

  it('拼音栏贴边时主行 padding 归零', () => {
    const aligned = render(plate4, { alignSides: true })
    const main = byId(aligned, 'll_plate_main')
    expect(main.padding.l).toBe(0)
    expect(main.padding.r).toBe(0)
  })
})

describe('套跑6（Plate6）', () => {
  const box = render(plate6)
  const unit = box.h / 70

  it('基础信息与封面一致', () => {
    expect(plate6.id).toBe('plate6')
    expect(plate6.name).toBe('套跑6')
    expect(plate6.ratio).toBe(5.1)
    expect(plate6.designHeight).toBe(70)
    expect(plate6.cover).toBe('covers/bg_plate_6.png')
    expect(plate6.fonts).toEqual(expect.arrayContaining(['hycsj', 'times', 'hyzhj', 'arial']))
  })

  it('默认值覆盖全部字段', () => {
    for (const field of plate6.fields) {
      expect(plate6.defaults[field.key], field.key).toBeDefined()
    }
  })

  it('画布为 1000×196', () => {
    expect(box.w).toBe(1000)
    expect(box.h).toBeCloseTo(1000 / 5.1, 4)
  })

  it('默认贴边：拼音栏铺满画布左右边缘', () => {
    expect(byId(box, 'tv_start_en').x).toBeCloseTo(0, 4)
    expect(byId(box, 'tv_end_en').x + byId(box, 'tv_end_en').w).toBeCloseTo(box.w, 4)
    expect(box.padding.l).toBe(0)
  })

  it('4 个站点列等权，3 个路徽宽 k(70) 且负边距 -20', () => {
    const bars = ['tv_start_en', 'tv_middle_left_en', 'tv_middle_right_en', 'tv_end_en']
    const widths = bars.map((id) => byId(box, id).w)
    expect(widths[0]).toBeCloseTo(widths[1], 4)
    expect(widths[1]).toBeCloseTo(widths[2], 4)
    expect(widths[2]).toBeCloseTo(widths[3], 4)
    const icon = byId(box, 'rl_icon_1')
    expect(icon.w).toBeCloseTo(70 * unit, 4)
    expect(icon.margin.l).toBeCloseTo(-20 * unit, 4)
  })

  it('拼音栏高 k(18.68)，文字颜色为白、底色取等级颜色', () => {
    const bar = byId(box, 'tv_middle_left_en')
    expect(bar.h).toBeCloseTo(18.68 * unit, 4)
    expect(bar.text?.color).toBe('#ffffff')
    expect(bar.bg).toBe(COLORS.kuaisu1)
  })

  it('等级文字按左右两半拆分（3 组）', () => {
    expect(byId(box, 'tv_level_11').text?.value).toBe('快')
    expect(byId(box, 'tv_level_12').text?.value).toBe('速')
    expect(byId(box, 'tv_level_31').text?.value).toBe('普')
    expect(byId(box, 'tv_level_32').text?.value).toBe('快')
  })

  it('车次数字块宽 33.44 设计单位、高 28.68', () => {
    const number = byId(box, 'll_number_1')
    expect(number.w).toBeCloseTo(33.44 * unit, 4)
    expect(number.h).toBeCloseTo(28.68 * unit, 4)
    expect(byId(box, 'tv_number_31').text?.value).toBe('2589/92')
    expect(byId(box, 'tv_number_31').text?.lineHeightFactor).toBe(1.3)
    expect(byId(box, 'tv_number_32').visible).toBe(true)
    expect(byId(box, 'tv_number_33').visible).toBe(false)
  })

  it('路徽与等级文字可切换', () => {
    const ctx = createBuildContext(plate6.ratio, plate6.designHeight, 0)
    const patches = plate6.build(
      { ...plate6.defaults, icon: 'icons/railway/ic_plate_07.png', levelTextRight: '临客' },
      ctx,
    )
    expect(patches.get('iv_icon_2')?.image).toBe('icons/railway/ic_plate_07.png')
    expect(patches.get('tv_level_31')?.text).toBe('临')
    expect(patches.get('tv_level_32')?.text).toBe('客')
  })

  it('取消贴边时根容器左右 padding 为 k(3)', () => {
    const loose = render(plate6, { alignSides: false })
    expect(loose.padding.l).toBeCloseTo(3 * unit, 4)
    expect(loose.padding.r).toBeCloseTo(3 * unit, 4)
  })
})
