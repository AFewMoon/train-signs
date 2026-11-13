import type { FontKey, LayoutNode, PatchMap, PlateValues } from '../core/types'

export type FieldKind = 'text' | 'textarea' | 'number' | 'select'

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

export const EXPORT_WIDTH = 1370
/** 参考设备：360dp 宽屏幕，左右各 9.5dp 边距，APK 中按 340dp 计算水牌宽度。 */
export const REFERENCE_PLATE_WIDTH_DP = 340

export function createBuildContext(
  ratio: number,
  designHeight: number,
  spaceStyle: 0 | 1 | 2 = 0,
): PlateBuildContext {
  const widthPx = EXPORT_WIDTH
  const heightPx = widthPx / ratio
  const dpScale = widthPx / REFERENCE_PLATE_WIDTH_DP
  const unitScale = heightPx / designHeight
  return {
    widthPx,
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
