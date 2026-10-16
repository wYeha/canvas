<!-- Фрагмент страницы canvas: призрак перетаскиваемой строки в «Слоях» -->
<template>
  <div ref="overlayEl" class="canvas-layers-drag-ghost-layer" aria-hidden="true">
    <div v-if="ghost !== null" :class="ghost.classes" :style="ghost.style">
      <UiIcon :name="ghost.icon" class="canvas-layers-drag-ghost__icon" />
      <span class="canvas-layers-drag-ghost__label">{{ ghost.caption }}</span>
      <span class="canvas-layers-drag-ghost__type">{{ ghost.type }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UiIcon from '@/views/components/ui-icon/UiIcon.vue'
import { useCanvasLayersDragGhost } from '@/scripts/pages/canvas/use-canvas-layers-drag-ghost'

const overlayEl = ref<HTMLElement | null>(null)
const { ghost } = useCanvasLayersDragGhost(overlayEl)
</script>
