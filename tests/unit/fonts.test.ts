import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function makeCache() {
  return {
    match: vi.fn(async () => undefined as Response | undefined),
    put: vi.fn(async () => undefined),
    delete: vi.fn(async () => true),
  }
}

function makeCaches(cache: ReturnType<typeof makeCache>) {
  return {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => [] as string[]),
    delete: vi.fn(async () => true),
  }
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('字体 Cache API', () => {
  it('未命中时下载并写入缓存', async () => {
    const cache = makeCache()
    vi.stubGlobal('caches', makeCaches(cache))
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])))
    vi.stubGlobal('fetch', fetchMock)

    const { readFontFromCache } = await import('../../src/core/fonts')
    const buffer = await readFontFromCache('/fonts/x.ttf')

    expect(buffer).not.toBeNull()
    expect(Array.from(new Uint8Array(buffer!))).toEqual([1, 2, 3])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(cache.put).toHaveBeenCalledTimes(1)
  })

  it('命中缓存时不再发网络请求', async () => {
    const cache = makeCache()
    cache.match.mockResolvedValue(new Response(new Uint8Array([9, 8])))
    vi.stubGlobal('caches', makeCaches(cache))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { readFontFromCache } = await import('../../src/core/fonts')
    const buffer = await readFontFromCache('/fonts/x.ttf')

    expect(Array.from(new Uint8Array(buffer!))).toEqual([9, 8])
    expect(fetchMock).not.toHaveBeenCalled()
    expect(cache.put).not.toHaveBeenCalled()
  })

  it('缓存不可用时返回 null', async () => {
    vi.stubGlobal('caches', undefined)
    const { readFontFromCache } = await import('../../src/core/fonts')
    await expect(readFontFromCache('/fonts/x.ttf')).resolves.toBeNull()
  })
})

describe('字体加载状态', () => {
  it('并发加载同一字体只创建一次 FontFace，settle 后 isFontsReady 为 true', async () => {
    const created: string[] = []
    class FakeFontFace {
      constructor(
        public family: string,
        public source: string | BufferSource,
      ) {
        created.push(family)
      }
      load(): Promise<this> {
        return Promise.resolve(this)
      }
    }
    vi.stubGlobal('FontFace', FakeFontFace)
    vi.stubGlobal('document', { fonts: { add: vi.fn() } })

    const { ensureFont, isFontsReady } = await import('../../src/core/fonts')
    expect(isFontsReady(['arial'])).toBe(false)
    await Promise.all([ensureFont('arial'), ensureFont('arial')])
    expect(created).toHaveLength(1)
    expect(isFontsReady(['arial'])).toBe(true)
    expect(isFontsReady(['arial', 'sans'])).toBe(true)
  })
})

describe('测量缓存', () => {
  function stubCanvas() {
    const measureText = vi.fn(() => ({
      width: 10,
      fontBoundingBoxAscent: 8,
      fontBoundingBoxDescent: 2,
    }))
    class FakeOffscreenCanvas {
      getContext(): unknown {
        return { font: '', measureText }
      }
    }
    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas)
    return measureText
  }

  it('相同字体/字号/文本只测量一次，scaleX 只影响返回值', async () => {
    const measureText = stubCanvas()
    const { createMeasurer } = await import('../../src/core/fonts')
    const measurer = createMeasurer()

    expect(measurer.measure('成都', 'arial', 20, 1).width).toBe(10)
    expect(measurer.measure('成都', 'arial', 20, 2).width).toBe(20)
    expect(measureText).toHaveBeenCalledTimes(1)
  })

  it('字体 settle 后清空缓存并重新测量', async () => {
    const measureText = stubCanvas()
    class FakeFontFace {
      constructor(
        public family: string,
        public source: string | BufferSource,
      ) {}
      load(): Promise<this> {
        return Promise.resolve(this)
      }
    }
    vi.stubGlobal('FontFace', FakeFontFace)
    vi.stubGlobal('document', { fonts: { add: vi.fn() } })

    const { createMeasurer, ensureFont } = await import('../../src/core/fonts')
    const measurer = createMeasurer()
    measurer.measure('成都', 'arial', 20, 1)
    await ensureFont('arial')
    measurer.measure('成都', 'arial', 20, 1)
    expect(measureText).toHaveBeenCalledTimes(2)
  })
})
