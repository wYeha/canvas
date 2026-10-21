<!-- Оркестратор страницы canvas: собирает хедер и поле с плавающими панелями, подключает хоткеи страницы, окна экспорта и горячих клавиш и тосты -->
<template>
  <div class="canvas-page">
    <CanvasHeader @export="openExport" @hotkeys="openHotkeys" />
    <CanvasViewport>
      <CanvasLayers class="canvas-page__layers" />
      <CanvasProps class="canvas-page__props" />
      <CanvasToolbar class="canvas-page__toolbar" />
      <CanvasBreadcrumbs class="canvas-page__breadcrumbs" />
      <CanvasZoom class="canvas-page__zoom" />
      <CanvasMinimap class="canvas-page__minimap" />
    </CanvasViewport>
    <ExportModal v-model:open="exportOpen" />
    <HotkeysModal v-model:open="hotkeysOpen" />
    <CanvasToast />
  </div>
</template>

<script setup lang="ts">
import CanvasBreadcrumbs from '@/views/pages/canvas/CanvasBreadcrumbs.vue'
import CanvasHeader from '@/views/pages/canvas/CanvasHeader.vue'
import CanvasLayers from '@/views/pages/canvas/CanvasLayers.vue'
import CanvasMinimap from '@/views/pages/canvas/CanvasMinimap.vue'
import CanvasProps from '@/views/pages/canvas/CanvasProps.vue'
import CanvasToolbar from '@/views/pages/canvas/CanvasToolbar.vue'
import CanvasToast from '@/views/pages/canvas/CanvasToast.vue'
import CanvasViewport from '@/views/pages/canvas/CanvasViewport.vue'
import CanvasZoom from '@/views/pages/canvas/CanvasZoom.vue'
import ExportModal from '@/views/modals/export-modal/ExportModal.vue'
import HotkeysModal from '@/views/modals/hotkeys-modal/HotkeysModal.vue'
import { useCanvasHotkeys } from '@/scripts/pages/canvas/use-canvas-hotkeys'
import { useCanvasDocuments } from '@/scripts/pages/canvas/use-canvas-documents'
import { useCanvasPage } from '@/scripts/pages/canvas/use-canvas-page'

// Пока открыто окно (экспорт, горячие клавиши), хоткеи канваса не срабатывают (Esc закрывает окно, а не поднимает выделение)
const { exportOpen, openExport, hotkeysOpen, openHotkeys, isBlocked } = useCanvasPage()
useCanvasHotkeys({ openExport, openHotkeys, isBlocked })
useCanvasDocuments()
</script>
