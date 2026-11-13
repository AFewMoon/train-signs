import { createMeasurer, ensureFonts } from '../core/fonts'
import { layoutPlate } from '../core/layout'
import { preloadImages } from '../core/render'
import { renderBox } from '../core/render'
import type { Box } from '../core/types'
import type { PlateSpec } from '../plates/types'
import { createBuildContext, exportSize } from '../plates/types'

export interface DrawOptions {
  spaceStyle?: 0 | 1 | 2
  /** 导出宽度（px）；省略时使用默认 1370。高度按模板比例自动计算。 */
  widthPx?: number
}

export interface PlateRenderResult {
  width: number
  height: number
}

export interface PlateLayoutResult extends PlateRenderResult {
  box: Box
}

/** 已完成的布局，附带仍在进行的图片加载任务。 */
export interface PreparedPlate extends PlateLayoutResult {
  images: Promise<void>
}

/**
 * 同步完成布局，并启动图片预加载；不等待字体。
 * 预览会先用当前可用字体画一版占位，字体就绪后再调用一次并重绘。
 */
export function preparePlate(
  spec: PlateSpec,
  values: Record<string, string | boolean>,
  options: DrawOptions = {},
): PreparedPlate {
  const size = exportSize(spec.ratio, options.widthPx)
  const ctxBuild = createBuildContext(spec.ratio, spec.designHeight, options.spaceStyle ?? 0, size.width)
  const patches = spec.build(values, ctxBuild)
  const box = layoutPlate(spec.layout, {
    widthPx: ctxBuild.widthPx,
    heightPx: ctxBuild.heightPx,
    dpScale: ctxBuild.widthPx / 340,
    unitScale: ctxBuild.heightPx / spec.designHeight,
    spaceStyle: options.spaceStyle ?? 0,
    measurer: createMeasurer(),
    patches,
  })
  return {
    box,
    width: Math.round(ctxBuild.widthPx),
    height: Math.round(ctxBuild.heightPx),
    images: preloadImages(box),
  }
}

/** 把布局树画到 canvas；尺寸未变时只清屏，避免反复重建画布缓冲。 */
export function paintPlate(canvas: HTMLCanvasElement, prepared: PreparedPlate): void {
  const { box, width, height } = prepared
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D 不可用')
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width, height)
  renderBox(ctx, box)
}

/** 加载字体并按导出尺寸完成布局；Canvas 与 SVG 导出共用。 */
export async function layoutPlateForExport(
  spec: PlateSpec,
  values: Record<string, string | boolean>,
  options: DrawOptions = {},
): Promise<PreparedPlate> {
  // 字体必须先加载并进入 document.fonts，否则 Canvas 会退回系统字体，测量与绘制都会失真。
  await ensureFonts(spec.fonts)
  const prepared = preparePlate(spec, values, options)
  await prepared.images
  return prepared
}

/** 将水牌渲染到给定 canvas（原生像素尺寸，可直接导出）。 */
export async function drawPlate(
  spec: PlateSpec,
  values: Record<string, string | boolean>,
  canvas: HTMLCanvasElement,
  options: DrawOptions = {},
): Promise<PlateRenderResult> {
  const prepared = await layoutPlateForExport(spec, values, options)
  paintPlate(canvas, prepared)
  return { width: prepared.width, height: prepared.height }
}

/** 生成指定分辨率的离屏 canvas，供下载与图库使用（不影响预览画布）。 */
export async function renderPlateCanvas(
  spec: PlateSpec,
  values: Record<string, string | boolean>,
  options: DrawOptions = {},
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const canvas = document.createElement('canvas')
  const result = await drawPlate(spec, values, canvas, options)
  return { canvas, ...result }
}

export function canvasToBlob(canvas: HTMLCanvasElement, format: 'png' | 'jpeg'): Promise<Blob | null> {
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
  return new Promise((resolve) => canvas.toBlob(resolve, mime, 1))
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportCanvas(canvas: HTMLCanvasElement, format: 'png' | 'jpeg', name: string): void {
  void canvasToBlob(canvas, format).then((blob) => {
    if (blob) downloadBlob(blob, `${name}.${format === 'jpeg' ? 'jpg' : 'png'}`)
  })
}
