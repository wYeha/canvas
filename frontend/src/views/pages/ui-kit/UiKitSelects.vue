<!-- Фрагмент страницы ui-kit: UiSelect и UiSegmented во всех вариантах и состояниях -->
<template>
  <UiKitSection title="UiSelect (↓/↑ открыть, Enter/Space выбрать, Esc, Home/End, буква — поиск)">
    <div class="ui-kit-selects__row">
      <UiSelect v-model="tag" class="ui-kit-selects__field" label="Тег" :options="tagOptions" />
      <UiSelect
        v-model="emptyTag"
        class="ui-kit-selects__field"
        label="Пустое значение"
        placeholder="Не выбрано"
        :options="tagOptions"
      />
      <UiSelect class="ui-kit-selects__field" label="Ошибка" error model-value="nav" :options="tagOptions" />
      <UiSelect class="ui-kit-selects__field" label="Disabled" disabled model-value="main" :options="tagOptions" />
    </div>
    <span class="ui-kit-selects__value">значения: {{ tag }} / {{ emptyTag ?? 'null' }}</span>
  </UiKitSection>
  <UiKitSection title="UiSegmented (←/→ выбор, Tab — один сегмент в порядке табуляции)">
    <div class="ui-kit-selects__row">
      <UiSegmented v-model="direction" class="ui-kit-selects__group" label="Текстовые" :options="directionOptions" />
      <UiSegmented v-model="kind" class="ui-kit-selects__group" label="Иконки" :options="kindOptions" />
      <UiSegmented class="ui-kit-selects__group" label="Disabled" disabled model-value="flex" :options="kindOptions" />
    </div>
    <span class="ui-kit-selects__value">значения: {{ direction }} / {{ kind }}</span>
  </UiKitSection>
</template>

<script setup lang="ts">
import UiKitSection from '@/views/pages/ui-kit/UiKitSection.vue'
import UiSegmented from '@/views/components/ui-segmented/UiSegmented.vue'
import UiSelect from '@/views/components/ui-select/UiSelect.vue'
import { useUiKitSelects } from '@/scripts/pages/ui-kit/use-ui-kit-selects'

const { tagOptions, directionOptions, kindOptions, tag, emptyTag, direction, kind } = useUiKitSelects()
</script>
