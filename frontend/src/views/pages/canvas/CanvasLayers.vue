<!-- Фрагмент страницы canvas: панель «Слои» — корневые блоки верхним уровнем, внутри рекурсивные деревья -->
<template>
  <UiPanel class="canvas-layers" :class="panelClasses" title="Слои">
    <div v-if="roots.length > 0" class="canvas-layers__body">
      <ul ref="listEl" class="canvas-layers__list" :aria-label="listLabel">
        <CanvasLayerItem v-for="root in roots" :key="root.node.id" :node="root.node" :depth="0" />
      </ul>
      <div class="canvas-layers__overlays">
        <CanvasLayersDropLine />
        <CanvasLayersDragGhost />
      </div>
    </div>
    <UiEmptyState v-else :text="emptyText" />
  </UiPanel>
</template>

<script setup lang="ts">
import CanvasLayerItem from '@/views/pages/canvas/CanvasLayerItem.vue'
import CanvasLayersDragGhost from '@/views/pages/canvas/CanvasLayersDragGhost.vue'
import CanvasLayersDropLine from '@/views/pages/canvas/CanvasLayersDropLine.vue'
import UiEmptyState from '@/views/components/ui-empty-state/UiEmptyState.vue'
import UiPanel from '@/views/components/ui-panel/UiPanel.vue'
import { useCanvasLayers } from '@/scripts/pages/canvas/use-canvas-layers'

const { roots, emptyText, listLabel, listEl, panelClasses } = useCanvasLayers()
</script>
