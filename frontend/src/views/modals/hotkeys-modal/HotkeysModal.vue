<!-- Модалка горячих клавиш: таблица «Клавиша — Действие», сгруппированная по разделам руководства -->
<template>
  <UiModal v-model:open="open" :title="HOTKEYS_MODAL_TITLE" size="compact">
    <section v-for="group in groups" :key="group.title" class="hotkeys-modal__group">
      <h3 class="hotkeys-modal__title">{{ group.title }}</h3>
      <table class="hotkeys-modal__table">
        <tbody>
          <tr v-for="row in group.rows" :key="row.keys">
            <td class="hotkeys-modal__keys">
              <template v-for="(part, index) in row.parts" :key="index">
                <kbd v-if="part.kind === 'key'" class="hotkeys-modal__key">{{ part.text }}</kbd>
                <span v-else class="hotkeys-modal__sep">{{ part.text }}</span>
              </template>
            </td>
            <td class="hotkeys-modal__action">{{ row.action }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </UiModal>
</template>

<script setup lang="ts">
import UiModal from '@/views/components/ui-modal/UiModal.vue'
import { HOTKEYS_MODAL_TITLE } from '@/scripts/modals/hotkeys-modal/hotkeys-modal.constants'
import { useHotkeysModal } from '@/scripts/modals/hotkeys-modal/use-hotkeys-modal'

// true — окно показано; закрытие (Esc, оверлей, крестик) сбрасывает значение в false
const open = defineModel<boolean>('open', { default: false })
const { groups } = useHotkeysModal()
</script>
