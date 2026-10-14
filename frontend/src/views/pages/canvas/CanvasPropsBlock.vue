<!-- Фрагмент страницы canvas: секция «Блок» — подпись, описание для ИИ, тег и padding -->
<template>
  <div v-if="block" class="canvas-props-block">
    <UiField v-slot="{ id, describedBy }" :label="BLOCK_LABEL_LABEL">
      <UiTextInput
        v-model="label"
        :label="BLOCK_LABEL_LABEL"
        :input-attrs="{ id, 'aria-describedby': describedBy }"
        @keydown="onLabelKeydown"
        @blur="applyLabel"
      />
    </UiField>
    <UiField v-slot="{ id, describedBy }" :label="BLOCK_DESCRIPTION_LABEL">
      <UiTextarea
        v-model="description"
        :label="BLOCK_DESCRIPTION_LABEL"
        :placeholder="BLOCK_DESCRIPTION_PLACEHOLDER"
        :rows="BLOCK_DESCRIPTION_ROWS"
        :input-attrs="{ id, 'aria-describedby': describedBy }"
        @keydown="onDescriptionKeydown"
        @blur="applyDescription"
      />
    </UiField>
    <UiField v-slot="{ id, labelId, describedBy }" :label="BLOCK_TAG_LABEL">
      <UiSelect
        v-model="tag"
        :label="BLOCK_TAG_LABEL"
        :options="TAG_OPTIONS"
        :input-attrs="{ id, 'aria-labelledby': labelId, 'aria-describedby': describedBy }"
      />
    </UiField>
    <UiField v-slot="{ id, describedBy }" :label="BLOCK_PADDING_LABEL">
      <div class="canvas-props-block__padding">
        <UiNumberInput
          v-if="!sidesMode"
          v-model="padding"
          class="canvas-props-block__single"
          :label="BLOCK_PADDING_LABEL"
          unit="px"
          :min="BLOCK_PADDING_MIN"
          :placeholder="paddingMixed ? BLOCK_PADDING_MIXED_PLACEHOLDER : undefined"
          :input-attrs="{ id, 'aria-describedby': describedBy }"
        />
        <UiButton
          class="canvas-props-block__toggle"
          :class="{ 'canvas-props-block__toggle--on': sidesMode }"
          :aria-pressed="sidesMode"
          @click="toggleSidesMode"
        >
          {{ BLOCK_PADDING_TOGGLE_LABEL }}
        </UiButton>
      </div>
      <div v-if="sidesMode" class="canvas-props-block__sides">
        <UiNumberInput
          v-for="(side, index) in BLOCK_PADDING_SIDES"
          :key="side.key"
          :model-value="sides[side.key]"
          :label="side.label"
          :prefix="side.arrow"
          unit="px"
          :nullable="false"
          :min="BLOCK_PADDING_MIN"
          :input-attrs="index === 0 ? { id, 'aria-describedby': describedBy } : undefined"
          @update:model-value="setSide(side.key, $event)"
        />
      </div>
    </UiField>
  </div>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiField from '@/views/components/ui-field/UiField.vue'
import UiNumberInput from '@/views/components/ui-number-input/UiNumberInput.vue'
import UiSelect from '@/views/components/ui-select/UiSelect.vue'
import UiTextarea from '@/views/components/ui-textarea/UiTextarea.vue'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
import {
  BLOCK_DESCRIPTION_LABEL,
  BLOCK_DESCRIPTION_PLACEHOLDER,
  BLOCK_DESCRIPTION_ROWS,
  BLOCK_LABEL_LABEL,
  BLOCK_PADDING_LABEL,
  BLOCK_PADDING_MIN,
  BLOCK_PADDING_MIXED_PLACEHOLDER,
  BLOCK_PADDING_SIDES,
  BLOCK_PADDING_TOGGLE_LABEL,
  BLOCK_TAG_LABEL,
} from '@/scripts/pages/canvas/constants'
import { TAG_OPTIONS } from '@/scripts/pages/canvas/props-block'
import { useCanvasPropsBlock } from '@/scripts/pages/canvas/use-canvas-props-block'

const {
  block,
  label,
  applyLabel,
  onLabelKeydown,
  description,
  applyDescription,
  onDescriptionKeydown,
  tag,
  sidesMode,
  toggleSidesMode,
  padding,
  paddingMixed,
  sides,
  setSide,
} = useCanvasPropsBlock()
</script>
