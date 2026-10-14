<!-- Фрагмент страницы ui-kit: UiTextInput, UiNumberInput и UiSwitch во всех вариантах и состояниях -->
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
      <UiNumberInput v-model="number" class="ui-kit-inputs__field" label="С префиксом" prefix="padding" unit="px" />
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
</template>

<script setup lang="ts">
import UiKitSection from '@/views/pages/ui-kit/UiKitSection.vue'
import UiNumberInput from '@/views/components/ui-number-input/UiNumberInput.vue'
import UiSwitch from '@/views/components/ui-switch/UiSwitch.vue'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
import { UI_NUMBER_UNITS } from '@/scripts/components/ui-number-input/ui-number-input.constants'
import { useUiKitInputs } from '@/scripts/pages/ui-kit/use-ui-kit-inputs'

const { text, number, emptyNumber, enabled } = useUiKitInputs()
</script>
