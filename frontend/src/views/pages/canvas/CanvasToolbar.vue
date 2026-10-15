<!-- Фрагмент страницы canvas: тулбар с созданием блоков, отменой и повтором -->
<template>
  <div class="canvas-toolbar" role="group" aria-label="Инструменты">
    <UiButton size="l" icon="flex" hint="F" keyshortcuts="F" @click="createBlock('flex')">Flex</UiButton>
    <UiButton size="l" icon="grid" hint="G" keyshortcuts="G" @click="createBlock('grid')">Grid</UiButton>
    <span class="canvas-toolbar__divider"></span>
    <UiIconButton size="l" icon="undo" :label="UNDO_LABEL" :disabled="!canUndo" @click="undo" />
    <UiIconButton size="l" icon="redo" :label="REDO_LABEL" :disabled="!canRedo" @click="redo" />
  </div>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'
import { REDO_LABEL, UNDO_LABEL } from '@/scripts/pages/canvas/constants'
import { useCanvasCreate } from '@/scripts/pages/canvas/use-canvas-create'
import { useCanvasHistory } from '@/scripts/pages/canvas/use-canvas-history'

const { createBlock } = useCanvasCreate()
const { canUndo, canRedo, undo, redo } = useCanvasHistory()
</script>
