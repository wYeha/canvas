<!-- Фрагмент страницы canvas: плашка зума — переключатели подписей, зеркала и стрелок связей, уменьшить, процент, увеличить, вписать всё -->
<template>
  <UiPill class="canvas-zoom">
    <UiIconButton
      icon="tag"
      :label="LABELS_TOGGLE_LABEL"
      :tooltip="labelsToggleTitle"
      :pressed="labelsVisible"
      @click="toggleLabels"
    />
    <UiIconButton
      icon="link"
      :label="MIRROR_TOGGLE_LABEL"
      :tooltip="mirrorToggleTitle"
      :pressed="linksMirrored"
      @click="toggleMirror"
    />
    <UiIconButton
      icon="arrows"
      :label="ARROWS_TOGGLE_LABEL"
      :tooltip="arrowsToggleTitle"
      :pressed="linkArrowsAll"
      @click="toggleArrows"
    />
    <UiIconButton icon="minus" label="Уменьшить (Ctrl −)" @click="zoomOut" />
    <span class="canvas-zoom__value">{{ zoomLabel }}</span>
    <UiIconButton icon="plus" label="Увеличить (Ctrl +)" @click="zoomIn" />
    <UiIconButton icon="fit" label="Вписать всё (Shift 1)" @click="fitAll" />
  </UiPill>
</template>

<script setup lang="ts">
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'
import UiPill from '@/views/components/ui-pill/UiPill.vue'
import { ARROWS_TOGGLE_LABEL, LABELS_TOGGLE_LABEL, MIRROR_TOGGLE_LABEL } from '@/scripts/pages/canvas/constants'
import { useCanvasZoom } from '@/scripts/pages/canvas/use-canvas-zoom'

const {
  zoomLabel,
  labelsVisible,
  labelsToggleTitle,
  toggleLabels,
  linksMirrored,
  mirrorToggleTitle,
  toggleMirror,
  linkArrowsAll,
  arrowsToggleTitle,
  toggleArrows,
  zoomIn,
  zoomOut,
  fitAll,
} = useCanvasZoom()
</script>
