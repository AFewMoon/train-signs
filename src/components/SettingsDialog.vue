<template>
  <Teleport to="body">
    <div v-if="open" class="modal-mask" @click.self="emit('close')">
      <section class="modal modal-narrow" role="dialog" aria-modal="true" aria-label="设置">
        <header class="modal-head">
          <h2>功能 / 设置</h2>
          <button class="modal-close" type="button" aria-label="关闭" @click="emit('close')">×</button>
        </header>

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
        </fieldset>

        <p class="setting-note">设置会保存在当前浏览器中。</p>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ImageFormat, Settings, SpaceStyle } from '../core/storage'

const props = defineProps<{ open: boolean; settings: Settings }>()
const emit = defineEmits<{ close: []; 'update:settings': [Settings] }>()

const spaceOptions: Array<{ label: string; value: SpaceStyle }> = [
  { label: '1/4 空格（默认）', value: 0 },
  { label: '1/5 空格', value: 1 },
  { label: '1/2 空格', value: 2 },
]

const formatOptions: Array<{ label: string; value: ImageFormat }> = [
  { label: 'PNG（无损，推荐）', value: 'png' },
  { label: 'JPEG（体积更小）', value: 'jpeg' },
]

function setSpaceStyle(value: SpaceStyle): void {
  emit('update:settings', { ...props.settings, spaceStyle: value })
}

function setFormat(value: ImageFormat): void {
  emit('update:settings', { ...props.settings, format: value })
}
</script>
