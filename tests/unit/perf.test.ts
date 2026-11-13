import { describe, expect, it, vi } from 'vitest'
import { paintPlate, type PreparedPlate } from '../../src/core/plate-render'
import { coverThumb } from '../../src/core/render'
import type { Box } from '../../src/core/types'

function makeBox(): Box {
  return {
    tag: 'RelativeLayout',
    attrs: {},
    children: [],
    x: 0,
    y: 0,
    w: 1370,
    h: 274,
    padding: { l: 0, t: 0, r: 0, b: 0 },
    margin: { l: 0, t: 0, r: 0, b: 0 },
    visible: true,
  }
}

function makeCanvas() {
  const ctx = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(),
  }
  let widthSets = 0
  let heightSets = 0
  const canvas = {
    _width: 0,
    _height: 0,
    get width() {
      return this._width
    },
    set width(value: number) {
      widthSets += 1
      this._width = value
    },
    get height() {
      return this._height
    },
    set height(value: number) {
      heightSets += 1
      this._height = value
    },
    getContext: () => ctx,
  }
  return {
    canvas: canvas as unknown as HTMLCanvasElement,
    ctx,
    widthSets: () => widthSets,
    heightSets: () => heightSets,
  }
}

function prepared(width = 1370, height = 274): PreparedPlate {
  return { box: makeBox(), width, height, images: Promise.resolve() }
}

describe('封面缩略图路径', () => {
  it('封面 PNG 转为 thumbs 下的 WebP', () => {
    expect(coverThumb('covers/bg_plate_0.png')).toBe('covers/thumbs/bg_plate_0.webp')
    expect(coverThumb('covers/bg_plate_9.png')).toBe('covers/thumbs/bg_plate_9.webp')
  })

  it('非封面路径原样返回', () => {
    expect(coverThumb('icons/railway/ic_plate_01.png')).toBe('icons/railway/ic_plate_01.png')
    expect(coverThumb('https://example.com/a.png')).toBe('https://example.com/a.png')
  })
})

describe('画布复用', () => {
  it('同尺寸重绘不重建缓冲，只清屏', () => {
    const { canvas, ctx, widthSets, heightSets } = makeCanvas()
    const plate = prepared()
    paintPlate(canvas, plate)
    paintPlate(canvas, plate)

    expect(widthSets()).toBe(1)
    expect(heightSets()).toBe(1)
    expect(ctx.clearRect).toHaveBeenCalledTimes(2)
    expect(ctx.setTransform).toHaveBeenCalledTimes(2)
  })

  it('尺寸变化时重新设置画布缓冲', () => {
    const { canvas, widthSets, heightSets } = makeCanvas()
    paintPlate(canvas, prepared())
    paintPlate(canvas, prepared(800, 160))

    expect(widthSets()).toBe(2)
    expect(heightSets()).toBe(2)
  })
})
