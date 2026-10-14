<!-- Фрагмент страницы canvas: хедер с логотипом, документом, статусом, темой и экспортом -->
<template>
  <header class="canvas-header">
    <div class="canvas-header__group">
      <svg class="canvas-header__logo" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <rect x="2" y="2" width="16" height="16" rx="4" />
        <path d="M2 9h16M9 9v9" />
      </svg>
      <span class="canvas-header__name">Layout Canvas</span>
      <UiButton variant="ghost" icon-after="chevron-down">Без названия</UiButton>
    </div>
    <div class="canvas-header__group">
      <span class="canvas-header__status">
        <span class="canvas-header__status-dot"></span>
        Сохранено
      </span>
      <UiIconButton :icon="themeIcon" :label="themeLabel" @click="toggleTheme" />
      <UiButton variant="primary">Экспорт</UiButton>
    </div>
  </header>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'
import { useCanvasHeader } from '@/scripts/pages/canvas/use-canvas-header'

const { themeIcon, themeLabel, toggleTheme } = useCanvasHeader()
</script>
