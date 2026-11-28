import { describe, expect, it } from 'vitest'
import {
  EXPORT_WIDTH,
  MAX_EXPORT_WIDTH,
  MIN_EXPORT_WIDTH,
  createBuildContext,
  exportSize,
} from '../../src/plates/types'

describe('导出尺寸', () => {
  it('默认按 1000 宽与模板比例计算', () => {
    const size = exportSize(5)
    expect(size.width).toBe(EXPORT_WIDTH)
    expect(size.height).toBe(200)
    expect(size.clamped).toBe(false)
  })

  it('支持四档预设宽度', () => {
    expect(exportSize(5, 1000)).toMatchObject({ width: 1000, height: 200 })
    expect(exportSize(3.7333, 4000)).toMatchObject({ width: 4000, height: 1071 })
    expect(exportSize(3.7333, 8000)).toMatchObject({ width: 8000, height: 2143, clamped: false })
  })

  it('四档预设在所有模板比例下都不被夹取', () => {
    for (const ratio of [5, 5.5, 5.15, 5.2, 5.1, 5.4578, 3.7333]) {
      for (const preset of [1000, 2000, 4000, 8000]) {
        expect(exportSize(ratio, preset), `${ratio}@${preset}`).toMatchObject({
          width: preset,
          clamped: false,
        })
      }
    }
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
