import { describe, expect, it } from 'vitest'
import { plate0 } from '../../src/plates/plate0'
import { createBuildContext } from '../../src/plates/types'
import { layoutPlate } from '../../src/core/layout'
import type { Box, Measurer, PlateValues } from '../../src/core/types'

/** 固定度量，用于锁定布局几何（与真实字体无关）。 */
const measurer: Measurer = {
  measure(text, _font, size, scaleX) {
    return {
      width: [...text].length * size * 0.6 * scaleX,
      ascent: size * 0.8,
      descent: size * 0.2,
    }
  },
}

function render(values: PlateValues = { ...plate0.defaults }): Box {
  const ctx = createBuildContext(plate0.ratio, plate0.designHeight, 0)
  return layoutPlate(plate0.layout, {
    widthPx: ctx.widthPx,
    heightPx: ctx.heightPx,
    dpScale: ctx.widthPx / 340,
    unitScale: ctx.heightPx / plate0.designHeight,
    spaceStyle: 0,
    measurer,
    patches: plate0.build(values, ctx),
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

describe('标准/套跑（Plate0）默认布局', () => {
  const box = render()

  it('画布为 1000×200（5:1）', () => {
    expect(box.w).toBe(1000)
    expect(box.h).toBeCloseTo(200, 3)
  })

  it('默认值来自封面示例', () => {
    expect(plate0.defaults.startStation).toBe('成都')
    expect(plate0.defaults.startPinyin).toBe('CHENGDU')
    expect(plate0.defaults.endStation).toBe('昆明')
    expect(plate0.defaults.endPinyin).toBe('KUNMING')
    expect(plate0.defaults.trainNumber1).toBe('K113/4')
    expect(plate0.defaults.icon).toBe('icons/railway/ic_plate_01.png')
  })

  it('文本、字体与等级左右两半正确', () => {
    expect(byId(box, 'tv_start').text?.value).toBe('成都')
    expect(byId(box, 'tv_start').text?.font).toBe('hycsj')
    expect(byId(box, 'tv_end').text?.value).toBe('昆明')
    expect(byId(box, 'tv_start_en').text?.value).toBe('CHENGDU')
    expect(byId(box, 'tv_start_en').text?.font).toBe('times')
    expect(byId(box, 'tv_end_en').text?.value).toBe('KUNMING')
    expect(byId(box, 'tv_level_1').text?.value).toBe('快')
    expect(byId(box, 'tv_level_1').text?.font).toBe('hyzhj')
    expect(byId(box, 'tv_level_2').text?.value).toBe('速')
    expect(byId(box, 'tv_number_1').text?.value).toBe('K113/4')
    expect(byId(box, 'tv_number_1').text?.font).toBe('arial')
  })

  it('路徽位于中间 140.27 单位区域且为默认路徽', () => {
    const region = byId(box, 'rl_icon')
    expect(region.w).toBeCloseTo((200 / 72) * 140.27, 3)
    expect(region.x).toBeCloseTo((1000 - region.w) / 2, 3)
    const icon = byId(box, 'iv_icon')
    expect(icon.image?.src).toBe('icons/railway/ic_plate_01.png')
    expect(icon.w).toBeCloseTo((200 / 72) * 52.27, 3)
  })

  it('拼音栏贴底 5.54 单位、高 19.04 单位', () => {
    const bar = byId(box, 'tv_start_en')
    const unit = 200 / 72
    expect(bar.h).toBeCloseTo(unit * 19.04, 3)
    expect(bar.y + bar.h).toBeCloseTo(200 - unit * 5.54, 3)
  })
})

describe('标准/套跑（Plate0）开关分支', () => {
  it('左侧双站名时隐藏单行站名、显示两行中文', () => {
    const box = render({
      ...plate0.defaults,
      leftDoubleStation: true,
      startStation: '成都',
      startStation2: '重庆',
    })
    expect(byId(box, 'tv_start').visible).toBe(false)
    expect(byId(box, 'tv_start_1').visible).toBe(true)
    expect(byId(box, 'tv_start_1').text?.value).toBe('成都')
    expect(byId(box, 'tv_start_2').text?.value).toBe('重庆')
  })

  it('左侧双行拼音把两行写进 B/C，并清空单行拼音栏文字', () => {
    const box = render({
      ...plate0.defaults,
      leftDoubleStation: true,
      leftPinyinDouble: true,
      startPinyin: 'CHENGDU',
      startPinyin2: 'CHONGQING',
    })
    expect(byId(box, 'tv_start_en').text?.value).toBe('')
    expect(byId(box, 'tv_start_en_1').text?.value).toBe('CHENGDU')
    expect(byId(box, 'tv_start_en_2').text?.value).toBe('CHONGQING')
  })

  it('站名下方显示车次时隐藏路徽下方车次、显示 M/N', () => {
    const box = render({
      ...plate0.defaults,
      showNumberBelowStation: true,
      trainNumberBelowStart: 'K113',
      trainNumberBelowEnd: '4',
    })
    expect(byId(box, 'tv_number_1').visible).toBe(false)
    expect(byId(box, 'tv_bs_number_1').visible).toBe(true)
    expect(byId(box, 'tv_bs_number_1').text?.value).toBe('K113')
    expect(byId(box, 'tv_bs_number_2').text?.value).toBe('4')
  })

  it('左右分别设置等级时各自显示完整等级文字与颜色', () => {
    const box = render({
      ...plate0.defaults,
      separateLevels: true,
      levelLeft: 'zhida1',
      levelRight: 'tekuai2',
    })
    expect(byId(box, 'tv_level_1').text?.value).toBe('直达')
    expect(byId(box, 'tv_level_2').text?.value).toBe('特快')
    expect(byId(box, 'tv_start_en').bg).toBe('#141637')
    expect(byId(box, 'tv_end_en').bg).toBe('#193ed1')
  })
})

describe('标准/套跑（Plate0）多行车次行距', () => {
  // 回归：tv_number_1/2/3 必须带 lineHeightFactor，否则相邻行基线间距 < 0.6em 会重叠。
  const box = render({
    ...plate0.defaults,
    trainNumber1: 'K113/4',
    trainNumber2: 'K114/3',
    trainNumber3: 'K115/2',
  })

  it('三行车次都可见且文字正确', () => {
    const line1 = byId(box, 'tv_number_1')
    const line2 = byId(box, 'tv_number_2')
    const line3 = byId(box, 'tv_number_3')
    expect(line1.visible).toBe(true)
    expect(line2.visible).toBe(true)
    expect(line3.visible).toBe(true)
    expect(line1.text?.value).toBe('K113/4')
    expect(line2.text?.value).toBe('K114/3')
    expect(line3.text?.value).toBe('K115/2')
  })

  it('相邻行 y 间距大于 0.6 倍字号（lineHeightFactor=1 时约 0.42 倍会失败）', () => {
    const line1 = byId(box, 'tv_number_1')
    const line2 = byId(box, 'tv_number_2')
    const line3 = byId(box, 'tv_number_3')
    const size = line1.text?.sizePx ?? 0
    expect(size).toBeGreaterThan(0)
    expect(line2.y - line1.y).toBeGreaterThan(0.6 * size)
    expect(line3.y - line2.y).toBeGreaterThan(0.6 * size)
  })
})
