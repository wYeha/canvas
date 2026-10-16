<!-- Фрагмент страницы canvas: призрак перетаскиваемого блока за курсором (наклонённая копия с тенью, экранные координаты) -->
<template>
  <div v-if="ghost !== null" :class="ghost.classes" :style="style" aria-hidden="true">
    <span class="canvas-drag-ghost__label">
      <span v-if="ghost.icon !== ''" class="canvas-drag-ghost__icon">{{ ghost.icon }}</span>
      <span class="canvas-drag-ghost__text">{{ ghost.text }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { useCanvasDragGhost } from '@/scripts/pages/canvas/use-canvas-drag-ghost'

const { ghost, style } = useCanvasDragGhost()
</script>
