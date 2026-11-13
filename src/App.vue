<template>
  <main class="app-shell">
    <header class="app-header">
      <div>
        <h1>列车水牌制作 · Web 版</h1>
        <p class="subtitle">基于原 Android v9.5 复刻的静态水牌生成器</p>
      </div>
      <div class="header-actions">
        <button class="btn ghost" type="button" @click="showSettings = true">设置</button>
        <button class="btn ghost" type="button" @click="showGallery = true">图库</button>
        <button class="btn ghost" type="button" @click="reset">重置</button>
        <button class="btn primary" type="button" @click="download">下载图片</button>
      </div>
    </header>

    <nav class="plate-tabs" aria-label="水牌样式">
      <button
        v-for="plate in plates"
        :key="plate.id"
        type="button"
        class="plate-card"
        :class="{ active: plate.id === current.id }"
        @click="selectPlate(plate.id)"
      >
        <img :src="assetUrl(plate.cover)" :alt="plate.name" class="plate-cover" loading="lazy" />
        <span>{{ plate.name }}</span>
      </button>
      <p v-if="plates.length <= 2" class="tabs-hint">更多样式正在移植中…</p>
    </nav>

    <section class="workspace">
      <div class="preview-panel">
        <div class="preview-frame">
          <canvas ref="canvasRef" class="plate-canvas" />
        </div>
        <p class="preview-meta">
          {{ current.name }} · {{ sizeText }} · {{ current.ratio.toFixed(3) }}:1
        </p>
      </div>

      <form class="form-panel" @submit.prevent>
        <template v-for="(field, index) in current.fields" :key="field.key">
          <h3 v-if="showGroup(index)" class="field-group">{{ field.group }}</h3>
          <label v-if="field.kind === 'checkbox'" class="field field-check">
            <input
              :checked="values[field.key] === true"
              type="checkbox"
              class="checkbox"
              @change="onCheckbox(field, $event)"
            />
            <span>{{ field.label }}</span>
          </label>
          <label v-else class="field">
            <span class="field-label">
              {{ field.label }}
              <button
                v-if="field.pinyinOf"
                type="button"
                class="mini-btn"
                title="按中文站名自动注音"
                @click="autoPinyin(field)"
              >
                自动注音
              </button>
            </span>
            <select
              v-if="field.kind === 'select'"
              :value="String(values[field.key] ?? '')"
              class="control"
              @change="onSelect(field, $event)"
            >
              <option v-for="option in field.options" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <textarea
              v-else-if="field.kind === 'textarea'"
              :value="String(values[field.key] ?? '')"
              class="control"
              :maxlength="field.maxLength"
              :placeholder="field.placeholder"
              rows="2"
              @input="onInput(field, $event)"
            />
            <input
              v-else
              :value="String(values[field.key] ?? '')"
              class="control"
              type="text"
              :inputmode="field.kind === 'number' ? 'numeric' : 'text'"
              :maxlength="field.maxLength"
              :placeholder="field.placeholder"
              @input="onInput(field, $event)"
            />
            <span v-if="field.maxLength" class="field-count">
              {{ String(values[field.key] ?? '').length }} / {{ field.maxLength }}
            </span>
            <span v-if="field.hint" class="field-hint">{{ field.hint }}</span>
          </label>
        </template>
      </form>
    </section>

    <footer class="app-footer">
      非官方学习交流项目 · 字体与素材版权归原权利人所有 · 详见 NOTICE
    </footer>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>

    <SettingsDialog
      v-model:settings="settings"
      :open="showSettings"
      @close="showSettings = false"
      @update:settings="applySettings"
    />
    <GalleryDialog :open="showGallery" @close="showGallery = false" />
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { PLATES, getPlate } from './plates'
import type { PlateValues } from './core/types'
import type { PlateField } from './plates/types'
import { drawPlate, exportCanvas } from './core/plate-render'
import { assetUrl } from './core/render'
import { loadPinyin, toPinyin } from './core/pinyin'
import {
  addGalleryItem,
  formatTimestamp,
  loadSettings,
  saveSettings,
  type Settings,
} from './core/storage'
import SettingsDialog from './components/SettingsDialog.vue'
import GalleryDialog from './components/GalleryDialog.vue'

const plates = PLATES
const current = ref(getPlate(PLATES[0].id))
const values = reactive<PlateValues>({ ...current.value.defaults })
const canvasRef = ref<HTMLCanvasElement | null>(null)
const size = reactive({ w: 0, h: 0 })
const autoValues = new Map<string, string>()
const settings = reactive<Settings>(loadSettings())
const showSettings = ref(false)
const showGallery = ref(false)
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

function showToast(message: string): void {
  toast.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2200)
}

const sizeText = computed(() => (size.w ? `${size.w} × ${size.h}px` : ''))

function strValue(key: string): string {
  const value = values[key]
  return typeof value === 'string' ? value : ''
}

async function render(): Promise<void> {
  await nextTick()
  const canvas = canvasRef.value
  if (!canvas) return
  const result = await drawPlate(current.value, values, canvas, {
    spaceStyle: settings.spaceStyle,
  })
  size.w = result.width
  size.h = result.height
}

function selectPlate(id: string): void {
  current.value = getPlate(id)
  for (const key of Object.keys(values)) delete values[key]
  Object.assign(values, current.value.defaults)
  autoValues.clear()
  void render()
}

function reset(): void {
  for (const key of Object.keys(values)) delete values[key]
  Object.assign(values, current.value.defaults)
  autoValues.clear()
  void render()
}

function showGroup(index: number): boolean {
  const field = current.value.fields[index]
  const prev = current.value.fields[index - 1]
  return Boolean(field.group) && field.group !== prev?.group
}

function onInput(field: PlateField, event: Event): void {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  values[field.key] = target.value
  for (const dependent of current.value.fields) {
    if (dependent.pinyinOf !== field.key) continue
    const currentText = strValue(dependent.key)
    const autoText = autoValues.get(dependent.key)
    if (!currentText || currentText === autoText) {
      const generated = toPinyin(target.value)
      values[dependent.key] = generated
      autoValues.set(dependent.key, generated)
    }
  }
  void render()
}

function onSelect(field: PlateField, event: Event): void {
  values[field.key] = (event.target as HTMLSelectElement).value
  void render()
}

function onCheckbox(field: PlateField, event: Event): void {
  values[field.key] = (event.target as HTMLInputElement).checked
  void render()
}

function autoPinyin(field: PlateField): void {
  if (!field.pinyinOf) return
  const generated = toPinyin(strValue(field.pinyinOf))
  values[field.key] = generated
  autoValues.set(field.key, generated)
  void render()
}

function applySettings(next: Settings): void {
  settings.spaceStyle = next.spaceStyle
  settings.format = next.format
  showSettings.value = false
  void render()
}

async function saveToGallery(): Promise<void> {
  const canvas = canvasRef.value
  if (!canvas || !size.w) return
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return
  const name = `水牌_${formatTimestamp()}`
  await addGalleryItem({
    name,
    plateName: current.value.name,
    width: size.w,
    height: size.h,
    blob,
  })
}

async function download(): Promise<void> {
  const canvas = canvasRef.value
  if (!canvas) return
  for (const field of current.value.fields) {
    if (field.required && !strValue(field.key).trim()) {
      showToast(`请输入${field.label}`)
      return
    }
  }
  const car = strValue('carNumber')
  const name = `水牌_${current.value.name}${car ? `_${car}` : ''}`
  exportCanvas(canvas, settings.format, name)
  await saveToGallery().catch(() => undefined)
  showToast('图片已生成，可下载或在图库中查看')
}

watch(settings, (next) => {
  saveSettings({ ...next })
  void render()
})

onMounted(async () => {
  await loadPinyin().catch(() => undefined)
  void render()
})
</script>
