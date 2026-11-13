export interface LayoutNode {
  tag: string
  attrs: Record<string, string>
  children: LayoutNode[]
}

export type FontKey =
  | 'arial'
  | 'fzxbs'
  | 'fzxs15'
  | 'fzxs18'
  | 'hycsj'
  | 'hyzhj'
  | 'mnydz'
  | 'times'
  | 'toshiba'
  | 'sans'

export interface TextMetrics {
  width: number
  ascent: number
  descent: number
}

export interface Measurer {
  measure(text: string, font: FontKey, sizePx: number, scaleX: number, bold?: boolean): TextMetrics
}

export interface Padding {
  l: number
  t: number
  r: number
  b: number
}

export interface Box {
  tag: string
  id?: string
  attrs: Record<string, string>
  children: Box[]
  /** 相对画布左上角的绝对坐标（px）。 */
  x: number
  y: number
  w: number
  h: number
  padding: Padding
  margin: Padding
  visible: boolean
  text?: {
    value: string
    font: FontKey
    sizePx: number
    scaleX: number
    color: string
    bold: boolean
    gravity: string
    maxLines: number
    marquee?: boolean
    scrollX?: number
    /** 行盒高度倍率（模拟 Android includeFontPadding 的行高），默认 1。 */
    lineHeightFactor?: number
    /** 基线额外偏移（px），用于校准字体垂直度量差异。 */
    baselineOffset?: number
  }
  image?: { src: string; scaleType: string }
  bg?: string
  border?: boolean
}

export interface NodePatch {
  visible?: boolean
  text?: string
  font?: FontKey
  color?: string
  bold?: boolean
  scaleX?: number
  sizePx?: number
  /** 代码中 k() 计算出的尺寸/边距（px）；也可用 'wrap'/'match' 覆盖 XML 规则。 */
  width?: number | 'wrap' | 'match'
  height?: number | 'wrap' | 'match'
  margin?: Partial<Padding>
  padding?: Partial<Padding>
  bg?: string
  border?: boolean
  image?: string
  scaleType?: string
  gravity?: string
  maxLines?: number
  marquee?: boolean
  scrollX?: number
  /** 对应 App 的 h()/f()：布局完成后按实际内容宽度计算 textScaleX。 */
  fit?: { maxScale: number; mode: number }
  /**
   * 对应部分模板的中文站名压缩：len = max(2, estimateLength(text))；
   * scaleX = min(maxScale, 可用宽度 / (字号 × len) − 0.02)。
   */
  fitLength?: { maxScale: number }
  /** 对应 android:minWidth（px）。 */
  minWidth?: number
  /** 覆盖 android:layout_weight（动态分配宽度用）。 */
  weight?: number
  /** 行盒高度倍率，用于校准 Android TextView 的 includeFontPadding 行高。 */
  lineHeightFactor?: number
  /** 基线额外偏移（px）。 */
  baselineOffset?: number
}

export type PatchMap = Map<string, NodePatch>

export interface LayoutContext {
  widthPx: number
  heightPx: number
  dpScale: number
  unitScale: number
  spaceStyle: 0 | 1 | 2
  measurer: Measurer
  patches: PatchMap
}

export type PlateValues = Record<string, string | boolean>
export type RenderValues = Record<string, string>
