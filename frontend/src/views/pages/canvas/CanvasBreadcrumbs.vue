<!-- Фрагмент страницы canvas: плашка пути от корневого блока до выделенного; сегменты — кнопки выбора узла -->
<template>
  <UiPill class="canvas-breadcrumbs">
    <span v-if="segments.length === 0" class="canvas-breadcrumbs__empty">{{ emptyText }}</span>
    <template v-for="(segment, index) in segments" v-else :key="segment.id">
      <span v-if="index > 0" class="canvas-breadcrumbs__separator">{{ separator }}</span>
      <button
        type="button"
        :class="[
          'canvas-breadcrumbs__segment',
          { 'canvas-breadcrumbs__segment--current': index === segments.length - 1 },
        ]"
        @click="selectSegment(segment.id)"
      >
        {{ segment.text }}
      </button>
    </template>
  </UiPill>
</template>

<script setup lang="ts">
import UiPill from '@/views/components/ui-pill/UiPill.vue'
import { useCanvasBreadcrumbs } from '@/scripts/pages/canvas/use-canvas-breadcrumbs'

const { segments, selectSegment, separator, emptyText } = useCanvasBreadcrumbs()
</script>
