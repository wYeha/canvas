<!-- Фрагмент страницы canvas: секция «Связь» панели свойств — имя корня-источника и переход к нему -->
<template>
  <div v-if="source !== null" class="canvas-props-link">
    <p class="canvas-props-link__source">
      <span class="canvas-props-link__label">{{ LINK_SOURCE_LABEL }}</span>
      <span class="canvas-props-link__name">{{ source }}</span>
    </p>
    <UiButton class="canvas-props-link__go" icon="arrow-right" @click="goToSource">
      {{ LINK_GO_TO_SOURCE_LABEL }}
    </UiButton>
  </div>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import { LINK_GO_TO_SOURCE_LABEL, LINK_SOURCE_LABEL } from '@/scripts/pages/canvas/constants'
import { useCanvasPropsLink } from '@/scripts/pages/canvas/use-canvas-props-link'

const { source, goToSource } = useCanvasPropsLink()
</script>
