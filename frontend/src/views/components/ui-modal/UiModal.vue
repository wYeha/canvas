<!-- Общий компонент: модальное окно (Teleport в body), закрытие по Esc и клику по оверлею, фокус-ловушка -->
<template>
  <Teleport to="body">
    <div v-if="open" class="ui-modal" @mousedown.self="close">
      <div
        ref="dialog"
        :class="dialogClasses"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        :aria-labelledby="titleId"
        @keydown="onKeydown"
      >
        <header class="ui-modal__header">
          <h2 :id="titleId" class="ui-modal__title">{{ title }}</h2>
          <UiIconButton icon="close" label="Закрыть" @click="close" />
        </header>
        <div class="ui-modal__body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="ui-modal__footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'
import type { UiModalProps } from '@/scripts/components/ui-modal/ui-modal.types'
import { useUiModal } from '@/scripts/components/ui-modal/use-ui-modal'

const props = defineProps<UiModalProps>()
// true — окно показано; закрытие (Esc, оверлей, крестик) сбрасывает значение в false
const open = defineModel<boolean>('open', { default: false })
const { dialog, titleId, dialogClasses, close, onKeydown } = useUiModal(props, open)
</script>
