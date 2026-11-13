import { describe, expect, it } from 'vitest'
import { serializeBox, type SvgHost } from '../../src/core/svg'
import type { Box } from '../../src/core/types'

function makeBox(overrides: Partial<Box> = {}): Box {
  return {
    tag: 'TextView',
    id: 'tv',
    attrs: {},
    children: [],
    x: 10,
    y: 20,
    w: 100,
    h: 30,
    padding: { l: 0, t: 0, r: 0, b: 0 },
    margin: { l: 0, t: 0, r: 0, b: 0 },
    visible: true,
    ...overrides,
  }
}

function makeHost(missingChar = '缺'): SvgHost {
  return {
    measureRaw(text, _font, size) {
      return { width: Array.from(text).length * size * 0.6, ascent: size * 0.8, descent: size * 0.2 }
    },
    async glyphPath(_font, char) {
      if (char === missingChar) return null
      if (char === ' ') return ''
      return 'M0 0 L10 10 Z'
    },
    async rasterText() {
      return 'data:image/png;base64,RASTER'
    },
    async imageDataUrl(src) {
      return `data:image/png;base64,${encodeURIComponent(src)}`
    },
  }
}

function textBox(value: string): Box {
  return makeBox({
    text: {
      value,
      font: 'arial',
      sizePx: 20,
      scaleX: 1,
      color: '#ff0000',
      bold: false,
      gravity: 'center_horizontal',
      maxLines: 1,
    },
  })
}

describe('SVG 序列化', () => {
  it('输出 clipPath、背景与文字路径', async () => {
    const root = makeBox({
      tag: 'RelativeLayout',
      bg: '#ffffff',
      children: [textBox('AB')],
    })
    const svg = await serializeBox(root, makeHost())
    expect(svg).toContain('<defs>')
    expect(svg).toContain('clipPath')
    expect(svg).toContain('<rect')
    expect(svg).toContain('#ffffff')
    expect(svg.split('<path').length - 1).toBe(2)
    expect(svg).toContain('transform="translate(')
    expect(svg).toContain('scale(1 1)')
  })

  it('缺字时整段回退为位图', async () => {
    const svg = await serializeBox(makeBox({ children: [textBox('A缺B')] }), makeHost('缺'))
    expect(svg).toContain('<image')
    expect(svg).toContain('data:image/png;base64,RASTER')
    expect(svg).not.toContain('<path')
  })

  it('图片以 data URI 内嵌', async () => {
    const root = makeBox({
      image: { src: 'icons/railway/ic_plate_01.png', scaleType: 'centerCrop' },
    })
    const svg = await serializeBox(root, makeHost())
    expect(svg).toContain('<image')
    expect(svg).toContain('xMidYMid slice')
    expect(svg).toContain('data:image/png;base64,')
  })

  it('隐藏节点不输出', async () => {
    const svg = await serializeBox(makeBox({ visible: false, bg: '#000000' }), makeHost())
    expect(svg).not.toContain('<rect')
  })
})
