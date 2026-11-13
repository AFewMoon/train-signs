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

const loaded = new Map<FontKey, Promise<void>>()

function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

/** 懒加载字体；同一字体只加载一次。 */
export function ensureFont(key: FontKey): Promise<void> {
  if (key === 'sans') return Promise.resolve()
  const cached = loaded.get(key)
  if (cached) return cached
  const def = FONTS[key]
  const promise = (async () => {
    if (typeof document === 'undefined' || !('fonts' in document)) return
    const face = new FontFace(def.family, `url(${assetUrl(`fonts/${def.file}`)})`)
    await face.load()
    document.fonts.add(face)
  })().catch((error) => {
    console.warn(`字体加载失败：${def.file}`, error)
  })
  loaded.set(key, promise)
  return promise
}

export async function ensureFonts(keys: FontKey[]): Promise<void> {
  await Promise.all(keys.map((key) => ensureFont(key)))
}

export function fontFamily(key: FontKey): string {
  if (key === 'sans') return "'Noto Sans SC', 'Microsoft YaHei', sans-serif"
  return `'${FONTS[key].family}', 'Noto Sans SC', 'Microsoft YaHei', sans-serif`
}

let measureContext: CanvasRenderingContext2D | null = null

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
      const ctx = context()
      ctx.font = `${bold ? '700 ' : ''}${sizePx}px ${fontFamily(font)}`
      const m = ctx.measureText(text || '中')
      const ascent = m.fontBoundingBoxAscent ?? sizePx * 0.88
      const descent = m.fontBoundingBoxDescent ?? sizePx * 0.22
      return {
        width: (text ? ctx.measureText(text).width : 0) * scaleX,
        ascent,
        descent,
      }
    },
  }
}
