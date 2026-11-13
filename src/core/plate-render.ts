import { createMeasurer } from '../core/fonts'
import { layoutPlate } from '../core/layout'
import { preloadImages } from '../core/render'
import { renderBox } from '../core/render'
import type { PlateSpec } from '../plates/types'
import { createBuildContext } from '../plates/types'

export interface DrawOptions {
  spaceStyle?: 0 | 1 | 2
}

export interface PlateRenderResult {
  width: number
  height: number
}

/** 将水牌渲染到给定 canvas（原生像素尺寸，可直接导出）。 */
export async function drawPlate(
  spec: PlateSpec,
  values: Record<string, string | boolean>,
  canvas: HTMLCanvasElement,
  options: DrawOptions = {},
): Promise<PlateRenderResult> {
  const ctxBuild = createBuildContext(spec.ratio, spec.designHeight, options.spaceStyle ?? 0)
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
  await preloadImages(box)
  canvas.width = Math.round(ctxBuild.widthPx)
  canvas.height = Math.round(ctxBuild.heightPx)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D 不可用')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  renderBox(ctx, box)
  return { width: canvas.width, height: canvas.height }
}

export function exportCanvas(canvas: HTMLCanvasElement, format: 'png' | 'jpeg', name: string): void {
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
  canvas.toBlob(
    (blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${name}.${format === 'jpeg' ? 'jpg' : 'png'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
    mime,
    1,
  )
}
