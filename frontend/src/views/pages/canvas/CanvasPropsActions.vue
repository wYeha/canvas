<!-- Фрагмент страницы canvas: действия над выделенным блоком в футере панели свойств (выше, ниже, дублировать, на канвас, удалить) -->
<template>
  <div class="canvas-props-actions" role="group" :aria-label="NODE_ACTIONS_LABEL">
    <UiButton
      v-for="button in buttons"
      :key="button.id"
      class="canvas-props-actions__button"
      :variant="button.variant"
      :icon="button.icon"
      :disabled="button.disabled"
      :title="button.title"
      @click="run(button.id)"
    >
      {{ button.label }}
    </UiButton>
  </div>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import { NODE_ACTIONS_LABEL } from '@/scripts/pages/canvas/constants'
import { useCanvasPropsActions } from '@/scripts/pages/canvas/use-canvas-props-actions'

const { buttons, run } = useCanvasPropsActions()
</script>
