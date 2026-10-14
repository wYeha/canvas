<!-- Общий компонент: числовое поле со стрелками ↑/↓, шагом, границами и единицей px/%/fr; пусто = null -->
<template>
  <UiTextInput
    v-model="draft"
    class="ui-number-input"
    mono
    :label="label"
    :prefix="prefix"
    :suffix="unit"
    :placeholder="placeholder"
    :error="error"
    :disabled="disabled"
    :input-attrs="controlAttrs"
    @keydown="onKeydown"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
import type { UiNumberInputProps } from '@/scripts/components/ui-number-input/ui-number-input.types'
import { useUiNumberInput } from '@/scripts/components/ui-number-input/use-ui-number-input'

const props = withDefaults(defineProps<UiNumberInputProps>(), { nullable: true })
const model = defineModel<number | null>({ default: null })
const { draft, controlAttrs, onKeydown, onBlur } = useUiNumberInput(props, model)
</script>
