import { describe, expect, it } from 'vitest'
import { COLORS } from '../../src/data/colors'
import { plate2 } from '../../src/plates/plate2'
import { createBuildContext } from '../../src/plates/types'

const ctx = createBuildContext(plate2.ratio, plate2.designHeight)

function build(overrides: Record<string, string | boolean> = {}) {
  return plate2.build({ ...plate2.defaults, ...overrides }, ctx)
}

describe('plate2 套跑2', () => {
  it('默认值覆盖封面示例且必填项非空', () => {
    expect(plate2.ratio).toBe(5)
    expect(plate2.designHeight).toBe(72)
    for (const key of ['startCn1', 'startPy1', 'endCn1', 'endPy1', 'number1']) {
      expect(String(plate2.defaults[key] ?? '').trim()).not.toBe('')
    }
    expect(plate2.defaults.doubleLeft).toBe(true)
    expect(plate2.defaults.doubleRight).toBe(false)
    expect(plate2.defaults.alignSides).toBe(true)
    expect(plate2.defaults.oblate).toBe(false)
  })

  it('默认左侧双站名、右侧单站名', () => {
    const p = build()
    expect(p.get('rl_left')?.visible).toBe(false)
    expect(p.get('rl_left_1')?.visible).toBe(true)
    expect(p.get('rl_left_2')?.visible).toBe(true)
    expect(p.get('rl_right')?.visible).toBe(true)
    expect(p.get('rl_right_1')?.visible).toBe(false)
    expect(p.get('rl_right_2')?.visible).toBe(false)
    expect(p.get('tv_start_1')?.text).toBe('东胜西')
    expect(p.get('tv_start_2')?.text).toBe('呼和浩特东')
    expect(p.get('tv_end')?.text).toBe('北京西')
  })

  it('等级文字拆成左右两半且拼音栏取等级颜色', () => {
    const p = build()
    expect(p.get('tv_level_1')?.text).toBe('快')
    expect(p.get('tv_level_2')?.text).toBe('速')
    for (const id of ['tv_start_en', 'tv_start_en_1', 'tv_end_en', 'tv_end_en_2']) {
      expect(p.get(id)?.bg).toBe(COLORS.kuaisu1)
    }
    expect(build({ level: `直达|${COLORS.zhida3}` }).get('tv_level_1')?.text).toBe('直')
  })

  it('车次行：第一行必显，二/三行有内容才显示', () => {
    expect(build().get('tv_number_1')?.text).toBe('K573/4  K617/8')
    expect(build().get('tv_number_2')?.visible).toBe(false)
    const p = build({ number2: 'k617/8' })
    expect(p.get('tv_number_2')?.visible).toBe(true)
    expect(p.get('tv_number_2')?.text).toBe('K617/8')
  })

  it('路徽：三行车次时缩小为 46.27', () => {
    expect(build().get('iv_icon')?.width).toBeCloseTo(ctx.k(52.27))
    const p = build({ number1: 'K1', number2: 'K2', number3: 'K3' })
    expect(p.get('iv_icon')?.width).toBeCloseTo(ctx.k(46.27))
  })

  it('扁长字体开关改变双行中文比例，长站名按 c.f() 压缩', () => {
    expect(build().get('tv_start_1')?.scaleX).toBeCloseTo(1.2)
    expect(build({ oblate: true }).get('tv_start_1')?.scaleX).toBeCloseTo(1.6)
    // 7 个字：1.2 × 6.2 ÷ 7（非扁长）；扁长时 1.6 × 4.5 ÷ 7。
    const long = '呼和浩特东站北'
    expect(build({ startCn2: long }).get('tv_start_2')?.scaleX).toBeCloseTo((1.2 * 6.2) / 7)
    expect(build({ startCn2: long, oblate: true }).get('tv_start_2')?.scaleX).toBeCloseTo((1.6 * 4.5) / 7)
  })

  it('拼音栏/车次使用引擎的自动横向压缩', () => {
    const p = build()
    expect(p.get('tv_start_en_1')?.fit).toEqual({ maxScale: 1, mode: 0 })
    expect(p.get('tv_number_1')?.fit).toEqual({ maxScale: 1.05, mode: 1 })
    // times 字体基线补偿（Android includeFontPadding）。
    expect(p.get('tv_start_en')?.baselineOffset ?? 0).toBeGreaterThan(0)
    expect(p.get('tv_number_1')?.lineHeightFactor).toBeGreaterThan(1)
  })

  it('拼音栏贴边关闭时根布局左右各留 6 个单位', () => {
    const p = build({ alignSides: false })
    expect(p.get('rl_plate')?.padding?.l).toBeCloseTo(ctx.k(6))
    expect(p.get('rl_plate')?.padding?.r).toBeCloseTo(ctx.k(6))
  })

  it('交换左右站名后数据与单/双站名状态互换', () => {
    const p = build({ swap: true })
    expect(p.get('tv_start')?.text).toBe('北京西')
    expect(p.get('tv_end_1')?.text).toBe('东胜西')
    expect(p.get('rl_left')?.visible).toBe(true)
    expect(p.get('rl_left_1')?.visible).toBe(false)
    expect(p.get('rl_right')?.visible).toBe(false)
    expect(p.get('rl_right_1')?.visible).toBe(true)
  })

  it('右侧双站名开启后显示终到站 2', () => {
    const p = build({ doubleRight: true, endCn2: '三亚', endPy2: 'SAN YA' })
    expect(p.get('rl_right')?.visible).toBe(false)
    expect(p.get('rl_right_2')?.visible).toBe(true)
    expect(p.get('tv_end_2')?.text).toBe('三亚')
    expect(p.get('tv_end_en_2')?.text).toBe('SAN YA')
  })
})
