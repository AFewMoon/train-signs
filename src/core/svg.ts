import type { Box, FontKey } from './types'
import { FONTS } from './fonts'
import { assetUrl, computeTextRun, drawTextBox } from './render'
import type { DrawOptions } from './plate-render'
import { layoutPlateForExport } from './plate-render'
import type { PlateSpec } from '../plates/types'

/** SVG 序列化所需的能力，可注入以便单元测试。 */
export interface SvgHost {
  measureRaw(
    text: string,
    font: FontKey,
    sizePx: number,
    bold: boolean,
  ): { width: number; ascent: number; descent: number }
  /** 返回字形路径数据；null 表示缺字/不支持，需回退位图。空字符串表示无轮廓（如空格）。 */
  glyphPath(font: FontKey, char: string, sizePx: number): Promise<string | null>
  /** 把单个 TextView 以 Canvas 位图输出（含裁剪），返回 data URL。 */
  rasterText(box: Box): Promise<string>
  imageDataUrl(src: string): Promise<string>
}

interface OpentypePathCommand {
  type: string
  x?: number
  y?: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

interface OpentypePath {
  commands: OpentypePathCommand[]
  toPathData(precision: number): string
}

interface OpentypeFont {
  charToGlyphIndex(char: string): number
  charToGlyph(char: string): {
    index: number
    getPath(x: number, y: number, size: number): OpentypePath
  }
}

/**
 * opentype.js 2.0.0 的 toPathData() 在坐标带浮点噪声（如 13.000000000000002）时，
 * 会把小数部分拼成 "1.7e-15e+2" 交给 Math.round，最终输出 NaN；浏览器遇到非法路径
 * 片段会截断后续绘制，表现为文字残缺。导出精度本就是 2 位小数，这里先把坐标取整。
 */
export function toSafePathData(path: OpentypePath): string {
  const keys = ['x', 'y', 'x1', 'y1', 'x2', 'y2'] as const
  for (const command of path.commands) {
    for (const key of keys) {
      const value = command[key]
      if (typeof value !== 'number') continue
      const rounded = Math.round(value * 100) / 100
      command[key] = Object.is(rounded, -0) ? 0 : rounded
    }
  }
  return path.toPathData(2)
}

function fmt(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value * 1000) / 1000) : '0'
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 把布局树序列化为 SVG 片段（含 defs）。导出供单测使用。 */
export async function serializeBox(root: Box, host: SvgHost): Promise<string> {
  const defs: string[] = []
  let clipSeq = 0

  const clipRect = (x: number, y: number, w: number, h: number): string => {
    const id = `ts-clip-${clipSeq++}`
    defs.push(
      `<clipPath id="${id}"><rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(Math.max(0, w))}" height="${fmt(Math.max(0, h))}"/></clipPath>`,
    )
    return `url(#${id})`
  }

  const imageNode = async (box: Box): Promise<string> => {
    if (!box.image) return ''
    const href = await host.imageDataUrl(box.image.src)
    const scaleType = box.image.scaleType
    const preserve =
      scaleType === 'centerCrop'
        ? 'xMidYMid slice'
        : scaleType === 'centerInside' || scaleType === 'fitCenter'
          ? 'xMidYMid meet'
          : 'none'
    return `<image x="${fmt(box.x)}" y="${fmt(box.y)}" width="${fmt(box.w)}" height="${fmt(box.h)}" preserveAspectRatio="${preserve}" href="${href}"/>`
  }

  const textNode = async (box: Box): Promise<string> => {
    const t = box.text
    if (!t || !t.value) return ''
    const metrics = host.measureRaw(t.value, t.font, t.sizePx, t.bold)
    const run = computeTextRun(box, metrics.width, metrics.ascent, metrics.descent)
    const clip = clipRect(run.contentX, run.contentY, run.contentW, run.contentH)
    const groupTransform = `translate(${fmt(run.originX)} ${fmt(run.baseline)}) scale(${fmt(t.scaleX)} 1)`

    let prefix = ''
    const paths: string[] = []
    let fallback = false
    for (const char of Array.from(t.value)) {
      const pathData = await host.glyphPath(t.font, char, t.sizePx)
      if (pathData === null) {
        fallback = true
        break
      }
      const x = host.measureRaw(prefix, t.font, t.sizePx, t.bold).width
      prefix += char
      if (pathData) {
        paths.push(`<path d="${pathData}" transform="translate(${fmt(x)} 0)"/>`)
      }
    }

    if (fallback || paths.length === 0) {
      const href = await host.rasterText(box)
      return `<g clip-path="${clip}"><image x="${fmt(box.x)}" y="${fmt(box.y)}" width="${fmt(box.w)}" height="${fmt(box.h)}" href="${href}"/></g>`
    }

    const stroke = t.bold
      ? ` stroke="${t.color}" stroke-width="${fmt(t.sizePx * 0.025)}" stroke-linejoin="round"`
      : ''
    return `<g clip-path="${clip}"><g transform="${groupTransform}" fill="${t.color}"${stroke}>${paths.join('')}</g></g>`
  }

  const visit = async (box: Box): Promise<string> => {
    if (!box.visible) return ''
    const clip = clipRect(box.x, box.y, box.w, box.h)
    const parts: string[] = [`<g clip-path="${clip}">`]
    if (box.bg && box.bg !== 'border') {
      parts.push(
        `<rect x="${fmt(box.x)}" y="${fmt(box.y)}" width="${fmt(box.w)}" height="${fmt(box.h)}" fill="${box.bg}"/>`,
      )
    }
    if (box.border) {
      parts.push(
        `<rect x="${fmt(box.x + 0.5)}" y="${fmt(box.y + 0.5)}" width="${fmt(Math.max(0, box.w - 1))}" height="${fmt(Math.max(0, box.h - 1))}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>`,
      )
    }
    if (box.image) parts.push(await imageNode(box))
    if (box.text) parts.push(await textNode(box))
    for (const child of box.children) parts.push(await visit(child))
    parts.push('</g>')
    return parts.join('')
  }

  const body = await visit(root)
  return `<defs>${defs.join('')}</defs>${body}`
}

/** 浏览器环境下构建 SVG 文件内容。 */
export async function buildSvg(
  spec: PlateSpec,
  values: Record<string, string | boolean>,
  options: DrawOptions = {},
): Promise<{ svg: string; width: number; height: number }> {
  const { box, width, height } = await layoutPlateForExport(spec, values, options)
  const host = createBrowserSvgHost()
  const content = await serializeBox(box, host)
  const title = escapeXml(`列车水牌 · ${spec.name}`)
  const svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<title>${title}</title>`,
    '<desc>列车水牌制作 Web 版 · 由布局常量与字体轮廓生成</desc>',
    content,
    '</svg>',
  ].join('\n')
  return { svg, width, height }
}

/** 浏览器侧 host：Canvas 测量、opentype 字形路径、位图/图标回退。 */
export function createBrowserSvgHost(): SvgHost {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D 不可用')
  const fontCache = new Map<FontKey, Promise<OpentypeFont | null>>()
  const imageCache = new Map<string, Promise<string>>()

  const loadFont = (key: FontKey): Promise<OpentypeFont | null> => {
    if (key === 'sans') return Promise.resolve(null)
    const cached = fontCache.get(key)
    if (cached) return cached
    const promise = (async () => {
      try {
        const def = FONTS[key]
        const buffer = await (await fetch(assetUrl(`fonts/${def.file}`))).arrayBuffer()
        // Vite 可能把 opentype.js 解析为 UMD（仅 default 导出），需要兼容两种形态。
        const mod = (await import('opentype.js')) as unknown as {
          parse?: (data: ArrayBuffer | Uint8Array) => unknown
          default?: { parse?: (data: ArrayBuffer | Uint8Array) => unknown }
        }
        const parse = mod.parse ?? mod.default?.parse
        if (!parse) throw new Error('opentype.js 未导出 parse')
        return parse(buffer) as unknown as OpentypeFont
      } catch (error) {
        console.warn('SVG 字体解析失败，文字将回退为位图', key, error)
        return null
      }
    })()
    fontCache.set(key, promise)
    return promise
  }

  return {
    measureRaw(text, font, sizePx, bold) {
      const def = font === 'sans' ? 'sans-serif' : `'${FONTS[font].family}', sans-serif`
      ctx.font = `${bold ? '700 ' : ''}${sizePx}px ${def}`
      const m = ctx.measureText(text || '中')
      return {
        width: text ? m.width : 0,
        ascent: m.fontBoundingBoxAscent ?? sizePx * 0.88,
        descent: m.fontBoundingBoxDescent ?? sizePx * 0.22,
      }
    },
    async glyphPath(font, char, sizePx) {
      const parsed = await loadFont(font)
      if (!parsed) return null
      try {
        if (parsed.charToGlyphIndex(char) === 0) return null
        const data = toSafePathData(parsed.charToGlyph(char).getPath(0, 0, sizePx))
        // 极端情况下仍可能包含非法数值；返回 null 触发整段文字回退为位图。
        return /NaN|Infinity/.test(data) ? null : data
      } catch {
        return null
      }
    },
    async rasterText(box) {
      const width = Math.max(1, Math.ceil(box.w))
      const height = Math.max(1, Math.ceil(box.h))
      const offscreen = document.createElement('canvas')
      offscreen.width = width
      offscreen.height = height
      const offCtx = offscreen.getContext('2d')
      if (!offCtx) return ''
      offCtx.translate(-box.x, -box.y)
      drawTextBox(offCtx, box)
      return offscreen.toDataURL('image/png')
    },
    imageDataUrl(src) {
      const cached = imageCache.get(src)
      if (cached) return cached
      const promise = (async () => {
        try {
          const blob = await (await fetch(assetUrl(src))).blob()
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
            reader.readAsDataURL(blob)
          })
        } catch (error) {
          console.warn('SVG 图片读取失败', src, error)
          return ''
        }
      })()
      imageCache.set(src, promise)
      return promise
    },
  }
}
