<!-- Фрагмент страницы canvas: рекурсивная строка панели «Слои» (шеврон сворачивания, значок типа, подпись или поле переименования, знак повтора ×N, тип) и её дети -->
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
        @mousedown="releaseFieldOnMouseDown"
        @click="toggle"
      >
        <UiIcon name="chevron-down" :class="view.chevronClasses" />
      </button>
      <span v-else class="canvas-layer-item__spacer" />
      <div v-if="view.renaming" class="canvas-layer-item__edit">
        <UiIcon :name="view.icon" class="canvas-layer-item__icon" />
        <UiTextInput
          v-model="draft"
          class="canvas-layer-item__input"
          :label="renameLabel"
          @keydown="onRenameKeydown"
          @blur="onRenameBlur"
        />
      </div>
      <button
        v-else
        class="canvas-layer-item__select"
        type="button"
        :aria-current="view.current"
        @mousedown="releaseFieldOnMouseDown"
        @click="activate"
        @dblclick="startRename"
      >
        <UiIcon :name="view.icon" class="canvas-layer-item__icon" />
        <span class="canvas-layer-item__label">{{ view.caption }}</span>
        <span v-if="view.repeat !== ''" class="canvas-layer-item__repeat">{{ view.repeat }}</span>
        <span
          v-if="view.described"
          class="canvas-layer-item__described"
          :title="DESCRIPTION_MARK_TITLE"
          aria-hidden="true"
        >
          {{ DESCRIPTION_MARK }}
        </span>
        <span class="canvas-layer-item__type">{{ view.type }}</span>
      </button>
    </div>
    <ul v-if="view.expanded" class="canvas-layer-item__children">
      <CanvasLayerItem v-for="child in view.children" :key="child.id" :node="child" :depth="depth + 1" />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { DESCRIPTION_MARK, DESCRIPTION_MARK_TITLE } from '@/scripts/pages/canvas/constants'
import { ref } from 'vue'
import UiIcon from '@/views/components/ui-icon/UiIcon.vue'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
import type { CanvasLayerItemProps } from '@/scripts/pages/canvas/canvas-layer-item.types'
import { useCanvasLayerItem } from '@/scripts/pages/canvas/use-canvas-layer-item'
import { releaseFieldOnMouseDown } from '@/scripts/globals/focus'

const props = defineProps<CanvasLayerItemProps>()
const rowEl = ref<HTMLElement | null>(null)
const { view, draft, renameLabel, toggle, activate, startRename, onRenameKeydown, onRenameBlur } = useCanvasLayerItem(
  props,
  rowEl,
)
</script>
