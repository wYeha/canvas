<!-- Фрагмент страницы canvas: мини-карта на мелком масштабе — корни и видимая область, клик показывает место поля -->
<template>
  <svg
    v-if="visible"
    class="canvas-minimap"
    :width="MINIMAP_SIZE.width"
    :height="MINIMAP_SIZE.height"
    role="img"
    :aria-label="MINIMAP_LABEL"
    @click="onClick"
  >
    <title>{{ MINIMAP_LABEL }}</title>
    <rect
      v-for="root in roots"
      :key="root.id"
      class="canvas-minimap__root"
      :x="root.rect.x"
      :y="root.rect.y"
      :width="root.rect.width"
      :height="root.rect.height"
    />
    <rect class="canvas-minimap__view" :x="view.x" :y="view.y" :width="view.width" :height="view.height" />
  </svg>
</template>

<script setup lang="ts">
import { MINIMAP_LABEL, MINIMAP_SIZE } from '@/scripts/pages/canvas/constants'
import { useCanvasMinimap } from '@/scripts/pages/canvas/use-canvas-minimap'

const { visible, roots, view, onClick } = useCanvasMinimap()
</script>
