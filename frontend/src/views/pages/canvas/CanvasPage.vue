<!-- Оркестратор страницы canvas: собирает хедер и поле с плавающими панелями, подключает хоткеи страницы -->
<template>
  <div class="canvas-page">
    <CanvasHeader />
    <CanvasViewport>
      <CanvasLayers class="canvas-page__layers" />
      <CanvasProps class="canvas-page__props" />
      <CanvasToolbar class="canvas-page__toolbar" />
      <CanvasBreadcrumbs class="canvas-page__breadcrumbs" />
      <CanvasZoom class="canvas-page__zoom" />
    </CanvasViewport>
  </div>
</template>

<script setup lang="ts">
import CanvasBreadcrumbs from '@/views/pages/canvas/CanvasBreadcrumbs.vue'
import CanvasHeader from '@/views/pages/canvas/CanvasHeader.vue'
import CanvasLayers from '@/views/pages/canvas/CanvasLayers.vue'
import CanvasProps from '@/views/pages/canvas/CanvasProps.vue'
import CanvasToolbar from '@/views/pages/canvas/CanvasToolbar.vue'
import CanvasViewport from '@/views/pages/canvas/CanvasViewport.vue'
import CanvasZoom from '@/views/pages/canvas/CanvasZoom.vue'
import { useCanvasHotkeys } from '@/scripts/pages/canvas/use-canvas-hotkeys'

useCanvasHotkeys()
</script>
