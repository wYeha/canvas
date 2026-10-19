<!-- Фрагмент страницы ui-kit: UiTextInput, UiTextarea, UiNumberInput, UiSwitch и UiCheckbox во всех вариантах и состояниях -->
<template>
  <UiKitSection title="UiTextInput">
    <div class="ui-kit-inputs__row">
      <UiTextInput v-model="text" class="ui-kit-inputs__field" label="Обычное" />
      <UiTextInput class="ui-kit-inputs__field" label="С подсказкой" placeholder="Подпись блока" />
      <UiTextInput class="ui-kit-inputs__field" label="С префиксом" prefix="gap" mono model-value="8" />
      <UiTextInput class="ui-kit-inputs__field" label="С суффиксом" suffix="px" mono model-value="8" />
      <UiTextInput class="ui-kit-inputs__field" label="Ошибка" error model-value="1fr 1fr 1fr 1fr" />
      <UiTextInput class="ui-kit-inputs__field" label="Disabled" disabled model-value="Недоступно" />
    </div>
    <span class="ui-kit-inputs__value">значение: «{{ text }}»</span>
  </UiKitSection>
  <UiKitSection title="UiTextarea (многострочное, ресайз по вертикали)">
    <div class="ui-kit-inputs__row">
      <UiTextarea v-model="area" class="ui-kit-inputs__field" label="Обычное" placeholder="Что будет внутри" />
      <UiTextarea class="ui-kit-inputs__field" label="Ошибка" error model-value="Слишком длинно" />
      <UiTextarea class="ui-kit-inputs__field" label="Disabled" disabled model-value="Недоступно" />
    </div>
    <span class="ui-kit-inputs__value">значение: «{{ area }}»</span>
  </UiKitSection>
  <UiKitSection title="UiNumberInput (↑/↓ шаг, Shift ×10, Enter/blur — фиксация, Esc — отмена)">
    <div class="ui-kit-inputs__row">
      <UiNumberInput
        v-for="unit in UI_NUMBER_UNITS"
        :key="unit"
        v-model="number"
        class="ui-kit-inputs__field"
        :label="`Число, ${unit}`"
        :unit="unit"
        :min="0"
        :max="100"
      />
      <UiNumberInput v-model="number" class="ui-kit-inputs__field" label="С префиксом" prefix="↔" unit="px" />
      <UiNumberInput
        v-model="emptyNumber"
        class="ui-kit-inputs__field"
        label="Пустое значение"
        placeholder="auto"
        unit="px"
      />
      <UiNumberInput class="ui-kit-inputs__field" label="Ошибка" error unit="px" :model-value="-4" />
      <UiNumberInput class="ui-kit-inputs__field" label="Disabled" disabled unit="px" :model-value="12" />
    </div>
    <span class="ui-kit-inputs__value">значения: {{ number }} / {{ emptyNumber ?? 'null' }}</span>
  </UiKitSection>
  <UiKitSection title="UiSwitch (Space/Enter — переключить)">
    <div class="ui-kit-inputs__row">
      <UiSwitch v-model="enabled" label="Включён" />
      <UiSwitch label="Выключен" :model-value="false" />
      <UiSwitch label="Disabled" disabled :model-value="true" />
    </div>
    <span class="ui-kit-inputs__value">значение: {{ enabled }}</span>
  </UiKitSection>
  <UiKitSection title="UiCheckbox (клик по флажку или подписи, Space)">
    <div class="ui-kit-inputs__row">
      <UiCheckbox v-model="checked" label="Отмечен" />
      <UiCheckbox label="Не отмечен" :model-value="false" />
      <UiCheckbox label="Disabled" disabled :model-value="true" />
    </div>
    <span class="ui-kit-inputs__value">значение: {{ checked }}</span>
  </UiKitSection>
</template>

<script setup lang="ts">
import UiCheckbox from '@/views/components/ui-checkbox/UiCheckbox.vue'
import UiKitSection from '@/views/pages/ui-kit/UiKitSection.vue'
import UiNumberInput from '@/views/components/ui-number-input/UiNumberInput.vue'
import UiSwitch from '@/views/components/ui-switch/UiSwitch.vue'
import UiTextarea from '@/views/components/ui-textarea/UiTextarea.vue'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
import { UI_NUMBER_UNITS } from '@/scripts/components/ui-number-input/ui-number-input.constants'
import { useUiKitInputs } from '@/scripts/pages/ui-kit/use-ui-kit-inputs'

const { text, area, number, emptyNumber, enabled, checked } = useUiKitInputs()
</script>
