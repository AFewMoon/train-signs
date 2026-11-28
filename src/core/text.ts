/** 与 APK 一致的文本处理与横向压缩算法（c.a.a.f.c / c.a.a.f.f）。 */

export type SpaceStyle = 0 | 1 | 2

/** App 用不同 Unicode 空格模拟 1/4、1/5、1/2 空格。 */
export const SPACE_CHARS: Record<SpaceStyle, string> = {
  0: '\u2005', // 1/4 em 空格
  1: '\u2009', // 1/5 em 空格
  2: '\u2002', // 1/2 em 空格
}

/** c.a.a.f.c.i() 中记录的宽度系数。 */
export const SPACE_WIDTH: Record<SpaceStyle, number> = {
  0: 0.222223,
  1: 0.205,
  2: 0.501,
}

export const LEVEL_WIDTH_EPSILON: Record<number, number> = { 0: 0.003, 1: 0.001 }

const ASCII_NAMES: Record<string, number> = {
  ' ': 0.5294118,
  '-': 0.6666667,
  '/': 0.5555556,
  '→': 2,
  '(': 0.6666667,
  ')': 0.6666667,
  A: 1.4444444,
  B: 1.3333334,
  C: 1.4444444,
  D: 1.5555556,
  E: 0.75,
  F: 1.2222222,
  G: 1.5555556,
  H: 1.5555556,
  I: 1.2857143,
  J: 1,
  K: 1.5555556,
  L: 1.2222222,
  M: 1.7777778,
  N: 1.5555556,
  O: 1.4444444,
  P: 1.2222222,
  Q: 1.4444444,
  R: 1.4444444,
  S: 1.1111112,
  T: 1.3333334,
  U: 1.5555556,
  V: 1.4444444,
  W: 2,
  X: 1.4444444,
  Y: 1.4444444,
  Z: 1.3333334,
}

const ASCII_NAMES_NARROW: Record<string, number> = {
  ' ': 0.46153846,
  '-': 0.6,
  '/': 0.5,
  '→': 1.8,
  '(': 0.6,
  ')': 0.6,
  A: 1.2,
  B: 1.2,
  C: 1.3,
  D: 1.3,
  E: 1.2,
  F: 1.1,
  G: 1.4,
  H: 1.3,
  I: 0.5,
  J: 0.9,
  K: 1.2,
  L: 1,
  M: 1.5,
  N: 1.3,
  O: 1.4,
  P: 1.2,
  Q: 1.4,
  R: 1.3,
  S: 1.2,
  T: 1.1,
  U: 1.3,
  V: 1.2,
  W: 1.7,
  X: 1.2,
  Y: 1.2,
  Z: 1.1,
}

/** c.a.a.f.f.a(char, i) */
export function charWidthFactor(ch: string, mode: number): number {
  const table = mode === 0 ? ASCII_NAMES : ASCII_NAMES_NARROW
  return table[ch] ?? 1
}

/** c.a.a.f.f.c(str, i) */
export function widthFactorSum(text: string, mode: number): number {
  let sum = 0
  for (const ch of text) sum += charWidthFactor(ch, mode)
  return sum
}

/** c.a.a.f.f.b(i) */
export function widthFactorBase(mode: number): number {
  return mode === 1 ? 1.745508 : 2.01
}

/**
 * c.a.a.f.c.h()：根据可用宽度计算 textScaleX。
 * @param availableWidth TextView 内容宽度（px）
 * @param textSizePx 字号（px）
 * @param maxScale 允许的最大 textScaleX
 * @param mode 0/1 对应 App 的两套字宽表
 */
export function fitScaleX(
  text: string,
  availableWidth: number,
  textSizePx: number,
  maxScale: number,
  mode: number,
): number {
  if (!text) return maxScale
  const sum = widthFactorSum(text, mode)
  if (sum <= 0 || textSizePx <= 0) return maxScale
  const raw =
    (availableWidth * widthFactorBase(mode)) / (sum * textSizePx) -
    (text.length - 1) * (LEVEL_WIDTH_EPSILON[mode] ?? 0.001)
  return Math.min(raw, maxScale)
}

/** c.a.a.f.c.w()：统一括号、空格与换行。 */
export function normalizeText(text: string, spaceStyle: SpaceStyle): string {
  return text
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/ /g, SPACE_CHARS[spaceStyle])
    .replace(/\n/g, '')
}

/**
 * 车次输入过滤：保留任意语言的字母（含 V/v）与数字、空格及常见分隔符；
 * 只过滤表情等无关符号。用 Unicode 属性类，不再维护具体字母白名单。
 */
const TRAIN_NUMBER_DISALLOWED = /[^\p{L}\p{N} \/→—\-()（）·]/gu

export function sanitizeTrainNumber(text: string): string {
  return text.replace(TRAIN_NUMBER_DISALLOWED, '')
}

/** c.a.a.f.c.m()：估算显示宽度（单位：字符）。 */
export function estimateLength(text: string, spaceStyle: SpaceStyle): number {
  if (!text) return 0
  const normalized = text.replace(/ /g, SPACE_CHARS[spaceStyle])
  let length = normalized
    .replace(/（|\(|）|\)|-/g, '')
    .replace(new RegExp(SPACE_CHARS[spaceStyle], 'g'), '')
    .replace(/\n/g, '').length
  for (const ch of normalized) {
    if (ch === SPACE_CHARS[spaceStyle]) length += SPACE_WIDTH[spaceStyle]
    else if (ch === '(' || ch === ')' || ch === '-') length += 0.5
  }
  return length
}
