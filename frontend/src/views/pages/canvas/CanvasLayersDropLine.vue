<!-- Фрагмент страницы canvas: линия вставки при перетаскивании в «Слоях» -->
<template>
  <div ref="overlayEl" class="canvas-layers-drop-line-layer" aria-hidden="true">
    <div v-if="view !== null" :class="view.classes" :style="view.style" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCanvasLayersDropLine } from '@/scripts/pages/canvas/use-canvas-layers-drop-line'

const overlayEl = ref<HTMLElement | null>(null)
const { view } = useCanvasLayersDropLine(overlayEl)
</script>
