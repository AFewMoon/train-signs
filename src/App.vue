<template>
  <main class="app-shell">
    <header class="app-header">
      <div>
        <h1>列车水牌制作 · Web 版</h1>
        <p class="subtitle">基于原 Android v9.5 复刻的静态水牌生成器</p>
      </div>
      <div class="header-actions">
        <button class="btn ghost" type="button" @click="reset">重置</button>
        <button class="btn primary" type="button" @click="download">下载图片</button>
      </div>
    </header>

    <nav class="plate-tabs" aria-label="水牌样式">
      <button
        v-for="plate in plates"
        :key="plate.id"
        type="button"
        class="plate-tab"
        :class="{ active: plate.id === current.id }"
        @click="selectPlate(plate.id)"
      >
        {{ plate.name }}
      </button>
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
        <h2>{{ current.name }}</h2>
        <label v-for="field in current.fields" :key="field.key" class="field">
          <span class="field-label">{{ field.label }}</span>
          <select
            v-if="field.kind === 'select'"
            v-model="values[field.key]"
            class="control"
            @change="render"
          >
            <option v-for="option in field.options" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <input
            v-else
            v-model="values[field.key]"
            class="control"
            type="text"
            :maxlength="field.maxLength"
            :placeholder="field.placeholder"
            @input="render"
          />
          <span v-if="field.maxLength" class="field-count">
            {{ String(values[field.key] ?? '').length }} / {{ field.maxLength }}
          </span>
        </label>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { PLATES, getPlate } from './plates'
import type { PlateValues } from './core/types'
import { drawPlate, exportCanvas } from './core/plate-render'

const plates = PLATES
const current = ref(getPlate(PLATES[0].id))
const values = reactive<PlateValues>({ ...current.value.defaults })
const canvasRef = ref<HTMLCanvasElement | null>(null)
const size = reactive({ w: 0, h: 0 })

const sizeText = computed(() => (size.w ? `${size.w} × ${size.h}px` : ''))

async function render(): Promise<void> {
  await nextTick()
  const canvas = canvasRef.value
  if (!canvas) return
  const result = await drawPlate(current.value, values, canvas)
  size.w = result.width
  size.h = result.height
}

function selectPlate(id: string): void {
  current.value = getPlate(id)
  for (const key of Object.keys(values)) delete values[key]
  Object.assign(values, current.value.defaults)
  void render()
}

function reset(): void {
  for (const key of Object.keys(values)) delete values[key]
  Object.assign(values, current.value.defaults)
  void render()
}

function download(): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const car = String(values.carNumber ?? '')
  const name = `水牌_${current.value.name}${car ? `_${car}` : ''}`
  exportCanvas(canvas, 'png', name)
}

watch(current, () => void render())
onMounted(() => void render())
</script>
