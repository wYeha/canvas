<!-- Общий компонент: плавающая панель с заголовком, закреплённой шапкой (слот header), прокручиваемым содержимым и закреплённым футером (слот footer) -->
<template>
  <section class="ui-panel">
    <h2 class="ui-panel__title">{{ title }}</h2>
    <slot name="header" />
    <div class="ui-panel__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="ui-panel__footer">
      <slot name="footer" />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { UiPanelProps } from '@/scripts/components/ui-panel/ui-panel.types'

defineProps<UiPanelProps>()
</script>
