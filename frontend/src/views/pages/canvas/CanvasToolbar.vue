<!-- Фрагмент страницы canvas: тулбар с созданием блоков; отмена и повтор пока недоступны (5.3) -->
<template>
  <div class="canvas-toolbar" role="group" aria-label="Инструменты">
    <UiButton size="l" icon="flex" hint="F" keyshortcuts="F" @click="createBlock('flex')">Flex</UiButton>
    <UiButton size="l" icon="grid" hint="G" keyshortcuts="G" @click="createBlock('grid')">Grid</UiButton>
    <span class="canvas-toolbar__divider"></span>
    <UiIconButton size="l" icon="undo" label="Отменить" disabled :title="HISTORY_SOON_HINT" />
    <UiIconButton size="l" icon="redo" label="Повторить" disabled :title="HISTORY_SOON_HINT" />
  </div>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'
import { HISTORY_SOON_HINT } from '@/scripts/pages/canvas/constants'
import { useCanvasCreate } from '@/scripts/pages/canvas/use-canvas-create'

const { createBlock } = useCanvasCreate()
</script>
