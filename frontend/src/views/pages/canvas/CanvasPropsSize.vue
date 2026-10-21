<!-- Фрагмент страницы canvas: режим размера по оси «как ребёнок» (авто / заполнить / фикс.) и необязательное число у фиксированного -->
<template>
  <div class="canvas-props-size">
    <UiField v-slot="{ id, describedBy }" :label="CHILD_SIZE_LABELS[axis]" :hint="hint">
      <UiSegmented
        v-model="segment"
        :label="CHILD_SIZE_LABELS[axis]"
        :options="CHILD_SIZE_MODE_OPTIONS"
        :input-attrs="{ id, 'aria-describedby': describedBy }"
      />
    </UiField>
    <UiField
      v-if="mode === 'fixed'"
      v-slot="{ id, describedBy }"
      :label="CHILD_SIZE_VALUE_LABELS[axis]"
      :error="valueError ? CHILD_VALUE_ERROR : undefined"
    >
      <UiTextInput
        v-model="value"
        mono
        :label="CHILD_SIZE_VALUE_LABELS[axis]"
        :placeholder="CHILD_SIZE_VALUE_PLACEHOLDER"
        :error="valueError"
        :input-attrs="{ id, 'aria-describedby': describedBy }"
        @keydown="emit('keydown', $event)"
        @blur="emit('apply')"
      />
    </UiField>
  </div>
</template>

<script setup lang="ts">
import UiField from '@/views/components/ui-field/UiField.vue'
import UiSegmented from '@/views/components/ui-segmented/UiSegmented.vue'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
import type { CanvasPropsSizeEmits, CanvasPropsSizeProps } from '@/scripts/pages/canvas/canvas-props-size.types'
import {
  CHILD_SIZE_LABELS,
  CHILD_SIZE_MODE_OPTIONS,
  CHILD_SIZE_VALUE_LABELS,
  CHILD_SIZE_VALUE_PLACEHOLDER,
  CHILD_VALUE_ERROR,
} from '@/scripts/pages/canvas/constants'
import type { SizeMode } from '@/scripts/pages/canvas/size-mode'
import { useCanvasPropsSize } from '@/scripts/pages/canvas/use-canvas-props-size'

defineProps<CanvasPropsSizeProps>()
const emit = defineEmits<CanvasPropsSizeEmits>()
const mode = defineModel<SizeMode | null>('mode', { required: true })
const value = defineModel<string>('value', { required: true })
const { segment } = useCanvasPropsSize(mode)
</script>
