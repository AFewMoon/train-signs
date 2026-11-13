// 生成模板导航用封面缩略图（264×104 WebP），减小首屏图片体积。
// 用法：npm run covers
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const WIDTH = 264
const HEIGHT = 104
const sourceDir = join('public', 'covers')
const targetDir = join(sourceDir, 'thumbs')

mkdirSync(targetDir, { recursive: true })

const files = readdirSync(sourceDir).filter((name) => /^bg_plate_\d+\.png$/.test(name))
if (files.length === 0) throw new Error('public/covers 下没有找到封面 PNG')

for (const file of files) {
  const img = await loadImage(readFileSync(join(sourceDir, file)))
  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')
  // 与 CSS object-fit: cover 一致：等比放大后居中裁切。
  const scale = Math.max(WIDTH / img.width, HEIGHT / img.height)
  const drawWidth = img.width * scale
  const drawHeight = img.height * scale
  ctx.drawImage(img, (WIDTH - drawWidth) / 2, (HEIGHT - drawHeight) / 2, drawWidth, drawHeight)
  const out = join(targetDir, file.replace(/\.png$/, '.webp'))
  const buffer = canvas.toBuffer('image/webp', 82)
  writeFileSync(out, buffer)
  console.log(`${file} -> ${out} (${(buffer.length / 1024).toFixed(1)}KB)`)
}
