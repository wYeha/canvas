<!-- Общий компонент: переключатель вкл/выкл (role=switch); Space/Enter переключают, v-model — boolean -->
<template>
  <button
    v-bind="inputAttrs"
    class="ui-switch"
    :class="{ 'ui-switch--on': model }"
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="ariaLabel"
    :disabled="disabled"
    @mousedown="keepFocusOnMouseDown"
    @click="model = !model"
  >
    <span class="ui-switch__thumb" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UiSwitchProps } from '@/scripts/components/ui-switch/ui-switch.types'
import { ariaLabelUnlessLabelledBy } from '@/scripts/globals/aria'
import { keepFocusOnMouseDown } from '@/scripts/globals/focus'

const props = defineProps<UiSwitchProps>()
const ariaLabel = computed(() => ariaLabelUnlessLabelledBy(props.label, props.inputAttrs))
const model = defineModel<boolean>({ default: false })
</script>
