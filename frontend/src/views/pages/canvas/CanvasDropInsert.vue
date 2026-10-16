<!-- Фрагмент страницы canvas: линия вставки при перетаскивании блока (экранные координаты, без hit-test) -->
<template>
  <div ref="overlayEl" class="canvas-drop-insert-layer" aria-hidden="true">
    <div v-if="view !== null" :class="view.classes" :style="view.style" />
  </div>
</template>

<script setup lang="ts">
import { useCanvasDropInsert } from '@/scripts/pages/canvas/use-canvas-drop-insert'

const { overlayEl, view } = useCanvasDropInsert()
</script>
