import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  estimateLength,
  fitScaleX,
  normalizeText,
  widthFactorSum,
} from '../../src/core/text'
import { toPinyin, loadPinyin } from '../../src/core/pinyin'
import { formatTimestamp, loadSettings } from '../../src/core/storage'

describe('文本压缩（c.a.a.f.c/f）', () => {
  it('字宽系数按 App 表累加', () => {
    expect(widthFactorSum('W', 0)).toBe(2)
    expect(widthFactorSum('A-', 0)).toBeCloseTo(1.4444444 + 0.6666667, 5)
    expect(widthFactorSum('中', 0)).toBe(1)
  })

  it('短文本不超过 maxScale', () => {
    expect(fitScaleX('成都', 300, 40, 1.05, 0)).toBe(1.05)
  })

  it('长文本按比例压缩', () => {
    const scale = fitScaleX('A'.repeat(40), 300, 40, 1.05, 0)
    expect(scale).toBeGreaterThan(0)
    expect(scale).toBeLessThan(1.05)
  })

  it('空格样式与全角括号规范化', () => {
    expect(normalizeText('北京（南）', 0)).toBe('北京(南)')
    expect(normalizeText('a\nb', 1)).toBe('ab')
  })

  it('宽度估算把空格、横线计入', () => {
    expect(estimateLength('', 0)).toBe(0)
    expect(estimateLength('成都', 0)).toBe(2)
    expect(estimateLength('A-B', 0)).toBeCloseTo(2.5, 5)
  })
})

describe('自动注音', () => {
  beforeEach(async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      const name = String(url).split('/').pop() ?? ''
      return {
        text: async () => readFileSync(join('public', 'data', name), 'utf8'),
      } as Response
    })
    await loadPinyin()
  })

  it('普通汉字逐字注音', () => {
    expect(toPinyin('上海')).toBe('SHANGHAI')
  })

  it('多音字地名使用 words.dat 覆盖', () => {
    expect(toPinyin('六安')).toBe('LUAN')
    expect(toPinyin('蚌埠')).toBe('BENGBU')
  })

  it('保留横线与括号', () => {
    expect(toPinyin('北京-上海')).toBe('BEIJING-SHANGHAI')
    expect(toPinyin('成都（南）')).toBe('CHENGDU(NAN)')
  })
})

describe('图库文件名', () => {
  it('格式为 yyyyMMddHHmmssSSS', () => {
    const stamp = formatTimestamp(new Date(2026, 10, 13, 12, 5, 6, 7))
    expect(stamp).toBe('20261113120506007')
  })
})

describe('导出格式设置', () => {
  it('旧 jpeg 设置迁移为 webp', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ format: 'jpeg', exportWidth: 1920, spaceStyle: 1 }),
      setItem: () => undefined,
    })
    const settings = loadSettings()
    vi.unstubAllGlobals()
    expect(settings.format).toBe('webp')
    expect(settings.exportWidth).toBe(1920)
  })

  it('首次使用默认导出宽度为 1000', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined })
    const settings = loadSettings()
    vi.unstubAllGlobals()
    expect(settings.exportWidth).toBe(1000)
  })
})
