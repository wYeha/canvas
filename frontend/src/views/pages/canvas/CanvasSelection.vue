<!-- Фрагмент страницы canvas: оверлей выделения, наведения, контуров предков и затемнения фокуса в экранных координатах поверх слоя мира -->
<template>
  <div ref="overlayEl" class="canvas-selection">
    <div v-for="box in boxes" :key="box.key" :class="box.classes" :style="box.style">
      <span v-if="box.badge !== ''" :class="box.badgeClasses">{{ box.badge }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCanvasSelection } from '@/scripts/pages/canvas/use-canvas-selection'

const { overlayEl, boxes } = useCanvasSelection()
</script>
