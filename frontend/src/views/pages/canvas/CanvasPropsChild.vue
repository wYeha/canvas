<!-- Фрагмент страницы canvas: секция «Как ребёнок» — flex и width во flex-родителе, span в grid-родителе, height и min-height, повтор ×N -->
<template>
  <div v-if="node" class="canvas-props-child">
    <template v-if="flexParent">
      <UiField
        v-slot="{ id, describedBy }"
        :label="CHILD_FLEX_LABEL"
        :error="flexError ? CHILD_VALUE_ERROR : undefined"
      >
        <UiChips v-model="flexPreset" :label="CHILD_FLEX_PRESETS_LABEL" :options="CHILD_FLEX_OPTIONS" />
        <UiTextInput
          v-model="flexCustom"
          mono
          :label="CHILD_FLEX_LABEL"
          :placeholder="CHILD_FLEX_PLACEHOLDER"
          :error="flexError"
          :input-attrs="{ id, 'aria-describedby': describedBy }"
          @keydown="onFlexKeydown"
          @blur="applyFlex"
        />
      </UiField>
      <UiField
        v-slot="{ id, describedBy }"
        :label="CHILD_WIDTH_LABEL"
        :error="widthError ? CHILD_VALUE_ERROR : undefined"
      >
        <UiTextInput
          v-model="width"
          mono
          :label="CHILD_WIDTH_LABEL"
          :placeholder="CHILD_SIZE_PLACEHOLDER"
          :error="widthError"
          :input-attrs="{ id, 'aria-describedby': describedBy }"
          @keydown="onWidthKeydown"
          @blur="applyWidth"
        />
      </UiField>
    </template>
    <template v-else-if="gridParent">
      <UiField v-slot="{ id, describedBy }" :label="CHILD_COL_SPAN_LABEL">
        <UiNumberInput
          v-model="colSpan"
          :label="CHILD_COL_SPAN_LABEL"
          :min="CHILD_SPAN_MIN"
          :input-attrs="{ id, 'aria-describedby': describedBy }"
        />
      </UiField>
      <UiField v-slot="{ id, describedBy }" :label="CHILD_ROW_SPAN_LABEL">
        <UiNumberInput
          v-model="rowSpan"
          :label="CHILD_ROW_SPAN_LABEL"
          :min="CHILD_SPAN_MIN"
          :input-attrs="{ id, 'aria-describedby': describedBy }"
        />
      </UiField>
    </template>
    <UiField
      v-slot="{ id, describedBy }"
      :label="CHILD_HEIGHT_LABEL"
      :error="heightError ? CHILD_VALUE_ERROR : undefined"
    >
      <UiTextInput
        v-model="height"
        mono
        :label="CHILD_HEIGHT_LABEL"
        :placeholder="CHILD_SIZE_PLACEHOLDER"
        :error="heightError"
        :input-attrs="{ id, 'aria-describedby': describedBy }"
        @keydown="onHeightKeydown"
        @blur="applyHeight"
      />
    </UiField>
    <UiField
      v-slot="{ id, describedBy }"
      :label="CHILD_MIN_HEIGHT_LABEL"
      :error="minHeightError ? CHILD_VALUE_ERROR : undefined"
    >
      <UiTextInput
        v-model="minHeight"
        mono
        :label="CHILD_MIN_HEIGHT_LABEL"
        :placeholder="CHILD_SIZE_PLACEHOLDER"
        :error="minHeightError"
        :input-attrs="{ id, 'aria-describedby': describedBy }"
        @keydown="onMinHeightKeydown"
        @blur="applyMinHeight"
      />
    </UiField>
    <UiField v-slot="{ id, describedBy }" :label="CHILD_REPEAT_LABEL">
      <UiNumberInput
        v-model="repeat"
        :label="CHILD_REPEAT_LABEL"
        :min="DEFAULT_REPEAT"
        :max="REPEAT_MAX"
        :nullable="false"
        :prefix="REPEAT_MARK"
        :input-attrs="{ id, 'aria-describedby': describedBy }"
      />
    </UiField>
  </div>
</template>

<script setup lang="ts">
import UiChips from '@/views/components/ui-chips/UiChips.vue'
import UiField from '@/views/components/ui-field/UiField.vue'
import UiNumberInput from '@/views/components/ui-number-input/UiNumberInput.vue'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
import {
  CHILD_COL_SPAN_LABEL,
  CHILD_FLEX_LABEL,
  CHILD_FLEX_PLACEHOLDER,
  CHILD_FLEX_PRESETS_LABEL,
  CHILD_HEIGHT_LABEL,
  CHILD_MIN_HEIGHT_LABEL,
  CHILD_REPEAT_LABEL,
  CHILD_ROW_SPAN_LABEL,
  CHILD_SIZE_PLACEHOLDER,
  CHILD_SPAN_MIN,
  CHILD_VALUE_ERROR,
  CHILD_WIDTH_LABEL,
  DEFAULT_REPEAT,
  REPEAT_MARK,
  REPEAT_MAX,
} from '@/scripts/pages/canvas/constants'
import { CHILD_FLEX_OPTIONS } from '@/scripts/pages/canvas/props-child'
import { useCanvasPropsChild } from '@/scripts/pages/canvas/use-canvas-props-child'

const {
  node,
  flexParent,
  gridParent,
  flexPreset,
  flexCustom,
  flexError,
  applyFlex,
  onFlexKeydown,
  width,
  widthError,
  applyWidth,
  onWidthKeydown,
  height,
  heightError,
  applyHeight,
  onHeightKeydown,
  minHeight,
  minHeightError,
  applyMinHeight,
  onMinHeightKeydown,
  colSpan,
  rowSpan,
  repeat,
} = useCanvasPropsChild()
</script>
