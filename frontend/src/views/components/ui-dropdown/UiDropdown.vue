<!-- Общий компонент: меню действий (menu/menuitem) с кнопкой-триггером из слота, клавиатурой и закрытием по клику мимо -->
<template>
  <div ref="root" class="ui-dropdown">
    <span ref="trigger" class="ui-dropdown__trigger" @click="toggle" @keydown="onTriggerKeydown">
      <slot name="trigger" :attrs="triggerAttrs" :open="isOpen" />
    </span>
    <ul
      v-if="isOpen"
      :id="menuId"
      ref="list"
      class="ui-dropdown__menu"
      role="menu"
      tabindex="-1"
      :style="listStyle"
      :aria-label="label"
      :aria-activedescendant="activeId"
      @keydown="onMenuKeydown"
    >
      <li
        v-for="(item, index) in items"
        :id="itemId(index)"
        :key="item.value"
        class="ui-dropdown__item"
        :class="{
          'ui-dropdown__item--active': index === activeIndex,
          'ui-dropdown__item--danger': item.danger,
          'ui-dropdown__item--disabled': item.disabled,
        }"
        role="menuitem"
        :aria-disabled="item.disabled ? 'true' : undefined"
        @mousemove="setActive(index)"
        @click="choose(index)"
      >
        {{ item.label }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { UiDropdownEmits, UiDropdownProps } from '@/scripts/components/ui-dropdown/ui-dropdown.types'
import { useUiDropdown } from '@/scripts/components/ui-dropdown/use-ui-dropdown'

const props = defineProps<UiDropdownProps>()
const emit = defineEmits<UiDropdownEmits>()
const {
  root,
  trigger,
  list,
  isOpen,
  activeIndex,
  activeId,
  menuId,
  listStyle,
  triggerAttrs,
  itemId,
  setActive,
  choose,
  toggle,
  onTriggerKeydown,
  onMenuKeydown,
} = useUiDropdown(props, (event, value) => {
  emit(event, value)
})
</script>
