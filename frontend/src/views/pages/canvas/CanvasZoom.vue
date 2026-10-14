<!-- Фрагмент страницы canvas: плашка зума (пока без действий) -->
<template>
  <UiPill class="canvas-zoom">
    <UiIconButton icon="minus" label="Уменьшить" />
    <span class="canvas-zoom__value">100%</span>
    <UiIconButton icon="plus" label="Увеличить" />
    <UiIconButton icon="fit" label="Вписать всё" />
  </UiPill>
</template>

<script setup lang="ts">
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'
import UiPill from '@/views/components/ui-pill/UiPill.vue'
</script>
