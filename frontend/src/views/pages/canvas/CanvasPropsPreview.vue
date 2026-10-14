<!-- Фрагмент страницы canvas: секция «Ширина превью» корня — ширина, высота и экспорт как max-width -->
<template>
  <div v-if="root" class="canvas-props-preview">
    <UiField v-slot="{ id, describedBy }" :label="PREVIEW_WIDTH_LABEL">
      <UiChips v-model="widthPreset" :label="PREVIEW_PRESETS_LABEL" :options="WIDTH_PRESET_OPTIONS" />
      <UiNumberInput
        v-model="width"
        :label="PREVIEW_WIDTH_LABEL"
        unit="px"
        :nullable="false"
        :min="PREVIEW_MIN_SIZE"
        :step="PREVIEW_SIZE_STEP"
        :input-attrs="{ id, 'aria-describedby': describedBy }"
      />
    </UiField>
    <UiField v-slot="{ id, describedBy }" :label="PREVIEW_HEIGHT_LABEL">
      <UiSegmented
        v-model="heightMode"
        :label="PREVIEW_HEIGHT_LABEL"
        :options="HEIGHT_MODE_OPTIONS"
        :input-attrs="{ id, 'aria-describedby': describedBy }"
      />
      <UiNumberInput
        v-if="height !== null"
        v-model="height"
        :label="PREVIEW_HEIGHT_VALUE_LABEL"
        unit="px"
        :nullable="false"
        :min="PREVIEW_MIN_SIZE"
        :step="PREVIEW_SIZE_STEP"
      />
    </UiField>
    <UiField v-slot="{ id, labelId, describedBy }" :label="PREVIEW_MAX_WIDTH_LABEL" :hint="hint">
      <UiSwitch
        v-model="exportMaxWidth"
        class="canvas-props-preview__switch"
        :label="PREVIEW_MAX_WIDTH_LABEL"
        :input-attrs="{ id, 'aria-labelledby': labelId, 'aria-describedby': describedBy }"
      />
    </UiField>
  </div>
</template>

<script setup lang="ts">
import UiChips from '@/views/components/ui-chips/UiChips.vue'
import UiField from '@/views/components/ui-field/UiField.vue'
import UiNumberInput from '@/views/components/ui-number-input/UiNumberInput.vue'
import UiSegmented from '@/views/components/ui-segmented/UiSegmented.vue'
import UiSwitch from '@/views/components/ui-switch/UiSwitch.vue'
import {
  PREVIEW_HEIGHT_LABEL,
  PREVIEW_HEIGHT_VALUE_LABEL,
  PREVIEW_MAX_WIDTH_LABEL,
  PREVIEW_MIN_SIZE,
  PREVIEW_PRESETS_LABEL,
  PREVIEW_SIZE_STEP,
  PREVIEW_WIDTH_LABEL,
} from '@/scripts/pages/canvas/constants'
import { HEIGHT_MODE_OPTIONS, WIDTH_PRESET_OPTIONS } from '@/scripts/pages/canvas/props-preview'
import { useCanvasPropsPreview } from '@/scripts/pages/canvas/use-canvas-props-preview'

const { root, width, widthPreset, heightMode, height, exportMaxWidth, hint } = useCanvasPropsPreview()
</script>
