<!-- Общий компонент: секция панели свойств; заголовок-кнопка сворачивает содержимое (v-model:open) -->
<template>
  <section class="ui-panel-section">
    <h3 class="ui-panel-section__heading">
      <button
        class="ui-panel-section__toggle"
        type="button"
        :aria-expanded="open"
        :aria-controls="bodyId"
        @mousedown="keepFocusOnMouseDown"
        @click="toggle"
      >
        <UiIcon name="chevron-down" :class="chevronClasses" />
        <span class="ui-panel-section__title">{{ title }}</span>
        <span v-if="hint" class="ui-panel-section__hint">{{ hint }}</span>
      </button>
    </h3>
    <div v-show="open" :id="bodyId" class="ui-panel-section__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import UiIcon from '@/views/components/ui-icon/UiIcon.vue'
import type { UiPanelSectionProps } from '@/scripts/components/ui-panel-section/ui-panel-section.types'
import { useUiPanelSection } from '@/scripts/components/ui-panel-section/use-ui-panel-section'
import { keepFocusOnMouseDown } from '@/scripts/globals/focus'

defineProps<UiPanelSectionProps>()
// true — секция раскрыта; запоминание состояния делает родитель (панель свойств, этап 3.0)
const open = defineModel<boolean>('open', { default: true })
const { bodyId, toggle, chevronClasses } = useUiPanelSection(open)
</script>
