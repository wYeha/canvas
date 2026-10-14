<!-- Общий компонент: плавающая панель с заголовком, закреплённой шапкой (слот header) и прокручиваемым содержимым -->
<template>
  <section class="ui-panel">
    <h2 class="ui-panel__title">{{ title }}</h2>
    <slot name="header" />
    <div class="ui-panel__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { UiPanelProps } from '@/scripts/components/ui-panel/ui-panel.types'

defineProps<UiPanelProps>()
</script>
