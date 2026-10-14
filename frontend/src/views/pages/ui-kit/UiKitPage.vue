<!-- Оркестратор dev-страницы ui-kit: витрина общих компонентов (открывается по ?ui, только в dev) -->
<template>
  <div class="ui-kit-page">
    <header class="ui-kit-page__header">
      <h1 class="ui-kit-page__title">Витрина компонентов</h1>
      <UiButton :icon="themeIcon" @click="toggleTheme">{{ themeText }}</UiButton>
    </header>
    <main class="ui-kit-page__content">
      <UiKitButtons />
      <UiKitInputs />
      <UiKitSelects />
      <UiKitPanelParts />
      <UiKitSurfaces />
    </main>
  </div>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiKitButtons from '@/views/pages/ui-kit/UiKitButtons.vue'
import UiKitInputs from '@/views/pages/ui-kit/UiKitInputs.vue'
import UiKitPanelParts from '@/views/pages/ui-kit/UiKitPanelParts.vue'
import UiKitSelects from '@/views/pages/ui-kit/UiKitSelects.vue'
import UiKitSurfaces from '@/views/pages/ui-kit/UiKitSurfaces.vue'
import { useUiKitPage } from '@/scripts/pages/ui-kit/use-ui-kit-page'

const { themeIcon, themeText, toggleTheme } = useUiKitPage()
</script>
