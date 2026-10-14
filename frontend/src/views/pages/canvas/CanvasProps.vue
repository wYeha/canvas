<!-- Фрагмент страницы canvas: панель «Свойства» — заголовок выделения и сворачиваемые секции -->
<template>
  <UiPanel class="canvas-props" title="Свойства">
    <template v-if="header" #header>
      <div class="canvas-props__header">
        <span class="canvas-props__icon" aria-hidden="true">{{ header.icon }}</span>
        <span class="canvas-props__title">{{ header.title }}</span>
        <span class="canvas-props__meta">{{ header.meta }}</span>
      </div>
    </template>
    <template v-if="header">
      <UiPanelSection
        v-for="section in sections"
        :key="section.id"
        :title="section.title"
        :open="isOpen(section.id)"
        @update:open="setOpen(section.id, $event)"
      >
        <component :is="section.component" />
      </UiPanelSection>
    </template>
    <template v-else>
      <UiEmptyState :text="PROPS_EMPTY_TEXT" />
      <UiEmptyState class="canvas-props__hint" :text="PROPS_EMPTY_HINT" />
    </template>
  </UiPanel>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import CanvasPropsBlock from '@/views/pages/canvas/CanvasPropsBlock.vue'
import CanvasPropsPreview from '@/views/pages/canvas/CanvasPropsPreview.vue'
import UiEmptyState from '@/views/components/ui-empty-state/UiEmptyState.vue'
import UiPanel from '@/views/components/ui-panel/UiPanel.vue'
import UiPanelSection from '@/views/components/ui-panel-section/UiPanelSection.vue'
import { PROPS_EMPTY_HINT, PROPS_EMPTY_TEXT } from '@/scripts/pages/canvas/constants'
import type { PropsSectionId } from '@/scripts/pages/canvas/props-sections'
import { useCanvasProps } from '@/scripts/pages/canvas/use-canvas-props'
import { useCanvasPropsSections } from '@/scripts/pages/canvas/use-canvas-props-sections'

// Реестр готовых секций: остальные фрагменты добавляются по мере итераций 3.2–3.5
const registry: Partial<Record<PropsSectionId, Component>> = { preview: CanvasPropsPreview, block: CanvasPropsBlock }
const { header, sections } = useCanvasProps(registry)
const { isOpen, setOpen } = useCanvasPropsSections()
</script>
