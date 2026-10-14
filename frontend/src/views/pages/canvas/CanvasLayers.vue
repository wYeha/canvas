<!-- Фрагмент страницы canvas: панель «Слои» (пока пустое состояние) -->
<template>
  <UiPanel class="canvas-layers" title="Слои">
    <UiEmptyState text="Нет блоков" />
  </UiPanel>
</template>

<script setup lang="ts">
import UiEmptyState from '@/views/components/ui-empty-state/UiEmptyState.vue'
import UiPanel from '@/views/components/ui-panel/UiPanel.vue'
</script>
