<!-- Фрагмент страницы canvas: тулбар с созданием блоков и отменой/повтором (пока без действий) -->
<template>
  <div class="canvas-toolbar" role="group" aria-label="Инструменты">
    <UiButton size="l" icon="flex" hint="F" keyshortcuts="F">Flex</UiButton>
    <UiButton size="l" icon="grid" hint="G" keyshortcuts="G">Grid</UiButton>
    <span class="canvas-toolbar__divider"></span>
    <UiIconButton size="l" icon="undo" label="Отменить" />
    <UiIconButton size="l" icon="redo" label="Повторить" />
  </div>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'
</script>
