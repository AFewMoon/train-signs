import { del, get, keys, set } from 'idb-keyval'

export type SpaceStyle = 0 | 1 | 2
export type ImageFormat = 'png' | 'jpeg'

export interface Settings {
  spaceStyle: SpaceStyle
  format: ImageFormat
}

const SETTINGS_KEY = 'train-signs:settings'

export function loadSettings(): Settings {
  const fallback: Settings = { spaceStyle: 0, format: 'png' }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      spaceStyle: parsed.spaceStyle === 1 || parsed.spaceStyle === 2 ? parsed.spaceStyle : 0,
      format: parsed.format === 'jpeg' ? 'jpeg' : 'png',
    }
  } catch {
    return fallback
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // 隐私模式下写入失败时忽略。
  }
}

export interface GalleryItem {
  id: string
  name: string
  plateName: string
  width: number
  height: number
  createdAt: number
  blob: Blob
}

const GALLERY_PREFIX = 'plate-image:'

export async function addGalleryItem(item: Omit<GalleryItem, 'id' | 'createdAt'>): Promise<GalleryItem> {
  const entry: GalleryItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  }
  await set(GALLERY_PREFIX + entry.id, entry)
  return entry
}

export async function listGalleryItems(): Promise<GalleryItem[]> {
  try {
    const allKeys = await keys()
    const ids = allKeys
      .filter((key): key is string => typeof key === 'string' && key.startsWith(GALLERY_PREFIX))
      .sort()
      .reverse()
    const items = await Promise.all(ids.map((key) => get<GalleryItem>(key)))
    return items.filter((item): item is GalleryItem => Boolean(item))
  } catch {
    return []
  }
}

export async function deleteGalleryItem(id: string): Promise<void> {
  await del(GALLERY_PREFIX + id)
}

export function formatTimestamp(date = new Date()): string {
  const pad = (value: number, size = 2): string => String(value).padStart(size, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(
    date.getMinutes(),
  )}${pad(date.getSeconds())}${pad(date.getMilliseconds(), 3)}`
}
