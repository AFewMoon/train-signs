/** 原 App 的自动注音：characters.dat（拼音#汉字）与 words.dat（拼音#地名）。 */

let words: Map<string, string> | null = null
let chars: Map<string, string> | null = null
let loading: Promise<void> | null = null

function base(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

function parse(text: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const hash = line.indexOf('#')
    if (hash <= 0) continue
    const pinyin = line.slice(0, hash)
    const values = line.slice(hash + 1).split('/')
    for (const value of values) {
      const key = value.trim()
      if (key) map.set(key, pinyin)
    }
  }
  return map
}

export async function loadPinyin(): Promise<void> {
  if (chars && words) return
  if (!loading) {
    loading = (async () => {
      const [charsText, wordsText] = await Promise.all([
        fetch(base('data/characters.dat')).then((r) => r.text()),
        fetch(base('data/words.dat')).then((r) => r.text()),
      ])
      chars = parse(charsText)
      words = parse(wordsText)
    })()
  }
  await loading
}

/** 汉字转大写拼音；最多匹配 3 字地名，其次 2 字，最后单字。 */
export function toPinyin(text: string): string {
  if (!chars) return ''
  let out = ''
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === '-' || ch === '—' || ch === '－') {
      out += '-'
      i += 1
      continue
    }
    if (ch === '(' || ch === ')' || ch === '（' || ch === '）') {
      out += ch === '（' ? '(' : ch === '）' ? ')' : ch
      i += 1
      continue
    }
    if (ch === ' ') {
      out += ' '
      i += 1
      continue
    }
    let matched = false
    for (let size = 3; size >= 1; size--) {
      if (i + size > text.length) continue
      const key = text.slice(i, i + size)
      const dictionary = size > 1 ? words : chars
      const value = dictionary?.get(key) ?? chars?.get(key)
      if (value) {
        out += value
        i += size
        matched = true
        break
      }
    }
    if (!matched) {
      // 原 App 字典未收录时不会替换；这里保留原字符并继续。
      out += ch
      i += 1
    }
  }
  return out.toUpperCase()
}

export function isPinyinReady(): boolean {
  return chars !== null && words !== null
}
