<!-- Фрагмент страницы ui-kit: UiModal в размерах export и compact, кнопки открытия -->
<template>
  <UiKitSection title="UiModal (Esc и клик по оверлею закрывают, Tab ходит по кругу)">
    <div class="ui-kit-modal__row">
      <UiButton @click="exportOpen = true">Открыть export 1040×700</UiButton>
      <UiButton @click="compactOpen = true">Открыть compact</UiButton>
    </div>
    <UiModal v-model:open="exportOpen" title="Экспорт">
      <div class="ui-kit-modal__content">
        <UiTextInput label="Поле" placeholder="Первое поле" />
        <UiSelect v-model="tag" label="Тег" :options="tagOptions" />
      </div>
      <template #footer>
        <UiButton @click="exportOpen = false">Отмена</UiButton>
        <UiButton variant="primary" @click="exportOpen = false">Скопировать</UiButton>
      </template>
    </UiModal>
    <UiModal v-model:open="compactOpen" title="Удалить блок?" size="compact">
      <p>Блок и все вложенные блоки будут удалены.</p>
      <template #footer>
        <UiButton @click="compactOpen = false">Отмена</UiButton>
        <UiButton variant="danger" icon="trash" @click="compactOpen = false">Удалить</UiButton>
      </template>
    </UiModal>
  </UiKitSection>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiKitSection from '@/views/pages/ui-kit/UiKitSection.vue'
import UiModal from '@/views/components/ui-modal/UiModal.vue'
import UiSelect from '@/views/components/ui-select/UiSelect.vue'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
import { useUiKitModal } from '@/scripts/pages/ui-kit/use-ui-kit-modal'
import { useUiKitSelects } from '@/scripts/pages/ui-kit/use-ui-kit-selects'

const { exportOpen, compactOpen } = useUiKitModal()
const { tagOptions, tag } = useUiKitSelects()
</script>
