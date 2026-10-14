<!-- Фрагмент страницы canvas: панель «Свойства» (пока пустое состояние) -->
<template>
  <UiPanel class="canvas-props" title="Свойства">
    <UiEmptyState text="Ничего не выделено" />
  </UiPanel>
</template>

<script setup lang="ts">
import UiEmptyState from '@/views/components/ui-empty-state/UiEmptyState.vue'
import UiPanel from '@/views/components/ui-panel/UiPanel.vue'
</script>
