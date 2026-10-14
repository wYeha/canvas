<!-- Общий компонент: текстовая кнопка с необязательными иконками и подсказкой горячей клавиши -->
<template>
  <button
    :class="classes"
    type="button"
    :disabled="disabled"
    :aria-keyshortcuts="hint"
    @mousedown="keepFocusOnMouseDown"
  >
    <UiIcon v-if="icon" :name="icon" class="ui-button__icon" />
    <span class="ui-button__text"><slot /></span>
    <kbd v-if="hint" class="ui-button__hint">{{ hint }}</kbd>
    <UiIcon v-if="iconAfter" :name="iconAfter" class="ui-button__icon" />
  </button>
</template>

<script setup lang="ts">
import UiIcon from '@/views/components/ui-icon/UiIcon.vue'
import type { UiButtonProps } from '@/scripts/components/ui-button/ui-button.types'
import { useUiButton } from '@/scripts/components/ui-button/use-ui-button'
import { keepFocusOnMouseDown } from '@/scripts/globals/focus'

const props = withDefaults(defineProps<UiButtonProps>(), { variant: 'default', size: 'm', disabled: false })
const { classes } = useUiButton(props)
</script>
