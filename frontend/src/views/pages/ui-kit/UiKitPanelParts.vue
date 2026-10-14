<!-- Фрагмент страницы ui-kit: UiField, UiPanelSection, UiChips и UiDropdown -->
<template>
  <UiKitSection title="UiField (label→control по id, подсказка, ошибка)">
    <div class="ui-kit-panel-parts__row">
      <UiField v-slot="{ id, describedBy, invalid }" class="ui-kit-panel-parts__field" label="Подпись">
        <UiTextInput
          v-model="fieldText"
          label="Подпись"
          :error="invalid"
          :input-attrs="{ id, 'aria-describedby': describedBy }"
        />
      </UiField>
      <UiField
        v-slot="{ id, describedBy, invalid }"
        class="ui-kit-panel-parts__field"
        label="С подсказкой"
        hint="В пикселях"
      >
        <UiTextInput label="С подсказкой" :error="invalid" :input-attrs="{ id, 'aria-describedby': describedBy }" />
      </UiField>
      <UiField
        v-slot="{ id, describedBy, invalid }"
        class="ui-kit-panel-parts__field"
        label="С ошибкой"
        error="Только число"
      >
        <UiTextInput
          label="С ошибкой"
          :error="invalid"
          model-value="abc"
          :input-attrs="{ id, 'aria-describedby': describedBy }"
        />
      </UiField>
    </div>
  </UiKitSection>
  <UiKitSection title="UiPanelSection (в панели; v-model:open)">
    <UiPanel class="ui-kit-panel-parts__panel" title="Свойства">
      <UiPanelSection v-model:open="blockOpen" title="Блок" hint="div">
        <UiField v-slot="{ id, describedBy }" label="Подпись">
          <UiTextInput v-model="fieldText" label="Подпись" :input-attrs="{ id, 'aria-describedby': describedBy }" />
        </UiField>
      </UiPanelSection>
      <UiPanelSection v-model:open="containerOpen" title="Контейнер" hint="flex">
        <UiEmptyState text="Содержимое секции" />
      </UiPanelSection>
    </UiPanel>
    <span class="ui-kit-panel-parts__value">блок: {{ blockOpen }}, контейнер: {{ containerOpen }}</span>
  </UiKitSection>
  <UiKitSection title="UiChips (пресеты)">
    <UiChips v-model="width" label="Ширина превью" :options="widthPresets" />
    <UiChips v-model="columns" label="Колонки" :options="columnPresets" />
    <UiChips label="Disabled" disabled :options="widthPresets" model-value="1440" />
    <span class="ui-kit-panel-parts__value">ширина: {{ width }}, колонки: {{ columns ?? 'null' }}</span>
  </UiKitSection>
  <UiKitSection title="UiDropdown (↓/↑ открыть, Enter/Space выбрать, Esc, клик мимо)">
    <UiDropdown label="Действия" :items="menuItems" @select="lastAction = $event">
      <template #trigger="{ attrs }">
        <UiButton v-bind="attrs" icon-after="chevron-down">Действия</UiButton>
      </template>
    </UiDropdown>
    <span class="ui-kit-panel-parts__value">последнее действие: {{ lastAction }}</span>
  </UiKitSection>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiChips from '@/views/components/ui-chips/UiChips.vue'
import UiDropdown from '@/views/components/ui-dropdown/UiDropdown.vue'
import UiEmptyState from '@/views/components/ui-empty-state/UiEmptyState.vue'
import UiField from '@/views/components/ui-field/UiField.vue'
import UiKitSection from '@/views/pages/ui-kit/UiKitSection.vue'
import UiPanel from '@/views/components/ui-panel/UiPanel.vue'
import UiPanelSection from '@/views/components/ui-panel-section/UiPanelSection.vue'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
import { useUiKitPanelParts } from '@/scripts/pages/ui-kit/use-ui-kit-panel-parts'

const { widthPresets, columnPresets, menuItems, width, columns, fieldText, blockOpen, containerOpen, lastAction } =
  useUiKitPanelParts()
</script>
