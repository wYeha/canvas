<!-- Общий компонент: подпись над контролом (label→control по id) и подсказка или ошибка под ним -->
<template>
  <div class="ui-field" :class="{ 'ui-field--error': error }">
    <label :id="ids.label" class="ui-field__label" :for="ids.control">{{ label }}</label>
    <slot v-bind="slotProps" />
    <p v-if="error" :id="ids.error" class="ui-field__message ui-field__message--error">{{ error }}</p>
    <p v-else-if="hint" :id="ids.hint" class="ui-field__message">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import type { UiFieldProps } from '@/scripts/components/ui-field/ui-field.types'
import { useUiField } from '@/scripts/components/ui-field/use-ui-field'

const props = defineProps<UiFieldProps>()
const { ids, slotProps } = useUiField(props)
</script>
