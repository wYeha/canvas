<!-- Общий компонент: SVG-иконка из набора по имени, цвет берёт у родителя (currentColor) -->
<template>
  <svg class="ui-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path v-for="path in paths" :key="path" :d="path" />
  </svg>
</template>

<script setup lang="ts">
import type { UiIconProps } from '@/scripts/components/ui-icon/ui-icon.types'
import { useUiIcon } from '@/scripts/components/ui-icon/use-ui-icon'

const props = defineProps<UiIconProps>()
const { paths } = useUiIcon(props)
</script>
