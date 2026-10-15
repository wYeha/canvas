<!-- Фрагмент страницы canvas: хедер с логотипом, документом, статусом, темой и экспортом -->
<template>
  <header class="canvas-header">
    <div class="canvas-header__group">
      <svg class="canvas-header__logo" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <rect x="2" y="2" width="16" height="16" rx="4" />
        <path d="M2 9h16M9 9v9" />
      </svg>
      <h1 class="canvas-header__name">Layout Canvas</h1>
      <CanvasDocsMenu />
    </div>
    <div class="canvas-header__group">
      <span class="canvas-header__status" role="status">
        <span class="canvas-header__status-dot" :class="statusDotClass"></span>
        {{ statusLabel }}
      </span>
      <UiIconButton :icon="themeIcon" :label="themeLabel" @click="toggleTheme" />
      <UiButton variant="primary" :keyshortcuts="EXPORT_KEYSHORTCUTS" :hint="EXPORT_HINT" @click="emit('export')">
        Экспорт
      </UiButton>
    </div>
  </header>
</template>

<script setup lang="ts">
import CanvasDocsMenu from '@/views/pages/canvas/CanvasDocsMenu.vue'
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'
import type { CanvasHeaderEmits } from '@/scripts/pages/canvas/canvas-header.types'
import { EXPORT_HINT, EXPORT_KEYSHORTCUTS } from '@/scripts/pages/canvas/constants'
import { useCanvasHeader } from '@/scripts/pages/canvas/use-canvas-header'

const emit = defineEmits<CanvasHeaderEmits>()
const { themeIcon, themeLabel, toggleTheme, statusLabel, statusDotClass } = useCanvasHeader()
</script>
