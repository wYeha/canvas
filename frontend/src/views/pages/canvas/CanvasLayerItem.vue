<!-- Фрагмент страницы canvas: рекурсивная строка панели «Слои» (шеврон сворачивания, значок типа, подпись, тип) и её дети -->
<template>
  <li class="canvas-layer-item">
    <div ref="rowEl" :class="view.rowClasses" :data-layer-id="node.id">
      <button
        v-if="view.expandable"
        class="canvas-layer-item__toggle"
        type="button"
        :aria-expanded="view.expanded"
        :aria-label="view.toggleLabel"
        :title="view.toggleLabel"
        @mousedown="keepFocusOnMouseDown"
        @click="toggle"
      >
        <UiIcon name="chevron-down" :class="view.chevronClasses" />
      </button>
      <span v-else class="canvas-layer-item__spacer" />
      <button
        class="canvas-layer-item__select"
        type="button"
        :aria-current="view.selected"
        @mousedown="keepFocusOnMouseDown"
        @click="activate"
      >
        <UiIcon :name="view.icon" class="canvas-layer-item__icon" />
        <span class="canvas-layer-item__label">{{ view.caption }}</span>
        <span class="canvas-layer-item__type">{{ view.type }}</span>
      </button>
    </div>
    <ul v-if="view.expanded" class="canvas-layer-item__children">
      <CanvasLayerItem v-for="child in view.children" :key="child.id" :node="child" :depth="depth + 1" />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UiIcon from '@/views/components/ui-icon/UiIcon.vue'
import type { CanvasLayerItemProps } from '@/scripts/pages/canvas/canvas-layer-item.types'
import { useCanvasLayerItem } from '@/scripts/pages/canvas/use-canvas-layer-item'
import { keepFocusOnMouseDown } from '@/scripts/globals/focus'

const props = defineProps<CanvasLayerItemProps>()
const rowEl = ref<HTMLElement | null>(null)
const { view, toggle, activate } = useCanvasLayerItem(props, rowEl)
</script>
