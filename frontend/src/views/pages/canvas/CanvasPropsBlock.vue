<!-- Фрагмент страницы canvas: секция «Блок» — подпись, описание для ИИ и тег -->
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
  </div>
</template>

<script setup lang="ts">
import UiField from '@/views/components/ui-field/UiField.vue'
import UiSelect from '@/views/components/ui-select/UiSelect.vue'
import UiTextarea from '@/views/components/ui-textarea/UiTextarea.vue'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
import {
  BLOCK_DESCRIPTION_LABEL,
  BLOCK_DESCRIPTION_PLACEHOLDER,
  BLOCK_DESCRIPTION_ROWS,
  BLOCK_LABEL_LABEL,
  BLOCK_TAG_LABEL,
} from '@/scripts/pages/canvas/constants'
import { TAG_OPTIONS } from '@/scripts/pages/canvas/props-block'
import { useCanvasPropsBlock } from '@/scripts/pages/canvas/use-canvas-props-block'

const { block, label, applyLabel, onLabelKeydown, description, applyDescription, onDescriptionKeydown, tag } =
  useCanvasPropsBlock()
</script>
