<!-- Общий компонент: выпадающий список (listbox) с клавиатурой, typeahead и закрытием по клику мимо -->
<template>
  <div ref="root" :class="classes">
    <button
      ref="trigger"
      class="ui-select__button"
      type="button"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? listId : undefined"
      :aria-label="label"
      :aria-invalid="error ? 'true' : undefined"
      :disabled="disabled"
      v-bind="inputAttrs"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <span class="ui-select__value" :class="{ 'ui-select__value--placeholder': !hasValue }">{{ selectedLabel }}</span>
      <UiIcon name="chevron-down" class="ui-select__chevron" />
    </button>
    <ul
      v-if="isOpen"
      :id="listId"
      ref="list"
      class="ui-select__list"
      role="listbox"
      tabindex="-1"
      :style="listStyle"
      :aria-label="label"
      :aria-activedescendant="activeId"
      @keydown="onListKeydown"
    >
      <li
        v-for="(option, index) in options"
        :id="optionId(index)"
        :key="option.value"
        class="ui-select__option"
        :class="{
          'ui-select__option--active': index === activeIndex,
          'ui-select__option--selected': index === selectedIndex,
          'ui-select__option--disabled': option.disabled,
        }"
        role="option"
        :aria-selected="index === selectedIndex"
        :aria-disabled="option.disabled ? 'true' : undefined"
        @mousemove="setActive(index)"
        @click="choose(index)"
      >
        {{ option.label }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import UiIcon from '@/views/components/ui-icon/UiIcon.vue'
import type { UiSelectProps } from '@/scripts/components/ui-select/ui-select.types'
import { useUiSelect, useUiSelectClasses } from '@/scripts/components/ui-select/use-ui-select'

const props = defineProps<UiSelectProps>()
const model = defineModel<string | null>({ default: null })
const {
  root,
  trigger,
  list,
  isOpen,
  activeIndex,
  activeId,
  listId,
  listStyle,
  selectedIndex,
  selectedLabel,
  hasValue,
  optionId,
  setActive,
  choose,
  toggle,
  onTriggerKeydown,
  onListKeydown,
} = useUiSelect(props, model)
const { classes } = useUiSelectClasses(props, isOpen)
</script>
