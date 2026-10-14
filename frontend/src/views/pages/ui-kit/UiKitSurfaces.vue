<!-- Фрагмент страницы ui-kit: UiIcon (весь набор), UiPanel, UiPill, UiEmptyState -->
<template>
  <UiKitSection title="UiIcon">
    <ul class="ui-kit-surfaces__icons">
      <li v-for="name in ICON_NAMES" :key="name" class="ui-kit-surfaces__icon">
        <UiIcon :name="name" />
        <span>{{ name }}</span>
      </li>
    </ul>
  </UiKitSection>
  <UiKitSection title="UiPanel, UiPill, UiEmptyState">
    <UiPanel class="ui-kit-surfaces__panel" title="Свойства">
      <UiEmptyState text="Ничего не выделено" />
    </UiPanel>
    <UiPill>
      Плашка
      <UiIconButton icon="plus" label="Добавить" />
    </UiPill>
  </UiKitSection>
</template>

<script setup lang="ts">
import UiEmptyState from '@/views/components/ui-empty-state/UiEmptyState.vue'
import UiIcon from '@/views/components/ui-icon/UiIcon.vue'
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'
import UiKitSection from '@/views/pages/ui-kit/UiKitSection.vue'
import UiPanel from '@/views/components/ui-panel/UiPanel.vue'
import UiPill from '@/views/components/ui-pill/UiPill.vue'
import { ICON_PATHS } from '@/scripts/components/ui-icon/ui-icon.constants'
import type { UiIconName } from '@/scripts/components/ui-icon/ui-icon.types'

/** Имена всех иконок набора. */
const ICON_NAMES = Object.keys(ICON_PATHS) as UiIconName[]
</script>
