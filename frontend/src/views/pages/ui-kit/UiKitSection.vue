<!-- Фрагмент страницы ui-kit: секция витрины с заголовком и содержимым -->
<template>
  <section class="ui-kit-section">
    <h2 class="ui-kit-section__title">{{ title }}</h2>
    <div class="ui-kit-section__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { UiKitSectionProps } from '@/scripts/pages/ui-kit/ui-kit.types'

defineProps<UiKitSectionProps>()
</script>
