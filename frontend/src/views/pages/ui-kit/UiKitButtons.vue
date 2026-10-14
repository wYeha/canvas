<!-- Фрагмент страницы ui-kit: UiButton и UiIconButton во всех видах, размерах и состояниях -->
<template>
  <UiKitSection title="UiButton">
    <div v-for="size in UI_BUTTON_SIZES" :key="size" class="ui-kit-buttons__group">
      <div v-for="variant in UI_BUTTON_VARIANTS" :key="variant" class="ui-kit-buttons__row">
        <span class="ui-kit-buttons__caption">{{ variant }} / {{ size }}</span>
        <UiButton :variant="variant" :size="size">Текст</UiButton>
        <UiButton :variant="variant" :size="size" icon="plus">С иконкой</UiButton>
        <UiButton :variant="variant" :size="size" icon-after="chevron-down">Иконка справа</UiButton>
        <UiButton :variant="variant" :size="size" icon="flex" hint="F">С клавишей</UiButton>
        <UiButton :variant="variant" :size="size" disabled>Disabled</UiButton>
      </div>
    </div>
    <div class="ui-kit-buttons__row">
      <span class="ui-kit-buttons__caption">danger в панели</span>
      <UiButton variant="danger" icon="trash">Удалить</UiButton>
      <UiButton variant="danger" icon="trash" disabled>Удалить</UiButton>
    </div>
  </UiKitSection>
  <UiKitSection title="UiIconButton">
    <div v-for="size in UI_BUTTON_SIZES" :key="size" class="ui-kit-buttons__row">
      <span class="ui-kit-buttons__caption">size {{ size }}</span>
      <UiIconButton icon="undo" label="Отменить" :size="size" />
      <UiIconButton icon="redo" label="Повторить" :size="size" />
      <UiIconButton icon="trash" label="Удалить (disabled)" :size="size" disabled />
    </div>
  </UiKitSection>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'
import UiKitSection from '@/views/pages/ui-kit/UiKitSection.vue'
import { UI_BUTTON_SIZES, UI_BUTTON_VARIANTS } from '@/scripts/components/ui-button/ui-button.constants'
</script>
