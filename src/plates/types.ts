import type { FontKey, LayoutNode, PatchMap, PlateValues } from '../core/types'

export type FieldKind = 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'train'

export interface FieldOption {
  label: string
  value: string
}

export interface PlateField {
  key: string
  label: string
  kind: FieldKind
  maxLength?: number
  placeholder?: string
  hint?: string
  options?: FieldOption[]
  /** 该字段为拼音栏时，指向对应的中文站名字段，用于自动注音。 */
  pinyinOf?: string
  group?: string
  /** 生成图片前必填。 */
  required?: boolean
}

export interface PlateBuildContext {
  /** 设计单位 → 像素（对应 APK 的 k(float)）。 */
  k: (units: number) => number
  dp: (value: number) => number
  heightPx: number
  widthPx: number
  spaceStyle: 0 | 1 | 2
}

export interface PlateSpec {
  id: string
  name: string
  /** 宽高比（宽 / 高）。 */
  ratio: number
  /** APK 中 K(..., designHeight) 的设计高度。 */
  designHeight: number
  cover: string
  layout: LayoutNode
  fields: PlateField[]
  defaults: PlateValues
  fonts: FontKey[]
  build: (values: PlateValues, ctx: PlateBuildContext) => PatchMap
}

export const EXPORT_WIDTH = 1000
/** 参考设备：360dp 宽屏幕，左右各 9.5dp 边距，APK 中按 340dp 计算水牌宽度。 */
export const REFERENCE_PLATE_WIDTH_DP = 340

export const MIN_EXPORT_WIDTH = 320
export const MAX_EXPORT_WIDTH = 8192

export interface ExportSize {
  width: number
  height: number
  requestedWidth: number
  clamped: boolean
  reason?: 'min' | 'max'
}

/** 按模板宽高比计算导出尺寸；宽度限制在 320–8192。 */
export function exportSize(ratio: number, requestedWidth: number = EXPORT_WIDTH): ExportSize {
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1
  const requested = Number.isFinite(requestedWidth) ? Math.round(requestedWidth) : EXPORT_WIDTH
  let width = Math.max(MIN_EXPORT_WIDTH, Math.min(MAX_EXPORT_WIDTH, requested))
  let reason: ExportSize['reason']
  if (width !== requested) reason = requested < MIN_EXPORT_WIDTH ? 'min' : 'max'
  return {
    width,
    height: Math.round(width / safeRatio),
    requestedWidth: requested,
    clamped: reason !== undefined,
    reason,
  }
}

export function createBuildContext(
  ratio: number,
  designHeight: number,
  spaceStyle: 0 | 1 | 2 = 0,
  widthPx: number = EXPORT_WIDTH,
): PlateBuildContext {
  const width = Number.isFinite(widthPx) && widthPx > 0 ? widthPx : EXPORT_WIDTH
  const heightPx = width / ratio
  const dpScale = width / REFERENCE_PLATE_WIDTH_DP
  const unitScale = heightPx / designHeight
  return {
    widthPx: width,
    heightPx,
    spaceStyle,
    dp: (value: number) => value * dpScale,
    k: (units: number) => units * unitScale,
  }
}

export function str(values: PlateValues, key: string): string {
  const value = values[key]
  return typeof value === 'string' ? value : ''
}

export function bool(values: PlateValues, key: string): boolean {
  return values[key] === true
}
