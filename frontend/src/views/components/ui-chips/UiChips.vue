<!-- Общий компонент: группа пресет-чипов; нажатие задаёт значение, подходящий чип подсвечен (v-model) -->
<template>
  <div class="ui-chips" role="group" :aria-label="label" v-bind="inputAttrs">
    <button
      v-for="option in options"
      :key="option.value"
      class="ui-chips__chip"
      :class="{ 'ui-chips__chip--selected': option.value === model }"
      type="button"
      :aria-pressed="option.value === model"
      :disabled="disabled || option.disabled"
      @mousedown="keepFocusOnMouseDown"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { UiChipsProps } from '@/scripts/components/ui-chips/ui-chips.types'
import { keepFocusOnMouseDown } from '@/scripts/globals/focus'

defineProps<UiChipsProps>()
const model = defineModel<string | null>({ default: null })
</script>
