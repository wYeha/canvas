<!-- Фрагмент страницы canvas: панель «Слои» — корневые блоки верхним уровнем, внутри рекурсивные деревья -->
<template>
  <UiPanel class="canvas-layers" title="Слои">
    <ul v-if="roots.length > 0" class="canvas-layers__list" :aria-label="listLabel">
      <CanvasLayerItem v-for="root in roots" :key="root.node.id" :node="root.node" :depth="0" />
    </ul>
    <UiEmptyState v-else :text="emptyText" />
  </UiPanel>
</template>

<script setup lang="ts">
import CanvasLayerItem from '@/views/pages/canvas/CanvasLayerItem.vue'
import UiEmptyState from '@/views/components/ui-empty-state/UiEmptyState.vue'
import UiPanel from '@/views/components/ui-panel/UiPanel.vue'
import { useCanvasLayers } from '@/scripts/pages/canvas/use-canvas-layers'

const { roots, emptyText, listLabel } = useCanvasLayers()
</script>
