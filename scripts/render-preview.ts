// 在 Node 中用 Skia 渲染水牌预览，便于在无浏览器环境下校验布局。
// 用法：npm run preview -- plate8 plate9
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLATES, getPlate } from '../src/plates/index'
import { createBuildContext } from '../src/plates/types'
import { layoutPlate } from '../src/core/layout'
import { renderBox } from '../src/core/render'
import { FONTS } from '../src/core/fonts'
import type { FontKey, Measurer } from '../src/core/types'

for (const def of Object.values(FONTS)) {
  GlobalFonts.registerFromPath(join('public', 'fonts', def.file), def.family)
}

const measureCanvas = createCanvas(8, 8)
const measureCtx = measureCanvas.getContext('2d')

const measurer: Measurer = {
  measure(text: string, font: FontKey, sizePx: number, scaleX: number, bold = false) {
    const family = font === 'sans' ? 'sans-serif' : `'${FONTS[font].family}'`
    measureCtx.font = `${bold ? '700 ' : ''}${sizePx}px ${family}`
    const m = measureCtx.measureText(text || '中')
    return {
      width: (text ? m.width : 0) * scaleX,
      ascent: m.fontBoundingBoxAscent ?? sizePx * 0.88,
      descent: m.fontBoundingBoxDescent ?? sizePx * 0.22,
    }
  },
}

mkdirSync('analysis', { recursive: true })
const wanted = process.argv.slice(2)
const plates = wanted.length ? wanted.map((id) => getPlate(id)) : PLATES

for (const spec of plates) {
  const ctxBuild = createBuildContext(spec.ratio, spec.designHeight, 0)
  const patches = spec.build({ ...spec.defaults }, ctxBuild)
  const box = layoutPlate(spec.layout, {
    widthPx: ctxBuild.widthPx,
    heightPx: ctxBuild.heightPx,
    dpScale: ctxBuild.widthPx / 340,
    unitScale: ctxBuild.heightPx / spec.designHeight,
    measurer,
    patches,
  })
  const canvas = createCanvas(Math.round(ctxBuild.widthPx), Math.round(ctxBuild.heightPx))
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  renderBox(ctx, box)
  const out = `analysis/preview-${spec.id}.png`
  writeFileSync(out, canvas.toBuffer('image/png'))
  console.log(`${spec.name} -> ${out} (${canvas.width}x${canvas.height})`)
}
