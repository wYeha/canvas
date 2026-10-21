<!--
  Фрагмент страницы canvas: секция «Как ребёнок» — режимы ширины и высоты, span в grid-родителе, повтор ×N,
  «Дополнительно» (свободный flex, min/max-width, min-height)
-->
<template>
  <div v-if="node" class="canvas-props-child">
    <CanvasPropsSize
      v-model:mode="widthMode"
      v-model:value="widthValue"
      axis="width"
      :hint="widthHint"
      :value-error="widthValueError"
      @apply="applyWidthValue"
      @keydown="onWidthValueKeydown"
    />
    <CanvasPropsSize
      v-model:mode="heightMode"
      v-model:value="heightValue"
      axis="height"
      :hint="heightHint"
      :value-error="heightValueError"
      @apply="applyHeightValue"
      @keydown="onHeightValueKeydown"
    />
    <template v-if="gridParent">
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
    <UiPanelSection v-model:open="advancedOpen" class="canvas-props-child__advanced" :title="CHILD_ADVANCED_TITLE">
      <div class="canvas-props-child__advanced-body">
        <UiField
          v-if="flexParent"
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
          :label="CHILD_MIN_WIDTH_LABEL"
          :error="minWidthError ? CHILD_VALUE_ERROR : undefined"
        >
          <UiTextInput
            v-model="minWidth"
            mono
            :label="CHILD_MIN_WIDTH_LABEL"
            :placeholder="CHILD_SIZE_PLACEHOLDER"
            :error="minWidthError"
            :input-attrs="{ id, 'aria-describedby': describedBy }"
            @keydown="onMinWidthKeydown"
            @blur="applyMinWidth"
          />
        </UiField>
        <UiField
          v-slot="{ id, describedBy }"
          :label="CHILD_MAX_WIDTH_LABEL"
          :error="maxWidthError ? CHILD_VALUE_ERROR : undefined"
        >
          <UiTextInput
            v-model="maxWidth"
            mono
            :label="CHILD_MAX_WIDTH_LABEL"
            :placeholder="CHILD_SIZE_PLACEHOLDER"
            :error="maxWidthError"
            :input-attrs="{ id, 'aria-describedby': describedBy }"
            @keydown="onMaxWidthKeydown"
            @blur="applyMaxWidth"
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
      </div>
    </UiPanelSection>
  </div>
</template>

<script setup lang="ts">
import UiChips from '@/views/components/ui-chips/UiChips.vue'
import UiField from '@/views/components/ui-field/UiField.vue'
import UiNumberInput from '@/views/components/ui-number-input/UiNumberInput.vue'
import UiPanelSection from '@/views/components/ui-panel-section/UiPanelSection.vue'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
import CanvasPropsSize from '@/views/pages/canvas/CanvasPropsSize.vue'
import {
  CHILD_ADVANCED_TITLE,
  CHILD_COL_SPAN_LABEL,
  CHILD_FLEX_LABEL,
  CHILD_FLEX_PLACEHOLDER,
  CHILD_FLEX_PRESETS_LABEL,
  CHILD_MAX_WIDTH_LABEL,
  CHILD_MIN_HEIGHT_LABEL,
  CHILD_MIN_WIDTH_LABEL,
  CHILD_REPEAT_LABEL,
  CHILD_ROW_SPAN_LABEL,
  CHILD_SIZE_PLACEHOLDER,
  CHILD_SPAN_MIN,
  CHILD_VALUE_ERROR,
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
  widthMode,
  heightMode,
  widthHint,
  heightHint,
  widthValue,
  widthValueError,
  applyWidthValue,
  onWidthValueKeydown,
  heightValue,
  heightValueError,
  applyHeightValue,
  onHeightValueKeydown,
  minWidth,
  minWidthError,
  applyMinWidth,
  onMinWidthKeydown,
  maxWidth,
  maxWidthError,
  applyMaxWidth,
  onMaxWidthKeydown,
  minHeight,
  minHeightError,
  applyMinHeight,
  onMinHeightKeydown,
  colSpan,
  rowSpan,
  repeat,
  advancedOpen,
} = useCanvasPropsChild()
</script>
