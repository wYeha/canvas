<!-- Фрагмент страницы canvas: секция «Блок» — подпись, описание для ИИ, тег и смысловой элемент со списком-подсказкой -->
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
    <UiField
      v-slot="{ id, describedBy }"
      :label="BLOCK_ELEMENT_LABEL"
      :hint="BLOCK_ELEMENT_HINT"
      :error="elementError ? BLOCK_ELEMENT_ERROR : undefined"
    >
      <UiTextInput
        v-model="element"
        mono
        :label="BLOCK_ELEMENT_LABEL"
        :placeholder="BLOCK_ELEMENT_PLACEHOLDER"
        :error="elementError"
        :input-attrs="{ id, 'aria-describedby': describedBy, list: elementListId, autocomplete: 'off' }"
        @keydown="onElementKeydown"
        @blur="applyElement"
      />
      <datalist :id="elementListId">
        <option v-for="name in ELEMENT_SUGGESTIONS" :key="name" :value="name" />
      </datalist>
    </UiField>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import UiField from '@/views/components/ui-field/UiField.vue'
import UiSelect from '@/views/components/ui-select/UiSelect.vue'
import UiTextarea from '@/views/components/ui-textarea/UiTextarea.vue'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
import {
  BLOCK_DESCRIPTION_LABEL,
  BLOCK_ELEMENT_ERROR,
  BLOCK_ELEMENT_HINT,
  BLOCK_ELEMENT_LABEL,
  BLOCK_ELEMENT_PLACEHOLDER,
  BLOCK_DESCRIPTION_PLACEHOLDER,
  BLOCK_DESCRIPTION_ROWS,
  BLOCK_LABEL_LABEL,
  BLOCK_TAG_LABEL,
  ELEMENT_SUGGESTIONS,
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
  element,
  elementError,
  applyElement,
  onElementKeydown,
} = useCanvasPropsBlock()
/** Id списка подсказок поля «Элемент» (уникален на странице). */
const elementListId = useId()
</script>
