import { describe, expect, it } from 'vitest'
import { COLORS } from '../../src/data/colors'
import { plate3 } from '../../src/plates/plate3'
import { createBuildContext } from '../../src/plates/types'

const ctx = createBuildContext(plate3.ratio, plate3.designHeight)

function build(overrides: Record<string, string | boolean> = {}) {
  return plate3.build({ ...plate3.defaults, ...overrides }, ctx)
}

describe('plate3 套跑3', () => {
  it('默认值覆盖封面示例', () => {
    expect(plate3.ratio).toBe(5)
    expect(plate3.designHeight).toBe(72)
    expect(plate3.defaults.startCn1).toBe('北京西')
    expect(plate3.defaults.endCn1).toBe('广州')
    expect(plate3.defaults.endCn2).toBe('三亚')
    expect(plate3.defaults.swap).toBe(false)
  })

  it('默认左单右双', () => {
    const p = build()
    expect(p.get('rl_left')?.visible).toBe(true)
    expect(p.get('ll_left_1')?.visible).toBe(false)
    expect(p.get('ll_left_2')?.visible).toBe(false)
    expect(p.get('rl_right')?.visible).toBe(false)
    expect(p.get('ll_right_1')?.visible).toBe(true)
    expect(p.get('ll_right_2')?.visible).toBe(true)
    expect(p.get('tv_start')?.text).toBe('北京西')
    expect(p.get('tv_end_1')?.text).toBe('广州')
    expect(p.get('tv_end_2')?.text).toBe('三亚')
  })

  it('等级文字拆分与拼音栏颜色', () => {
    const p = build()
    expect(p.get('tv_level_1')?.text).toBe('直')
    expect(p.get('tv_level_2')?.text).toBe('达')
    for (const id of ['tv_start_en', 'tv_end_en', 'tv_end_en_1', 'tv_end_en_2']) {
      expect(p.get(id)?.bg).toBe(COLORS.zhida3)
    }
  })

  it('双行中文站名宽度按 H1() 计算（单双模式不同）', () => {
    const normal = build()
    const swapped = build({ swap: true })
    const widthNormal = Math.trunc(ctx.k(24) * 0.8 * 3.9)
    const widthSwapped = Math.trunc(ctx.k(24) * 0.8 * 3.5)
    expect(normal.get('tv_end_1')?.width).toBe(widthNormal)
    expect(swapped.get('tv_start_1')?.width).toBe(widthSwapped)
  })

  it('交换后左双右单，且字体压缩基准 0.8 生效', () => {
    const p = build({ swap: true })
    expect(p.get('rl_left')?.visible).toBe(false)
    expect(p.get('ll_left_1')?.visible).toBe(true)
    expect(p.get('ll_left_2')?.visible).toBe(true)
    expect(p.get('rl_right')?.visible).toBe(true)
    expect(p.get('ll_right_1')?.visible).toBe(false)
    // 2 个字未超过阈值 3.5，保持基准 0.8。
    expect(p.get('tv_start_1')?.scaleX).toBeCloseTo(0.8)
    // 4 个字按 0.8 × 3.5 ÷ 4 = 0.7 压缩；5 个字为 0.56。
    expect(build({ endCn1: '乌鲁木齐' }).get('tv_end_1')?.scaleX).toBeCloseTo(0.7)
    expect(build({ endCn1: '呼和浩特东' }).get('tv_end_1')?.scaleX).toBeCloseTo(0.56)
  })

  it('车次三行与路徽缩放', () => {
    const p = build()
    expect(p.get('tv_number_1')?.text).toBe('Z35/Z36')
    expect(p.get('tv_number_2')?.visible).toBe(true)
    expect(p.get('tv_number_3')?.visible).toBe(false)
    expect(p.get('iv_icon')?.width).toBeCloseTo(ctx.k(52.27))
    const three = build({ number1: 'Z1', number2: 'Z2', number3: 'Z3' })
    expect(three.get('iv_icon')?.width).toBeCloseTo(ctx.k(46.27))
  })

  it('拼音栏使用 times 自动压缩并做基线补偿', () => {
    const p = build()
    expect(p.get('tv_start_en')?.fit).toEqual({ maxScale: 1, mode: 0 })
    expect(p.get('tv_end_en_2')?.fit).toEqual({ maxScale: 1, mode: 0 })
    expect(p.get('tv_start_en')?.baselineOffset ?? 0).toBeGreaterThan(0)
    expect(p.get('tv_number_1')?.lineHeightFactor).toBeGreaterThan(1)
  })

  it('左右两侧容器与行间距按 F1() 覆写', () => {
    const p = build()
    expect(p.get('ll_left_parent')?.margin?.r).toBeCloseTo(ctx.k(-13))
    expect(p.get('ll_right_parent')?.margin?.l).toBeCloseTo(ctx.k(-13))
    expect(p.get('ll_left_1')?.margin?.l).toBeCloseTo(ctx.k(11))
    expect(p.get('ll_right_2')?.margin?.r).toBeCloseTo(ctx.k(11))
    expect(p.get('rl_left')?.margin?.b).toBeCloseTo(ctx.k(5.55))
  })
})
