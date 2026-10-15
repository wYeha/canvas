<!-- Общий компонент: тост (всплывающее сообщение) с автоскрытием и кнопкой закрытия; положение задаёт родитель -->
<template>
  <div :class="classes" :role="role">
    <span class="ui-toast__text">{{ message }}</span>
    <button class="ui-toast__close" type="button" :aria-label="TOAST_CLOSE_LABEL" @click="emit('close')">
      <UiIcon name="close" />
    </button>
  </div>
</template>

<script setup lang="ts">
import UiIcon from '@/views/components/ui-icon/UiIcon.vue'
import { TOAST_CLOSE_LABEL } from '@/scripts/components/ui-toast/ui-toast.constants'
import type { UiToastEmits, UiToastProps } from '@/scripts/components/ui-toast/ui-toast.types'
import { useUiToast } from '@/scripts/components/ui-toast/use-ui-toast'

const props = withDefaults(defineProps<UiToastProps>(), { kind: 'info' })
const emit = defineEmits<UiToastEmits>()
const { role, classes } = useUiToast(props, emit)
</script>
