<!--
  Фрагмент страницы canvas: секция «Связь» панели свойств — имя корня-источника, переход к нему,
  ширины «источник / место» и «Подогнать»
-->
<template>
  <div v-if="source !== null" class="canvas-props-link">
    <p class="canvas-props-link__source">
      <span class="canvas-props-link__label">{{ LINK_SOURCE_LABEL }}</span>
      <span class="canvas-props-link__name">{{ source }}</span>
    </p>
    <UiButton class="canvas-props-link__go" icon="arrow-right" @click="goToSource">
      {{ LINK_GO_TO_SOURCE_LABEL }}
    </UiButton>
    <div v-if="widths !== null" class="canvas-props-link__widths">
      <p class="canvas-props-link__row">
        <span class="canvas-props-link__label">{{ LINK_WIDTH_LABEL }}</span>
        <span class="canvas-props-link__value">{{ widths.text }}</span>
      </p>
      <UiButton :disabled="widths.fitTo === null" :title="fitTitle" @click="fitSource">
        {{ LINK_FIT_LABEL }}
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import {
  LINK_FIT_LABEL,
  LINK_GO_TO_SOURCE_LABEL,
  LINK_SOURCE_LABEL,
  LINK_WIDTH_LABEL,
} from '@/scripts/pages/canvas/constants'
import { useCanvasPropsLink } from '@/scripts/pages/canvas/use-canvas-props-link'

const { source, goToSource, widths, fitSource, fitTitle } = useCanvasPropsLink()
</script>
