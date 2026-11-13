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
        <button class="btn primary" type="button" :disabled="exporting" @click="download">
          {{ exporting ? '导出中…' : '下载' }}
        </button>
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
        @pointerenter="warmPlate(plate)"
        @pointerleave="cancelWarm(plate)"
        @focus="warmPlate(plate)"
        @blur="cancelWarm(plate)"
        @pointerdown="warmPlate(plate, true)"
      >
        <img
          :src="assetUrl(coverThumb(plate.cover))"
          :alt="plate.name"
          class="plate-cover"
          width="132"
          height="52"
          loading="lazy"
          decoding="async"
        />
        <span>{{ plate.name }}</span>
      </button>
      <p v-if="plates.length <= 2" class="tabs-hint">更多样式正在移植中…</p>
    </nav>

    <section class="workspace">
      <div class="preview-panel">
        <div class="preview-frame" :aria-busy="previewPending">
          <canvas ref="canvasRef" class="plate-canvas" />
          <span v-if="previewPending" class="preview-badge" role="status">字体载入中…</span>
        </div>
        <p class="preview-meta">
          {{ current.name }} · 预览 {{ sizeText }} · {{ current.ratio.toFixed(3) }}:1
          <br />
          导出 {{ exportSizeText }} · {{ formatLabel }}
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
      非官方学习交流项目 · 字体与素材版权归原权利人所有 · 详见 NOTICE ·
      <a href="https://github.com/AFewMoon/train-signs" target="_blank" rel="noreferrer">源码</a>
      以
      <a
        href="https://github.com/AFewMoon/train-signs/blob/main/LICENSE"
        target="_blank"
        rel="noreferrer"
      >AGPL-3.0</a>
      授权
    </footer>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>

    <SettingsDialog
      :settings="settings"
      :open="showSettings"
      :ratio="current.ratio"
      @close="showSettings = false"
      @update:settings="applySettings"
    />
    <GalleryDialog :open="showGallery" @close="showGallery = false" />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { PLATES, getPlate } from './plates'
import type { PlateValues } from './core/types'
import type { PlateField, PlateSpec } from './plates/types'
import {
  canvasToBlob,
  downloadBlob,
  exportCanvas,
  paintPlate,
  preparePlate,
  renderPlateCanvas,
  type PreparedPlate,
} from './core/plate-render'
import { buildSvg } from './core/svg'
import { exportSize } from './plates/types'
import { assetUrl, coverThumb } from './core/render'
import { ensureFonts, isFontsReady } from './core/fonts'
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
// 尽早开始加载默认模板字体；不放在 HTML preload 里，避免和入口 JS 抢首屏带宽。
void ensureFonts(current.value.fonts)
// 拼音字典同样不阻塞首屏；开始输入前通常已就绪。
void loadPinyin().catch(() => undefined)
const values = reactive<PlateValues>({ ...current.value.defaults })
const canvasRef = ref<HTMLCanvasElement | null>(null)
const initialSize = exportSize(current.value.ratio, 1370)
const size = reactive({ w: initialSize.width, h: initialSize.height })
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
const exportSizeText = computed(() => {
  const target = exportSize(current.value.ratio, settings.exportWidth)
  return `${target.width} × ${target.height}px`
})

function strValue(key: string): string {
  const value = values[key]
  return typeof value === 'string' ? value : ''
}

const previewPending = ref(false)
const INPUT_DEBOUNCE_MS = 90
const FALLBACK_GRACE_MS = 120
const HOVER_PREFETCH_MS = 120
let renderSeq = 0
let renderTimer: number | undefined
let lastPaint = { specId: '', fallback: false }
const warmTimers = new Map<string, number>()

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function applyPaint(prepared: PreparedPlate, specId: string, fallback: boolean): void {
  const canvas = canvasRef.value
  if (!canvas) return
  paintPlate(canvas, prepared)
  size.w = prepared.width
  size.h = prepared.height
  lastPaint = { specId, fallback }
  if (!fallback) previewPending.value = false
}

/**
 * 渐进预览：
 * 1. 先同步布局并启动字体/图片加载；
 * 2. 字体未就绪时最多等 FALLBACK_GRACE_MS，然后先用系统字体画占位；
 * 3. 字体与图片就绪后重排重绘，换成设计字体。
 * 每次 await 后校验 token，保证只有最后一次操作能落笔。
 */
async function runPreview(id: number): Promise<void> {
  const canvas = canvasRef.value
  if (!canvas) return
  const spec = current.value
  const snapshot = { ...values }
  const options = { spaceStyle: settings.spaceStyle }
  const started = performance.now()
  const layout = preparePlate(spec, snapshot, options)
  const fonts = ensureFonts(spec.fonts)

  if (isFontsReady(spec.fonts)) {
    await layout.images
    if (id !== renderSeq) return
    applyPaint(layout, spec.id, false)
    if (import.meta.env.DEV) {
      console.debug(`[preview] ${spec.id} 直接绘制 ${Math.round(performance.now() - started)}ms`)
    }
    return
  }

  previewPending.value = false
  const alreadyFallback = lastPaint.specId === spec.id && lastPaint.fallback
  if (alreadyFallback) {
    previewPending.value = true
    applyPaint(layout, spec.id, true)
  } else {
    const fontsReady = await Promise.race([
      fonts.then(() => true),
      wait(FALLBACK_GRACE_MS).then(() => false),
    ])
    if (id !== renderSeq) return
    if (!fontsReady) {
      previewPending.value = true
      applyPaint(layout, spec.id, true)
      void layout.images
        .then(() => {
          // 路徽就绪后补画一次；字体仍未就绪时文字仍为系统字体占位。
          if (id === renderSeq) applyPaint(layout, spec.id, true)
        })
        .catch(() => undefined)
    }
  }

  await Promise.all([fonts, layout.images])
  if (id !== renderSeq) return
  const final = preparePlate(spec, snapshot, options)
  await final.images
  if (id !== renderSeq) return
  applyPaint(final, spec.id, false)
  if (import.meta.env.DEV) {
    console.debug(`[preview] ${spec.id} 完成 ${Math.round(performance.now() - started)}ms`)
  }
}

/** 合并渲染请求：输入用防抖，切换/设置用 0ms。 */
function schedulePreview(delay = 0): void {
  const id = ++renderSeq
  if (renderTimer !== undefined) {
    window.clearTimeout(renderTimer)
    renderTimer = undefined
  }
  if (delay > 0) {
    renderTimer = window.setTimeout(() => {
      renderTimer = undefined
      startPreview(id)
    }, delay)
  } else {
    startPreview(id)
  }
}

function startPreview(id: number): void {
  void runPreview(id).catch((error) => {
    console.error(error)
    if (id === renderSeq) previewPending.value = false
  })
}

function prefetchAllowed(): boolean {
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }).connection
  if (connection?.saveData) return false
  const type = connection?.effectiveType
  return type !== 'slow-2g' && type !== '2g' && type !== '3g'
}

/** 悬停/聚焦预取模板字体，把“点击后才开始下载”提前。 */
function warmPlate(plate: PlateSpec, immediate = false): void {
  if (plate.id === current.value.id || !prefetchAllowed()) return
  const timer = warmTimers.get(plate.id)
  if (timer !== undefined) {
    window.clearTimeout(timer)
    warmTimers.delete(plate.id)
  }
  if (immediate) {
    void ensureFonts(plate.fonts)
    return
  }
  warmTimers.set(
    plate.id,
    window.setTimeout(() => {
      warmTimers.delete(plate.id)
      void ensureFonts(plate.fonts)
    }, HOVER_PREFETCH_MS),
  )
}

function cancelWarm(plate: PlateSpec): void {
  const timer = warmTimers.get(plate.id)
  if (timer !== undefined) {
    window.clearTimeout(timer)
    warmTimers.delete(plate.id)
  }
}

function selectPlate(id: string): void {
  if (id === current.value.id) return
  current.value = getPlate(id)
  for (const key of Object.keys(values)) delete values[key]
  Object.assign(values, current.value.defaults)
  autoValues.clear()
  schedulePreview(0)
}

function reset(): void {
  for (const key of Object.keys(values)) delete values[key]
  Object.assign(values, current.value.defaults)
  autoValues.clear()
  schedulePreview(0)
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
  schedulePreview(INPUT_DEBOUNCE_MS)
}

function onSelect(field: PlateField, event: Event): void {
  values[field.key] = (event.target as HTMLSelectElement).value
  schedulePreview(0)
}

function onCheckbox(field: PlateField, event: Event): void {
  values[field.key] = (event.target as HTMLInputElement).checked
  schedulePreview(0)
}

function autoPinyin(field: PlateField): void {
  if (!field.pinyinOf) return
  const generated = toPinyin(strValue(field.pinyinOf))
  values[field.key] = generated
  autoValues.set(field.key, generated)
  schedulePreview(0)
}

function applySettings(next: Settings): void {
  const spaceChanged = next.spaceStyle !== settings.spaceStyle
  settings.spaceStyle = next.spaceStyle
  settings.format = next.format
  settings.exportWidth = next.exportWidth
  // 格式/导出宽度只影响导出与元信息，不需要重绘画布。
  if (spaceChanged) schedulePreview(0)
}

const exporting = ref(false)
const formatLabel = computed(() =>
  settings.format === 'svg' ? 'SVG' : settings.format === 'jpeg' ? 'JPEG' : 'PNG',
)

async function saveToGallery(canvas: HTMLCanvasElement, width: number, height: number): Promise<void> {
  const blob = await canvasToBlob(canvas, 'png')
  if (!blob) return
  await addGalleryItem({
    name: `水牌_${formatTimestamp()}`,
    plateName: current.value.name,
    width,
    height,
    blob,
  })
}

async function download(): Promise<void> {
  if (exporting.value) return
  for (const field of current.value.fields) {
    if (field.required && !strValue(field.key).trim()) {
      showToast(`请输入${field.label}`)
      return
    }
  }
  exporting.value = true
  try {
    const snapshot = { ...values }
    const target = exportSize(current.value.ratio, settings.exportWidth)
    const car = strValue('carNumber')
    const safeName = current.value.name.replace(/[\\/:*?"<>|]/g, '_')
    const name = `水牌_${safeName}${car ? `_${car}` : ''}_${target.width}x${target.height}`
    const options = { spaceStyle: settings.spaceStyle, widthPx: target.width }

    if (settings.format === 'svg') {
      const { svg } = await buildSvg(current.value, snapshot, options)
      downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${name}.svg`)
      const { canvas, width, height } = await renderPlateCanvas(current.value, snapshot, options)
      await saveToGallery(canvas, width, height)
      showToast('SVG 已生成，PNG 已存入图库')
    } else {
      const { canvas, width, height } = await renderPlateCanvas(current.value, snapshot, options)
      exportCanvas(canvas, settings.format, name)
      await saveToGallery(canvas, width, height)
      showToast('图片已生成，可下载或在图库中查看')
    }
  } catch (error) {
    console.error(error)
    showToast(`导出失败：${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    exporting.value = false
  }
}

watch(settings, (next) => {
  saveSettings({ ...next })
})

onMounted(() => {
  schedulePreview(0)
})
</script>
