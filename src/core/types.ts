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
  /** 代码中 k() 计算出的尺寸/边距（px）。 */
  width?: number
  height?: number
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
}

export type PatchMap = Map<string, NodePatch>

export interface LayoutContext {
  widthPx: number
  heightPx: number
  dpScale: number
  unitScale: number
  measurer: Measurer
  patches: PatchMap
}

export type PlateValues = Record<string, string | boolean>
export type RenderValues = Record<string, string>
