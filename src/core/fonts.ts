import type { FontKey, Measurer, TextMetrics } from './types'

interface FontDef {
  file: string
  family: string
}

/** 与原 APK assets/fonts 一一对应。 */
export const FONTS: Record<Exclude<FontKey, 'sans'>, FontDef> = {
  arial: { file: 'arial_bd.ttf', family: 'Plate Arial' },
  fzxbs: { file: 'fzxbs_gbk.ttf', family: 'Plate FZXBS' },
  fzxs15: { file: 'fzxs15.ttf', family: 'Plate FZXS15' },
  fzxs18: { file: 'fzxs18.ttf', family: 'Plate FZXS18' },
  hycsj: { file: 'hycsj.ttf', family: 'Plate HYCSJ' },
  hyzhj: { file: 'hyzhj.ttf', family: 'Plate HYZHJ' },
  mnydz: { file: 'mnydz.otf', family: 'Plate MNYDZ' },
  times: { file: 'times_lt_std_semibold.otf', family: 'Plate Times' },
  toshiba: { file: 'toshiba-bfa.ttf', family: 'Plate Toshiba' },
}

/** 字体文件变化时必须递增，否则 Cache API 会继续返回旧字体。 */
const FONT_CACHE_NAME = 'train-signs-fonts-v1'
const FONT_CACHE_PREFIX = 'train-signs-fonts-'
/**
 * mnydz.otf 原始 14.6MB、gzip 后仅 0.83MB：缓存它反而增加磁盘读取与内存峰值。
 * 其余字体压缩后仍有 0.4–6.6MB，跨会话缓存收益明显。
 */
const FONT_CACHE_SKIP = new Set(['mnydz.otf'])

const loaded = new Map<FontKey, Promise<void>>()
const settled = new Set<FontKey>()

function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

let cachePruned = false

/** 删除旧版本字体缓存，避免升级后磁盘里堆积多份大字体。 */
async function pruneOldFontCaches(): Promise<void> {
  if (cachePruned) return
  cachePruned = true
  try {
    for (const name of await caches.keys()) {
      if (name.startsWith(FONT_CACHE_PREFIX) && name !== FONT_CACHE_NAME) {
        await caches.delete(name)
      }
    }
  } catch {
    // 缓存列表不可用时忽略。
  }
}

/**
 * 从 Cache API 读取字体字节；未命中时下载并异步写回。
 * 失败返回 null，由调用方回退到 `FontFace(url)`，不影响功能。
 */
export async function readFontFromCache(url: string): Promise<ArrayBuffer | null> {
  if (typeof caches === 'undefined') return null
  try {
    const cache = await caches.open(FONT_CACHE_NAME)
    await pruneOldFontCaches()
    const hit = await cache.match(url)
    if (hit) return await hit.arrayBuffer()
    const response = await fetch(url, { cache: 'force-cache' })
    if (!response.ok) return null
    // clone 之后再读取，保证写缓存与解析互不阻塞。
    const copy = response.clone()
    const buffer = await response.arrayBuffer()
    void cache.put(url, copy).catch(() => undefined)
    return buffer
  } catch (error) {
    console.debug('字体缓存读写失败，回退到网络加载', url, error)
    return null
  }
}

async function deleteFontCache(url: string): Promise<void> {
  if (typeof caches === 'undefined') return
  try {
    const cache = await caches.open(FONT_CACHE_NAME)
    await cache.delete(url)
  } catch {
    // 忽略：下次会走网络重新加载。
  }
}

const fontBufferLoading = new Map<FontKey, Promise<ArrayBuffer | null>>()

/**
 * 读取字体字节供 SVG 导出解析字形：PROD 优先命中预览写入的 Cache API，DEV 直接 fetch；
 * 同一字体的并发请求只发一次，不做长期缓存，避免额外常驻内存。
 */
export function loadFontBuffer(key: FontKey): Promise<ArrayBuffer | null> {
  if (key === 'sans') return Promise.resolve(null)
  const existing = fontBufferLoading.get(key)
  if (existing) return existing
  const def = FONTS[key]
  const url = assetUrl(`fonts/${def.file}`)
  const useCache = import.meta.env.PROD && !FONT_CACHE_SKIP.has(def.file)
  const promise = (async () => {
    if (useCache) {
      const cached = await readFontFromCache(url)
      if (cached) return cached
    }
    try {
      const response = await fetch(url)
      return response.ok ? await response.arrayBuffer() : null
    } catch {
      return null
    }
  })().finally(() => fontBufferLoading.delete(key))
  fontBufferLoading.set(key, promise)
  return promise
}

let measureContext: CanvasRenderingContext2D | null = null
let fontVersion = 0
const metricsCache = new Map<string, TextMetrics>()
const METRICS_CACHE_LIMIT = 2048

/** 字体（或失败）settle 后清理测量缓存，避免把系统字体宽度当成设计字体宽度。 */
function markFontSettled(key: FontKey): void {
  settled.add(key)
  fontVersion += 1
  metricsCache.clear()
}

/** 加载单个字体；同一字体只创建一次 FontFace。 */
export function ensureFont(key: FontKey): Promise<void> {
  if (key === 'sans') return Promise.resolve()
  const cached = loaded.get(key)
  if (cached) return cached
  const def = FONTS[key]
  const promise = (async () => {
    if (typeof document === 'undefined' || !('fonts' in document)) {
      markFontSettled(key)
      return
    }
    const url = assetUrl(`fonts/${def.file}`)
    const useCache = import.meta.env.PROD && !FONT_CACHE_SKIP.has(def.file)
    const buffer = useCache ? await readFontFromCache(url) : null

    if (buffer) {
      try {
        const face = new FontFace(def.family, buffer)
        await face.load()
        document.fonts.add(face)
        markFontSettled(key)
        return
      } catch (error) {
        // 缓存损坏时删掉条目，走网络重试一次。
        console.warn(`缓存字体解析失败，重新下载：${def.file}`, error)
        await deleteFontCache(url)
      }
    }

    const face = new FontFace(def.family, `url(${url})`)
    await face.load()
    document.fonts.add(face)
    markFontSettled(key)
  })().catch((error) => {
    console.warn(`字体加载失败：${def.file}`, error)
    markFontSettled(key)
  })
  loaded.set(key, promise)
  return promise
}

export async function ensureFonts(keys: FontKey[]): Promise<void> {
  await Promise.all(keys.map((key) => ensureFont(key)))
}

/** 指定字体是否都已 settle（加载成功或失败）；失败也算就绪，避免反复等待。 */
export function isFontsReady(keys: FontKey[]): boolean {
  return keys.every((key) => key === 'sans' || settled.has(key))
}

export function fontFamily(key: FontKey): string {
  if (key === 'sans') return "'Noto Sans SC', 'Microsoft YaHei', sans-serif"
  return `'${FONTS[key].family}', 'Noto Sans SC', 'Microsoft YaHei', sans-serif`
}

function context(): CanvasRenderingContext2D {
  if (measureContext) return measureContext
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(8, 8)
    : Object.assign(document.createElement('canvas'), { width: 8, height: 8 })
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null
  if (!ctx) throw new Error('Canvas 2D 不可用')
  measureContext = ctx
  return ctx
}

export function createMeasurer(): Measurer {
  return {
    measure(text: string, font: FontKey, sizePx: number, scaleX: number, bold = false): TextMetrics {
      const key = `${fontVersion}|${font}|${bold ? 1 : 0}|${sizePx}|${text}`
      const hit = metricsCache.get(key)
      if (hit) {
        return { width: hit.width * scaleX, ascent: hit.ascent, descent: hit.descent }
      }
      const ctx = context()
      ctx.font = `${bold ? '700 ' : ''}${sizePx}px ${fontFamily(font)}`
      const m = ctx.measureText(text || '中')
      const ascent = m.fontBoundingBoxAscent ?? sizePx * 0.88
      const descent = m.fontBoundingBoxDescent ?? sizePx * 0.22
      const rawWidth = text ? m.width : 0
      if (metricsCache.size >= METRICS_CACHE_LIMIT) metricsCache.clear()
      metricsCache.set(key, { width: rawWidth, ascent, descent })
      return { width: rawWidth * scaleX, ascent, descent }
    },
  }
}
