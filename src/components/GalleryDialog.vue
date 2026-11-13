<template>
  <Teleport to="body">
    <div v-if="open" class="modal-mask" @click.self="emit('close')">
      <section class="modal" role="dialog" aria-modal="true" aria-label="我的水牌图库">
        <header class="modal-head">
          <h2>我的水牌图库</h2>
          <button class="modal-close" type="button" aria-label="关闭" @click="emit('close')">×</button>
        </header>
        <p v-if="loading" class="modal-empty">正在加载…</p>
        <p v-else-if="items.length === 0" class="modal-empty">还没有生成过水牌图片。</p>
        <ul v-else class="gallery-grid">
          <li v-for="item in items" :key="item.id" class="gallery-item">
            <img :src="urls.get(item.id)" :alt="item.name" class="gallery-thumb" />
            <div class="gallery-meta">
              <strong>{{ item.plateName }}</strong>
              <span>{{ item.width }} × {{ item.height }} · {{ formatDate(item.createdAt) }}</span>
            </div>
            <div class="gallery-actions">
              <button class="btn ghost small" type="button" @click="download(item)">下载</button>
              <button class="btn danger small" type="button" @click="remove(item)">删除</button>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { GalleryItem } from '../core/storage'
import { deleteGalleryItem, listGalleryItems } from '../core/storage'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const items = ref<GalleryItem[]>([])
const urls = reactive(new Map<string, string>())
const loading = ref(false)

function formatDate(value: number): string {
  const date = new Date(value)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function clearUrls(): void {
  for (const url of urls.values()) URL.revokeObjectURL(url)
  urls.clear()
}

async function load(): Promise<void> {
  loading.value = true
  clearUrls()
  items.value = await listGalleryItems()
  for (const item of items.value) urls.set(item.id, URL.createObjectURL(item.blob))
  loading.value = false
}

async function download(item: GalleryItem): Promise<void> {
  const url = URL.createObjectURL(item.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${item.name}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function remove(item: GalleryItem): Promise<void> {
  await deleteGalleryItem(item.id)
  const url = urls.get(item.id)
  if (url) URL.revokeObjectURL(url)
  urls.delete(item.id)
  items.value = items.value.filter((entry) => entry.id !== item.id)
}

watch(
  () => props.open,
  (open) => {
    if (open) void load()
    else clearUrls()
  },
)
</script>
