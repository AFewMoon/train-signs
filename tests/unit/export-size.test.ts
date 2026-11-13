import { describe, expect, it } from 'vitest'
import {
  EXPORT_WIDTH,
  MAX_EXPORT_AREA,
  MAX_EXPORT_WIDTH,
  MIN_EXPORT_WIDTH,
  createBuildContext,
  exportSize,
} from '../../src/plates/types'

describe('导出尺寸', () => {
  it('默认按 1370 宽与模板比例计算', () => {
    const size = exportSize(5)
    expect(size.width).toBe(EXPORT_WIDTH)
    expect(size.height).toBe(274)
    expect(size.clamped).toBe(false)
  })

  it('支持常用预设宽度', () => {
    expect(exportSize(5, 1920)).toMatchObject({ width: 1920, height: 384 })
    expect(exportSize(3.7333, 4096)).toMatchObject({ width: 4096, height: 1097 })
  })

  it('宽度低于下限时夹取', () => {
    const size = exportSize(5, 100)
    expect(size.width).toBe(MIN_EXPORT_WIDTH)
    expect(size.clamped).toBe(true)
    expect(size.reason).toBe('min')
  })

  it('宽度高于绝对上限时夹取', () => {
    const size = exportSize(5, 99999)
    expect(size.width).toBe(MAX_EXPORT_WIDTH)
    expect(size.reason).toBe('max')
  })

  it('画布面积超过 16M 时回退', () => {
    const size = exportSize(3.7333, 8192)
    expect(size.width * size.height).toBeLessThanOrEqual(MAX_EXPORT_AREA)
    expect(size.reason).toBe('area')
  })

  it('非法输入回退默认值', () => {
    expect(exportSize(5, Number.NaN).width).toBe(EXPORT_WIDTH)
  })

  it('构建上下文按自定义宽度等比缩放', () => {
    const base = createBuildContext(5, 72, 0, 1370)
    const scaled = createBuildContext(5, 72, 0, 2740)
    expect(scaled.widthPx).toBe(2740)
    expect(scaled.heightPx).toBeCloseTo(base.heightPx * 2, 6)
    expect(scaled.k(10)).toBeCloseTo(base.k(10) * 2, 6)
    expect(scaled.dp(10)).toBeCloseTo(base.dp(10) * 2, 6)
  })
})
