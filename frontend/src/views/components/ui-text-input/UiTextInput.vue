<!-- Общий компонент: однострочное поле ввода (текст или пароль) с префиксом, суффиксом, ошибкой и недоступностью -->
<template>
  <label :class="classes">
    <span v-if="prefix" class="ui-text-input__prefix">{{ prefix }}</span>
    <input
      v-bind="inputAttrs"
      v-model="model"
      class="ui-text-input__input"
      :type="type"
      :disabled="disabled"
      :placeholder="placeholder"
      :aria-label="ariaLabel"
      :aria-invalid="error ? 'true' : undefined"
      @keydown="emit('keydown', $event)"
      @blur="emit('blur', $event)"
    />
    <span v-if="suffix" class="ui-text-input__suffix">{{ suffix }}</span>
  </label>
</template>

<script setup lang="ts">
import type { UiTextInputEmits, UiTextInputProps } from '@/scripts/components/ui-text-input/ui-text-input.types'
import { useUiTextInput } from '@/scripts/components/ui-text-input/use-ui-text-input'

const props = withDefaults(defineProps<UiTextInputProps>(), { type: 'text' })
const emit = defineEmits<UiTextInputEmits>()
const model = defineModel<string>({ default: '' })
const { classes, ariaLabel } = useUiTextInput(props)
</script>
