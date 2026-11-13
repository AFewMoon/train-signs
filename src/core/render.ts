import type { Box } from './types'
import { fontFamily } from './fonts'

const imageCache = new Map<string, HTMLImageElement>()
const imageLoading = new Map<string, Promise<HTMLImageElement | null>>()

export function assetUrl(path: string): string {
  if (/^(https?:|data:|blob:)/.test(path)) return path
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(src)
  if (cached) return Promise.resolve(cached)
  const loading = imageLoading.get(src)
  if (loading) return loading
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => {
      imageCache.set(src, img)
      resolve(img)
    }
    img.onerror = () => resolve(null)
    img.src = assetUrl(src)
  })
  imageLoading.set(src, promise)
  return promise
}

/** 供 Node 预览等非浏览器环境注入已加载的图片。 */
export function putImage(src: string, image: CanvasImageSource & { width: number; height: number }): void {
  imageCache.set(src, image as unknown as HTMLImageElement)
}

/** 预加载布局树中出现的所有图片，保证导出时图片已就绪。 */
export async function preloadImages(box: Box): Promise<void> {
  const tasks: Promise<unknown>[] = []
  const walk = (node: Box): void => {
    if (node.image) tasks.push(loadImage(node.image.src))
    node.children.forEach(walk)
  }
  walk(box)
  await Promise.all(tasks)
}

function drawImage(ctx: CanvasRenderingContext2D, box: Box): void {
  if (!box.image) return
  const img = imageCache.get(box.image.src)
  if (!img) return
  const x = box.x
  const y = box.y
  const w = box.w
  const h = box.h
  const scaleType = box.image.scaleType
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  if (scaleType === 'centerCrop') {
    const scale = Math.max(w / img.width, h / img.height)
    const dw = img.width * scale
    const dh = img.height * scale
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  } else if (scaleType === 'centerInside' || scaleType === 'fitCenter') {
    const scale = Math.min(w / img.width, h / img.height)
    const dw = img.width * scale
    const dh = img.height * scale
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  } else {
    ctx.drawImage(img, x, y, w, h)
  }
  ctx.restore()
}

export interface TextRunLayout {
  contentX: number
  contentY: number
  contentW: number
  contentH: number
  glyphLine: number
  lineHeight: number
  textWidth: number
  originX: number
  baseline: number
}

/** 计算一个 TextView 的文字绘制位置；Canvas 与 SVG 导出共用，保证几何一致。 */
export function computeTextRun(
  box: Box,
  rawWidth: number,
  ascent: number,
  descent: number,
): TextRunLayout {
  const t = box.text!
  const contentX = box.x + box.padding.l
  const contentY = box.y + box.padding.t
  const contentW = Math.max(0, box.w - box.padding.l - box.padding.r)
  const contentH = Math.max(0, box.h - box.padding.t - box.padding.b)
  const glyphLine = ascent + descent
  const lineHeight = glyphLine * (t.lineHeightFactor ?? 1)
  const topPad = (lineHeight - glyphLine) / 2
  const textWidth = rawWidth * t.scaleX
  const parts = t.gravity.split('|')
  const centerH = parts.includes('center') || parts.includes('center_horizontal')
  const centerV = parts.includes('center') || parts.includes('center_vertical')
  const rightH = parts.includes('right') || parts.includes('end')
  const bottomV = parts.includes('bottom')
  let originX = contentX
  if (centerH) originX = contentX + (contentW - textWidth) / 2
  else if (rightH) originX = contentX + contentW - textWidth
  if (t.marquee && textWidth > contentW) {
    originX = contentX - (t.scrollX ?? 0)
  }
  let baseline = contentY + topPad + ascent
  if (centerV) baseline = contentY + (contentH - lineHeight) / 2 + topPad + ascent
  else if (bottomV) baseline = contentY + contentH - lineHeight + topPad + ascent
  baseline += t.baselineOffset ?? 0
  return { contentX, contentY, contentW, contentH, glyphLine, lineHeight, textWidth, originX, baseline }
}

/** 在给定 canvas 上绘制单个 TextView（含裁剪）；供 SVG 缺字回退复用。 */
export function drawTextBox(ctx: CanvasRenderingContext2D, box: Box): void {
  const t = box.text
  if (!t || !t.value) return
  ctx.font = `${t.bold ? '700 ' : ''}${t.sizePx}px ${fontFamily(t.font)}`
  ctx.fillStyle = t.color
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const metrics = ctx.measureText(t.value || '中')
  const ascent = metrics.fontBoundingBoxAscent ?? t.sizePx * 0.88
  const descent = metrics.fontBoundingBoxDescent ?? t.sizePx * 0.22
  const run = computeTextRun(box, metrics.width, ascent, descent)
  ctx.save()
  ctx.beginPath()
  ctx.rect(run.contentX, run.contentY, run.contentW, run.contentH)
  ctx.clip()
  ctx.translate(run.originX, run.baseline)
  ctx.scale(t.scaleX, 1)
  ctx.fillText(t.value, 0, 0)
  ctx.restore()
}

export function renderBox(ctx: CanvasRenderingContext2D, box: Box): void {
  if (!box.visible) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(box.x, box.y, box.w, box.h)
  ctx.clip()
  if (box.bg && box.bg !== 'border') {
    ctx.fillStyle = box.bg
    ctx.fillRect(box.x, box.y, box.w, box.h)
  }
  if (box.border) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1
    ctx.strokeRect(box.x + 0.5, box.y + 0.5, Math.max(0, box.w - 1), Math.max(0, box.h - 1))
  }
  if (box.image) drawImage(ctx, box)
  if (box.text) drawTextBox(ctx, box)
  for (const child of box.children) renderBox(ctx, child)
  ctx.restore()
}

/** 创建离屏画布并按布局树绘制，用于预览与导出。 */
export function renderToCanvas(canvas: HTMLCanvasElement, box: Box, width: number, height: number): void {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1))
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  renderBox(ctx, box)
}
