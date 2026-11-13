import type {
  Box,
  LayoutContext,
  LayoutNode,
  NodePatch,
  Padding,
  TextMetrics,
} from './types'

function num(value: string | undefined, fallback = 0): number {
  if (!value) return fallback
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function dpDim(value: string | undefined, dpScale: number, fallback: number | 'match' | 'wrap' = 0): number | 'match' | 'wrap' {
  if (!value) return fallback
  if (value === 'match_parent' || value === 'fill_parent') return 'match'
  if (value === 'wrap_content') return 'wrap'
  if (value.endsWith('dp')) return Number.parseFloat(value) * dpScale
  if (value.endsWith('dip')) return Number.parseFloat(value) * dpScale
  if (value.endsWith('px')) return Number.parseFloat(value)
  if (value.endsWith('sp')) return Number.parseFloat(value) * dpScale
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed * dpScale : fallback
}

function parsePadding(attrs: Record<string, string>, dpScale: number): Padding {
  const all = attrs['android:padding']
  const base = all ? num(all) * dpScale : 0
  return {
    l: attrs['android:paddingLeft'] ? num(attrs['android:paddingLeft']) * dpScale : base,
    t: attrs['android:paddingTop'] ? num(attrs['android:paddingTop']) * dpScale : base,
    r: attrs['android:paddingRight'] ? num(attrs['android:paddingRight']) * dpScale : base,
    b: attrs['android:paddingBottom'] ? num(attrs['android:paddingBottom']) * dpScale : base,
  }
}

function parseMargins(attrs: Record<string, string>, dpScale: number): Padding {
  return {
    l: num(attrs['android:layout_marginLeft']) * dpScale,
    t: num(attrs['android:layout_marginTop']) * dpScale,
    r: num(attrs['android:layout_marginRight']) * dpScale,
    b: num(attrs['android:layout_marginBottom']) * dpScale,
  }
}

function patchFor(ctx: LayoutContext, id: string | undefined): NodePatch | undefined {
  if (!id) return undefined
  return ctx.patches.get(id)
}

function makeBox(node: LayoutNode, ctx: LayoutContext): Box {
  const attrs = node.attrs
  const id = attrs['android:id']
  const patch = patchFor(ctx, id)
  const padding = { ...parsePadding(attrs, ctx.dpScale), ...(patch?.padding ?? {}) }
  const margin = { ...parseMargins(attrs, ctx.dpScale), ...(patch?.margin ?? {}) }
  const visible = patch?.visible ?? attrs['android:visibility'] !== 'gone'
  const box: Box = {
    tag: node.tag,
    id,
    attrs,
    children: [],
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    padding,
    margin,
    visible,
  }
  if (attrs['android:background']) {
    box.bg = attrs['android:background']
    if (box.bg === 'border') box.border = true
  }
  if (patch?.bg) box.bg = patch.bg
  if (patch?.border !== undefined) box.border = patch.border
  if (attrs['android:src'] || patch?.image) {
    box.image = {
      src: patch?.image ?? attrs['android:src'],
      scaleType: patch?.scaleType ?? attrs['android:scaleType'] ?? 'fitCenter',
    }
  }
  if (node.tag.endsWith('TextView') || node.tag === 'TextView' || node.tag.endsWith('MarqueeTextView')) {
    box.text = {
      value: patch?.text ?? attrs['android:text'] ?? '',
      font: patch?.font ?? 'sans',
      sizePx:
        patch?.sizePx ??
        (attrs['android:textSize'] ? num(attrs['android:textSize']) * ctx.dpScale : 16 * ctx.dpScale),
      scaleX: patch?.scaleX ?? (attrs['android:textScaleX'] ? num(attrs['android:textScaleX']) : 1),
      color: patch?.color ?? attrs['android:textColor'] ?? '#000000',
      bold: patch?.bold ?? attrs['android:textStyle'] === 'bold',
      gravity: patch?.gravity ?? attrs['android:gravity'] ?? 'left|top',
      maxLines: patch?.maxLines ?? (attrs['android:maxLines'] ? num(attrs['android:maxLines']) : 1),
      marquee: patch?.marquee ?? node.tag.endsWith('MarqueeTextView'),
      scrollX: patch?.scrollX ?? 0,
    }
  }
  return box
}

function textMetrics(box: Box, ctx: LayoutContext): TextMetrics {
  const t = box.text!
  return ctx.measurer.measure(t.value, t.font, t.sizePx, t.scaleX, t.bold)
}

function intrinsicWidth(box: Box, ctx: LayoutContext): number {
  if (box.text) {
    const m = textMetrics(box, ctx)
    return m.width + box.padding.l + box.padding.r
  }
  if (box.image) {
    // ImageView 在 XML 中通常已给出固定尺寸；wrap 时按 1:1 占位。
    return box.padding.l + box.padding.r
  }
  if (box.tag === 'LinearLayout') {
    const horizontal = box.attrs['android:orientation'] === 'horizontal'
    let total = 0
    let max = 0
    for (const child of box.children) {
      const w = intrinsicWidth(child, ctx) + child.margin.l + child.margin.r
      if (horizontal) total += w
      else max = Math.max(max, w)
    }
    return (horizontal ? total : max) + box.padding.l + box.padding.r
  }
  let max = 0
  for (const child of box.children) {
    max = Math.max(max, intrinsicWidth(child, ctx) + child.margin.l + child.margin.r)
  }
  return max + box.padding.l + box.padding.r
}

function intrinsicHeight(box: Box, ctx: LayoutContext): number {
  if (box.text) {
    const m = textMetrics(box, ctx)
    return m.ascent + m.descent + box.padding.t + box.padding.b
  }
  if (box.tag === 'LinearLayout') {
    const horizontal = box.attrs['android:orientation'] === 'horizontal'
    let total = 0
    let max = 0
    for (const child of box.children) {
      const h = intrinsicHeight(child, ctx) + child.margin.t + child.margin.b
      if (horizontal) max = Math.max(max, h)
      else total += h
    }
    return (horizontal ? max : total) + box.padding.t + box.padding.b
  }
  let max = 0
  for (const child of box.children) {
    max = Math.max(max, intrinsicHeight(child, ctx) + child.margin.t + child.margin.b)
  }
  return max + box.padding.t + box.padding.b
}

function resolveSize(
  value: number | 'match' | 'wrap',
  intrinsic: number,
  available: number,
  patchValue: number | undefined,
): number {
  if (patchValue !== undefined) return patchValue
  if (value === 'match') return available
  if (value === 'wrap') return intrinsic
  return value
}

function childSize(
  child: Box,
  parentInnerW: number,
  parentInnerH: number,
  ctx: LayoutContext,
): { w: number; h: number } {
  const patch = patchFor(ctx, child.id)
  const widthAttr = dpDim(child.attrs['android:layout_width'], ctx.dpScale, 'wrap')
  const heightAttr = dpDim(child.attrs['android:layout_height'], ctx.dpScale, 'wrap')
  const w = resolveSize(widthAttr, intrinsicWidth(child, ctx), parentInnerW - child.margin.l - child.margin.r, patch?.width)
  const h = resolveSize(heightAttr, intrinsicHeight(child, ctx), parentInnerH - child.margin.t - child.margin.b, patch?.height)
  return { w: Math.max(0, w), h: Math.max(0, h) }
}

/** 解析 gravity 中的水平/垂直分量。 */
export function gravityOf(gravity: string): { h: 'left' | 'center' | 'right'; v: 'top' | 'center' | 'bottom' } {
  const parts = gravity.split('|').map((p) => p.trim())
  let h: 'left' | 'center' | 'right' = 'left'
  let v: 'top' | 'center' | 'bottom' = 'top'
  for (const p of parts) {
    if (p === 'center') {
      h = 'center'
      v = 'center'
    }
    if (p === 'center_horizontal' || p === 'centerHorizontal') h = 'center'
    if (p === 'center_vertical' || p === 'centerVertical') v = 'center'
    if (p === 'left' || p === 'start') h = 'left'
    if (p === 'right' || p === 'end') h = 'right'
    if (p === 'top') v = 'top'
    if (p === 'bottom') v = 'bottom'
  }
  return { h, v }
}

function sibling(box: Box, id: string): Box | undefined {
  return box.children.find((c) => c.id === id)
}

function layoutRelative(box: Box, ctx: LayoutContext): void {
  const innerW = Math.max(0, box.w - box.padding.l - box.padding.r)
  const innerH = Math.max(0, box.h - box.padding.t - box.padding.b)
  const left = box.x + box.padding.l
  const top = box.y + box.padding.t
  const right = left + innerW
  const bottom = top + innerH

  const active = box.children.filter((c) => c.visible)
  // 初始尺寸
  for (const child of active) {
    const size = childSize(child, innerW, innerH, ctx)
    child.w = size.w
    child.h = size.h
  }

  // 多轮求解，处理链式相对约束。
  for (let pass = 0; pass < 3; pass++) {
    for (const child of active) {
      const a = child.attrs
      const m = child.margin
      let x: number | undefined
      let y: number | undefined
      let xRight: number | undefined
      let yBottom: number | undefined

      const toLeftOf = a['android:layout_toLeftOf']?.replace('@+id/', '').replace('@id/', '')
      const toRightOf = a['android:layout_toRightOf']?.replace('@+id/', '').replace('@id/', '')
      const above = a['android:layout_above']?.replace('@+id/', '').replace('@id/', '')
      const below = a['android:layout_below']?.replace('@+id/', '').replace('@id/', '')
      const alignLeft = a['android:layout_alignLeft']?.replace('@+id/', '').replace('@id/', '')
      const alignRight = a['android:layout_alignRight']?.replace('@+id/', '').replace('@id/', '')
      const alignTop = a['android:layout_alignTop']?.replace('@+id/', '').replace('@id/', '')
      const alignBottom = a['android:layout_alignBottom']?.replace('@+id/', '').replace('@id/', '')

      if (a['android:layout_alignParentLeft'] === 'true') x = left + m.l
      if (alignLeft) {
        const s = sibling(box, alignLeft)
        if (s) x = s.x + m.l
      }
      if (toRightOf) {
        const s = sibling(box, toRightOf)
        if (s) x = s.x + s.w + m.l
      }
      if (a['android:layout_alignParentRight'] === 'true') xRight = right - m.r
      if (alignRight) {
        const s = sibling(box, alignRight)
        if (s) xRight = s.x + s.w - m.r
      }
      if (toLeftOf) {
        const s = sibling(box, toLeftOf)
        if (s) xRight = s.x - m.r
      }
      if (a['android:layout_centerHorizontal'] === 'true') {
        x = left + (innerW - child.w) / 2 + m.l - m.r
        xRight = undefined
      }

      const widthAttr = dpDim(a['android:layout_width'], ctx.dpScale, 'wrap')
      if (widthAttr === 'match') {
        if (x !== undefined && xRight !== undefined) child.w = Math.max(0, xRight - x)
        else if (x !== undefined) child.w = Math.max(0, right - x)
        else if (xRight !== undefined) {
          child.w = Math.max(0, xRight - left)
          x = xRight - child.w
        } else child.w = Math.max(0, innerW)
      }
      if (x === undefined && xRight !== undefined) x = xRight - child.w
      if (x === undefined) x = left + m.l

      if (a['android:layout_alignParentTop'] === 'true') y = top + m.t
      if (alignTop) {
        const s = sibling(box, alignTop)
        if (s) y = s.y + m.t
      }
      if (below) {
        const s = sibling(box, below)
        if (s) y = s.y + s.h + m.t
      }
      if (a['android:layout_alignParentBottom'] === 'true') yBottom = bottom - m.b
      if (alignBottom) {
        const s = sibling(box, alignBottom)
        if (s) yBottom = s.y + s.h - m.b
      }
      if (above) {
        const s = sibling(box, above)
        if (s) yBottom = s.y - m.b
      }
      if (a['android:layout_centerVertical'] === 'true') {
        y = top + (innerH - child.h) / 2 + m.t - m.b
        yBottom = undefined
      }

      const heightAttr = dpDim(a['android:layout_height'], ctx.dpScale, 'wrap')
      if (heightAttr === 'match') {
        if (y !== undefined && yBottom !== undefined) child.h = Math.max(0, yBottom - y)
        else if (y !== undefined) child.h = Math.max(0, bottom - y)
        else if (yBottom !== undefined) {
          child.h = Math.max(0, yBottom - top)
          y = yBottom - child.h
        } else child.h = Math.max(0, innerH)
      }
      if (y === undefined && yBottom !== undefined) y = yBottom - child.h
      if (y === undefined) y = top + m.t

      child.x = x
      child.y = y
    }
  }
  for (const child of active) layoutContainer(child, ctx)
}

function layoutLinear(box: Box, ctx: LayoutContext): void {
  const horizontal = box.attrs['android:orientation'] === 'horizontal'
  const innerW = Math.max(0, box.w - box.padding.l - box.padding.r)
  const innerH = Math.max(0, box.h - box.padding.t - box.padding.b)
  const contentX = box.x + box.padding.l
  const contentY = box.y + box.padding.t
  const active = box.children.filter((c) => c.visible)

  let totalWeight = 0
  let usedMain = 0
  for (const child of active) {
    const weight = num(child.attrs['android:layout_weight'])
    totalWeight += weight
    const size = childSize(child, innerW, innerH, ctx)
    child.w = size.w
    child.h = size.h
    usedMain += horizontal ? child.w + child.margin.l + child.margin.r : child.h + child.margin.t + child.margin.b
  }
  const innerMain = horizontal ? innerW : innerH
  let cursor = horizontal ? contentX : contentY
  if (totalWeight > 0) {
    const remaining = Math.max(0, innerMain - usedMain)
    for (const child of active) {
      const weight = num(child.attrs['android:layout_weight'])
      if (weight === 0) continue
      const add = (remaining * weight) / totalWeight
      if (horizontal) child.w += add
      else child.h += add
    }
    cursor = horizontal ? contentX : contentY
  } else {
    // 主轴剩余空间用于 gravity 对齐
    const used = active.reduce(
      (sum, c) => sum + (horizontal ? c.w + c.margin.l + c.margin.r : c.h + c.margin.t + c.margin.b),
      0,
    )
    const free = Math.max(0, innerMain - used)
    if (horizontal) {
      const g = (box.attrs['android:gravity'] ?? '').split('|')
      if (g.includes('center') || g.includes('center_horizontal')) cursor += free / 2
      else if (g.includes('right') || g.includes('end')) cursor += free
    } else {
      const g = (box.attrs['android:gravity'] ?? '').split('|')
      if (g.includes('center') || g.includes('center_vertical')) cursor += free / 2
      else if (g.includes('bottom')) cursor += free
    }
  }

  for (const child of active) {
    if (horizontal) {
      child.x = cursor + child.margin.l
      const { v } = gravityOf(box.attrs['android:gravity'] ?? 'top')
      if (v === 'center') child.y = contentY + (innerH - child.h) / 2 + child.margin.t - child.margin.b
      else if (v === 'bottom') child.y = contentY + innerH - child.h - child.margin.b
      else child.y = contentY + child.margin.t
      cursor += child.w + child.margin.l + child.margin.r
    } else {
      child.y = cursor + child.margin.t
      const { h } = gravityOf(box.attrs['android:gravity'] ?? 'left')
      if (h === 'center') child.x = contentX + (innerW - child.w) / 2 + child.margin.l - child.margin.r
      else if (h === 'right') child.x = contentX + innerW - child.w - child.margin.r
      else child.x = contentX + child.margin.l
      cursor += child.h + child.margin.t + child.margin.b
    }
  }
  for (const child of active) layoutContainer(child, ctx)
}

function layoutGeneric(box: Box, ctx: LayoutContext): void {
  const size = childSize(box, box.w, box.h, ctx)
  for (const child of box.children) {
    if (!child.visible) continue
    const s = childSize(child, box.w, box.h, ctx)
    child.w = s.w
    child.h = s.h
    child.x = box.x + child.margin.l
    child.y = box.y + child.margin.t
    layoutContainer(child, ctx)
  }
  void size
}

function layoutContainer(box: Box, ctx: LayoutContext): void {
  if (!box.visible) return
  if (box.tag === 'RelativeLayout') layoutRelative(box, ctx)
  else if (box.tag === 'LinearLayout') layoutLinear(box, ctx)
  else layoutGeneric(box, ctx)
}

export function buildBox(node: LayoutNode, ctx: LayoutContext): Box {
  const box = makeBox(node, ctx)
  box.children = node.children.map((child) => buildBox(child, ctx))
  return box
}

export function layoutPlate(root: LayoutNode, ctx: LayoutContext): Box {
  const box = buildBox(root, ctx)
  const patch = patchFor(ctx, box.id)
  const widthAttr = dpDim(box.attrs['android:layout_width'], ctx.dpScale, 'match')
  const heightAttr = dpDim(box.attrs['android:layout_height'], ctx.dpScale, 'wrap')
  box.w = ctx.widthPx
  box.h = ctx.heightPx
  void widthAttr
  void heightAttr
  void patch
  layoutContainer(box, ctx)
  return box
}
