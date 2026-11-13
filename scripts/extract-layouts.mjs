// 从 jadx 解码后的资源中提取各水牌预览布局，生成 Web 端可用的布局 JSON。
// 运行前提：analysis/jadx 已由 jadx 生成（见 docs/re/README.md）。
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { XMLParser } from 'fast-xml-parser'

const SRC = 'analysis/jadx/resources/res'
const OUT = 'src/plates/layouts'
const PUBLIC = 'public'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  trimValues: true,
})

function parseValues(file) {
  const xml = readFileSync(join(SRC, 'values', file), 'utf8')
  const map = new Map()
  for (const m of xml.matchAll(/<(color|string|dimen|bool|integer)\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)) {
    map.set(`${m[1]}:${m[2]}`, m[3].trim())
  }
  return map
}

const colors = parseValues('colors.xml')
const strings = parseValues('strings.xml')
const dimen = parseValues('dimens.xml')

function resolveRef(value, kind = '') {
  if (typeof value !== 'string') return value
  if (value === '@android:color/white') return '#ffffff'
  if (value === '@android:color/black') return '#000000'
  if (value.startsWith('@color/')) {
    const key = `color:${value.slice(7)}`
    const v = colors.get(key)
    if (v === undefined) throw new Error(`missing color ${value}`)
    return v.startsWith('@color/') ? colors.get(`color:${v.slice(7)}`) : v
  }
  if (value.startsWith('@string/')) {
    const key = `string:${value.slice(8)}`
    const v = strings.get(key)
    if (v === undefined) throw new Error(`missing string ${value}`)
    return v
  }
  if (value.startsWith('@dimen/')) {
    const v = dimen.get(`dimen:${value.slice(7)}`)
    if (v === undefined) throw new Error(`missing dimen ${value}`)
    return v
  }
  if (/^#[0-9a-fA-F]{6,8}$/.test(value)) return value
  if (value.startsWith('@mipmap/')) {
    const name = value.slice(8)
    return `icons/railway/${name}.png`
  }
  if (value.startsWith('@drawable/')) {
    const name = value.slice(10)
    if (name === 'bg_plate') return 'border'
    return `images/${name}`
  }
  return value
}

function normalizeNode(tag, node) {
  const attrs = {}
  const children = []
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string' || typeof value === 'number') {
      attrs[key] = value
    } else if (key !== '?xml') {
      const list = Array.isArray(value) ? value : [value]
      for (const item of list) {
        if (item && typeof item === 'object') children.push(normalizeNode(key, item))
      }
    }
  }
  for (const key of Object.keys(attrs)) {
    if (key === 'android:background' || key === 'android:textColor' || key === 'android:src') {
      attrs[key] = resolveRef(attrs[key])
    } else if (key === 'android:text') {
      attrs[key] = resolveRef(attrs[key])
    }
  }
  if (attrs['android:id']) attrs['android:id'] = attrs['android:id'].replace('@+id/', '').replace('@id/', '')
  return { tag, attrs, children }
}

function findPreview(node, depth = 0) {
  if (!node) return null
  if (node.attrs['android:id'] && ['rl_plate', 'll_plate', 'rl_plate_main', 'll_plate_main'].includes(node.attrs['android:id'])) {
    return node
  }
  for (const child of node.children) {
    const found = findPreview(child, depth + 1)
    if (found) return found
  }
  return null
}

mkdirSync(OUT, { recursive: true })
mkdirSync(join(PUBLIC, 'icons', 'railway'), { recursive: true })
mkdirSync(join(PUBLIC, 'covers'), { recursive: true })

const layoutDir = join(SRC, 'layout')
const summary = []
for (const file of readdirSync(layoutDir).filter((f) => /^activity_plate_\d\.xml$/.test(f))) {
  const doc = parser.parse(readFileSync(join(layoutDir, file), 'utf8'))
  const root = normalizeNode('root', doc)
  const preview = findPreview(root)
  if (!preview) {
    console.log(`${file}: 未找到预览容器，跳过`)
    continue
  }
  const plate = file.match(/plate_(\d)/)[1]
  writeFileSync(join(OUT, `plate${plate}.json`), JSON.stringify(preview, null, 2) + '\n')
  summary.push(`${file} -> plate${plate}.json (${preview.tag})`)
}

// 路徽与预览配图
for (const file of readdirSync(join(SRC, 'mipmap-nodpi'))) {
  if (/^ic_plate_\d+\.png$/.test(file)) {
    copyFileSync(join(SRC, 'mipmap-nodpi', file), join(PUBLIC, 'icons', 'railway', file))
  }
  if (/^bg_plate_\d+\.png$/.test(file)) {
    copyFileSync(join(SRC, 'mipmap-nodpi', file), join(PUBLIC, 'covers', file))
  }
}

writeFileSync(join(OUT, 'index.json'), JSON.stringify(summary, null, 2) + '\n')
console.log(summary.join('\n'))
