<!-- Фрагмент страницы canvas: поле ввода подписи нового блока в экранных координатах поверх поля (не масштабируется) -->
<template>
  <div ref="overlayEl" class="canvas-label-editor">
    <input
      v-if="style"
      ref="inputEl"
      v-model="draft"
      class="canvas-label-editor__input"
      type="text"
      :style="style"
      :aria-label="LABEL_EDITOR_ARIA"
      :placeholder="LABEL_EDITOR_PLACEHOLDER"
      @keydown="onKeydown"
      @blur="onBlur"
    />
  </div>
</template>

<script setup lang="ts">
import { LABEL_EDITOR_ARIA, LABEL_EDITOR_PLACEHOLDER } from '@/scripts/pages/canvas/constants'
import { useCanvasLabelEditor } from '@/scripts/pages/canvas/use-canvas-label-editor'

const { overlayEl, inputEl, style, draft, onKeydown, onBlur } = useCanvasLabelEditor()
</script>
