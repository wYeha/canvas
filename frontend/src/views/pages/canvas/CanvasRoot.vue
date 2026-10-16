<!-- Фрагмент страницы canvas: корневой блок на поле с подписью и шириной превью над ним (за заголовок корень двигают по полю) -->
<template>
  <div ref="rootEl" :class="classes" :style="style">
    <div class="canvas-root__header" :data-root-handle-id="root.node.id">
      <span class="canvas-root__title" :data-label-node-id="root.node.id">{{ title }}</span>
      <span class="canvas-root__width">{{ widthText }}</span>
    </div>
    <CanvasNode class="canvas-root__node" :node="root.node" :depth="0" :parent-kind="null" />
  </div>
</template>

<script setup lang="ts">
import type { CanvasRootProps } from '@/scripts/pages/canvas/canvas-node.types'
import { useCanvasRoot } from '@/scripts/pages/canvas/use-canvas-root'
import CanvasNode from '@/views/pages/canvas/CanvasNode.vue'

const props = defineProps<CanvasRootProps>()
const { rootEl, classes, style, title, widthText } = useCanvasRoot(props)
</script>
