<!-- Общий компонент: многострочное поле ввода с вертикальным ресайзом, ошибкой и недоступностью -->
<template>
  <textarea
    v-bind="inputAttrs"
    v-model="model"
    :class="classes"
    :rows="rows"
    :disabled="disabled"
    :placeholder="placeholder"
    :aria-label="ariaLabel"
    :aria-invalid="error ? 'true' : undefined"
    @keydown="emit('keydown', $event)"
    @blur="emit('blur', $event)"
  />
</template>

<script setup lang="ts">
import { DEFAULT_TEXTAREA_ROWS } from '@/scripts/components/ui-textarea/ui-textarea.constants'
import type { UiTextareaEmits, UiTextareaProps } from '@/scripts/components/ui-textarea/ui-textarea.types'
import { useUiTextarea } from '@/scripts/components/ui-textarea/use-ui-textarea'

const props = withDefaults(defineProps<UiTextareaProps>(), { rows: DEFAULT_TEXTAREA_ROWS })
const emit = defineEmits<UiTextareaEmits>()
const model = defineModel<string>({ default: '' })
const { classes, ariaLabel } = useUiTextarea(props)
</script>
