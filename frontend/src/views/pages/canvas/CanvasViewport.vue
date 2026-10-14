<!--
  Фрагмент страницы canvas: поле с точечным фоном, движущимся вместе с камерой; слой мира с корневыми блоками,
  оверлей выделения и подсказка пустого поля; поверх в слоте лежат плавающие панели
-->
<template>
  <main ref="viewportEl" :class="classes" :style="viewportStyle">
    <div ref="worldEl" class="canvas-viewport__world" data-canvas-world :style="worldStyle">
      <CanvasRoot v-for="root in roots" :key="root.node.id" :root="root" />
    </div>
    <CanvasSelection />
    <p v-if="isEmpty" class="canvas-viewport__hint">Нажмите F или G, чтобы создать блок</p>
    <slot />
  </main>
</template>

<script setup lang="ts">
import CanvasSelection from '@/views/pages/canvas/CanvasSelection.vue'
import CanvasRoot from '@/views/pages/canvas/CanvasRoot.vue'
import { useCanvasRoots } from '@/scripts/pages/canvas/use-canvas-roots'
import { useCanvasViewport } from '@/scripts/pages/canvas/use-canvas-viewport'

const { viewportEl, worldEl, classes, viewportStyle, worldStyle } = useCanvasViewport()
const { roots, isEmpty } = useCanvasRoots()
</script>
