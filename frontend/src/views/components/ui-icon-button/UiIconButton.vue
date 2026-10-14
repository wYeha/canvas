<!-- Общий компонент: квадратная кнопка с иконкой; подпись уходит в aria-label и подсказку -->
<template>
  <button :class="classes" type="button" :aria-label="label" :title="label">
    <UiIcon :name="icon" class="ui-icon-button__icon" />
  </button>
</template>

<script setup lang="ts">
import UiIcon from '@/views/components/ui-icon/UiIcon.vue'
import type { UiIconButtonProps } from '@/scripts/components/ui-icon-button/ui-icon-button.types'
import { useUiIconButton } from '@/scripts/components/ui-icon-button/use-ui-icon-button'

const props = withDefaults(defineProps<UiIconButtonProps>(), { size: 'm' })
const { classes } = useUiIconButton(props)
</script>
