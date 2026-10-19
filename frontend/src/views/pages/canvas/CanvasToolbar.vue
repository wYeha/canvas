<!-- Фрагмент страницы canvas: тулбар с созданием блоков, отменой и повтором -->
<template>
  <div class="canvas-toolbar" role="group" aria-label="Инструменты">
    <UiButton size="l" icon="flex" hint="F" keyshortcuts="F" @click="createBlock('flex')">Flex</UiButton>
    <UiButton size="l" icon="grid" hint="G" keyshortcuts="G" @click="createBlock('grid')">Grid</UiButton>
    <UiDropdown :label="TEMPLATES_LABEL" :items="items" @select="insertTemplate">
      <template #trigger="{ attrs }">
        <UiButton v-bind="attrs" size="l" icon="template" icon-after="chevron-down">{{ TEMPLATES_LABEL }}</UiButton>
      </template>
    </UiDropdown>
    <span class="canvas-toolbar__divider"></span>
    <UiIconButton size="l" icon="undo" :label="UNDO_LABEL" :disabled="!canUndo" @click="undo" />
    <UiIconButton size="l" icon="redo" :label="REDO_LABEL" :disabled="!canRedo" @click="redo" />
  </div>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiDropdown from '@/views/components/ui-dropdown/UiDropdown.vue'
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'
import { REDO_LABEL, TEMPLATES_LABEL, UNDO_LABEL } from '@/scripts/pages/canvas/constants'
import { useCanvasCreate } from '@/scripts/pages/canvas/use-canvas-create'
import { useCanvasHistory } from '@/scripts/pages/canvas/use-canvas-history'
import { useCanvasTemplates } from '@/scripts/pages/canvas/use-canvas-templates'

const { createBlock } = useCanvasCreate()
const { items, insertTemplate } = useCanvasTemplates()
const { canUndo, canRedo, undo, redo } = useCanvasHistory()
</script>
