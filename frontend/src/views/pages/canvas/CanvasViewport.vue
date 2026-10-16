<!--
  Фрагмент страницы canvas: поле с точечным фоном, движущимся вместе с камерой; слой мира с корневыми блоками,
  оверлей выделения, призрак перетаскивания, поле ввода подписи и подсказка пустого поля; поверх в слоте лежат плавающие панели
-->
<template>
  <main ref="viewportEl" :class="classes" :style="viewportStyle">
    <div ref="worldEl" :class="worldClasses" data-canvas-world :style="worldStyle">
      <CanvasRoot v-for="root in roots" :key="root.node.id" :root="root" />
    </div>
    <CanvasSelection />
    <CanvasDragGhost />
    <CanvasLabelEditor />
    <p v-if="isEmpty" class="canvas-viewport__hint">Нажмите F или G, чтобы создать блок</p>
    <slot />
  </main>
</template>

<script setup lang="ts">
import CanvasDragGhost from '@/views/pages/canvas/CanvasDragGhost.vue'
import CanvasLabelEditor from '@/views/pages/canvas/CanvasLabelEditor.vue'
import CanvasSelection from '@/views/pages/canvas/CanvasSelection.vue'
import CanvasRoot from '@/views/pages/canvas/CanvasRoot.vue'
import { useCanvasRoots } from '@/scripts/pages/canvas/use-canvas-roots'
import { useCanvasViewport } from '@/scripts/pages/canvas/use-canvas-viewport'

const { viewportEl, worldEl, classes, worldClasses, viewportStyle, worldStyle } = useCanvasViewport()
const { roots, isEmpty } = useCanvasRoots()
</script>
