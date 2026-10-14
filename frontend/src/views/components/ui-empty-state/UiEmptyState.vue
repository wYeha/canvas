<!-- Общий компонент: текст пустого состояния панели -->
<template>
  <p class="ui-empty-state">{{ text }}</p>
</template>

<script setup lang="ts">
import type { UiEmptyStateProps } from '@/scripts/components/ui-empty-state/ui-empty-state.types'

defineProps<UiEmptyStateProps>()
</script>
