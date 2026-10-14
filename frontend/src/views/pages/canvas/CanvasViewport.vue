<!--
  Фрагмент страницы canvas: поле с точечным фоном, движущимся вместе с камерой; слой мира (сюда в 1.7 лягут
  корневые блоки) и подсказка; поверх в слоте лежат плавающие панели
-->
<template>
  <main ref="viewportEl" :class="classes" :style="viewportStyle">
    <div ref="worldEl" class="canvas-viewport__world" :style="worldStyle" />
    <p class="canvas-viewport__hint">Нажмите F или G, чтобы создать блок</p>
    <slot />
  </main>
</template>

<script setup lang="ts">
import { useCanvasViewport } from '@/scripts/pages/canvas/use-canvas-viewport'

const { viewportEl, worldEl, classes, viewportStyle, worldStyle } = useCanvasViewport()
</script>
