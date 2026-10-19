<!-- Фрагмент страницы canvas: плашка зума — переключатель подписей, уменьшить, процент, увеличить, вписать всё -->
<template>
  <UiPill class="canvas-zoom">
    <UiIconButton icon="tag" :label="labelsToggleTitle" :pressed="labelsVisible" @click="toggleLabels" />
    <UiIconButton icon="minus" label="Уменьшить (Ctrl −)" @click="zoomOut" />
    <span class="canvas-zoom__value">{{ zoomLabel }}</span>
    <UiIconButton icon="plus" label="Увеличить (Ctrl +)" @click="zoomIn" />
    <UiIconButton icon="fit" label="Вписать всё (Shift 1)" @click="fitAll" />
  </UiPill>
</template>

<script setup lang="ts">
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'
import UiPill from '@/views/components/ui-pill/UiPill.vue'
import { useCanvasZoom } from '@/scripts/pages/canvas/use-canvas-zoom'

const { zoomLabel, labelsVisible, labelsToggleTitle, toggleLabels, zoomIn, zoomOut, fitAll } = useCanvasZoom()
</script>
