<!-- Общий компонент: флажок с подписью (нативный checkbox); v-model — boolean -->
<template>
  <label class="ui-checkbox" :class="{ 'ui-checkbox--disabled': disabled }">
    <input v-model="model" class="ui-checkbox__input" type="checkbox" :disabled="disabled" />
    <span class="ui-checkbox__text">{{ label }}</span>
    <slot />
  </label>
</template>

<script setup lang="ts">
import type { UiCheckboxProps } from '@/scripts/components/ui-checkbox/ui-checkbox.types'

defineProps<UiCheckboxProps>()
const model = defineModel<boolean>({ default: false })
</script>
