<template>
  <Teleport to="body">
    <div v-if="open" class="modal-mask" @click.self="emit('close')">
      <section class="modal modal-narrow" role="dialog" aria-modal="true" aria-label="设置">
        <header class="modal-head">
          <h2>功能 / 设置</h2>
          <button class="modal-close" type="button" aria-label="关闭" @click="emit('close')">×</button>
        </header>

        <fieldset class="setting-group">
          <legend>导出分辨率</legend>
          <p class="setting-hint">
            高度按当前水牌比例自动计算。宽度范围 {{ MIN_EXPORT_WIDTH }}–{{ MAX_EXPORT_WIDTH }}px，画布面积不超过 1600 万像素。
          </p>
          <div class="preset-row">
            <button
              v-for="preset in widthPresets"
              :key="preset"
              type="button"
              class="preset-btn"
              :class="{ active: settings.exportWidth === preset }"
              @click="setWidth(preset)"
            >
              {{ preset }}px
            </button>
          </div>
          <label class="setting-row setting-number">
            <span>自定义宽度</span>
            <input
              v-model.number="draftWidth"
              type="number"
              :min="MIN_EXPORT_WIDTH"
              :max="MAX_EXPORT_WIDTH"
              step="10"
              class="control number-input"
              @change="commitWidth"
              @keydown.enter.prevent="commitWidth"
            />
            <span class="setting-suffix">px</span>
          </label>
          <p class="setting-hint size-preview">
            导出尺寸：<strong>{{ computedSize.width }} × {{ computedSize.height }} px</strong>
            <span v-if="computedSize.clamped" class="clamp-note">
              （已按限制调整为 {{ computedSize.reason === 'area' ? '面积上限' : '宽度范围' }}）
            </span>
          </p>
        </fieldset>

        <fieldset class="setting-group">
          <legend>图片格式</legend>
          <label v-for="option in formatOptions" :key="option.value" class="setting-row">
            <input
              :checked="settings.format === option.value"
              type="radio"
              name="image-format"
              @change="setFormat(option.value)"
            />
            <span>{{ option.label }}</span>
          </label>
          <p class="setting-hint">SVG 为真矢量（文字转路径、路徽内嵌），适合印刷与无损放大；生成稍慢。</p>
        </fieldset>

        <fieldset class="setting-group">
          <legend>空格样式</legend>
          <p class="setting-hint">不同空格宽度会改变拼音栏与车次的压缩比例，默认使用 1/4 空格。</p>
          <label v-for="option in spaceOptions" :key="option.value" class="setting-row">
            <input
              :checked="settings.spaceStyle === option.value"
              type="radio"
              name="space-style"
              @change="setSpaceStyle(option.value)"
            />
            <span>{{ option.label }}</span>
          </label>
        </fieldset>

        <p class="setting-note">设置会保存在当前浏览器中。</p>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ImageFormat, Settings, SpaceStyle } from '../core/storage'
import { MAX_EXPORT_WIDTH, MIN_EXPORT_WIDTH, exportSize } from '../plates/types'

const props = defineProps<{ open: boolean; settings: Settings; ratio: number }>()
const emit = defineEmits<{ close: []; 'update:settings': [Settings] }>()

const widthPresets = [1370, 1920, 2560, 4096]
const draftWidth = ref(props.settings.exportWidth)
watch(
  () => props.settings.exportWidth,
  (value) => {
    draftWidth.value = value
  },
)

const computedSize = computed(() => exportSize(props.ratio, Number(draftWidth.value)))

const spaceOptions: Array<{ label: string; value: SpaceStyle }> = [
  { label: '1/4 空格（默认）', value: 0 },
  { label: '1/5 空格', value: 1 },
  { label: '1/2 空格', value: 2 },
]

const formatOptions: Array<{ label: string; value: ImageFormat }> = [
  { label: 'PNG（无损，推荐）', value: 'png' },
  { label: 'JPEG（体积更小）', value: 'jpeg' },
  { label: 'SVG（真矢量，适合印刷）', value: 'svg' },
]

function update(next: Partial<Settings>): void {
  emit('update:settings', { ...props.settings, ...next })
}

function setWidth(value: number): void {
  draftWidth.value = value
  update({ exportWidth: exportSize(props.ratio, value).width })
}

function commitWidth(): void {
  const size = exportSize(props.ratio, Number(draftWidth.value))
  draftWidth.value = size.width
  update({ exportWidth: size.width })
}

function setSpaceStyle(value: SpaceStyle): void {
  update({ spaceStyle: value })
}

function setFormat(value: ImageFormat): void {
  update({ format: value })
}
</script>
