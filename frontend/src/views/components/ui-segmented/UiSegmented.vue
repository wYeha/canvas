<!-- Общий компонент: переключатель вариантов в одну строку (radiogroup); сегмент — текст, иконка или слот -->
<template>
  <div
    ref="root"
    v-bind="inputAttrs"
    class="ui-segmented"
    :class="{ 'ui-segmented--disabled': disabled }"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <button
      v-for="(option, index) in options"
      :key="option.value"
      class="ui-segmented__item"
      :class="{
        'ui-segmented__item--selected': option.value === model,
        'ui-segmented__item--icon': isIconOnly(option),
      }"
      type="button"
      role="radio"
      :aria-checked="option.value === model"
      :aria-label="isIconOnly(option) ? option.label : undefined"
      :title="isIconOnly(option) ? option.label : undefined"
      :tabindex="index === tabbableIndex ? 0 : -1"
      :disabled="disabled || option.disabled"
      @mousedown="keepFocusOnMouseDown"
      @click="select(index)"
      @keydown="onKeydown($event, index)"
    >
      <slot name="option" :option="option">
        <UiIcon v-if="option.icon" :name="option.icon" />
        <span v-if="!isIconOnly(option)">{{ option.label }}</span>
      </slot>
    </button>
  </div>
</template>

<script setup lang="ts">
import UiIcon from '@/views/components/ui-icon/UiIcon.vue'
import type { UiSegmentedProps } from '@/scripts/components/ui-segmented/ui-segmented.types'
import { isIconOnly, useUiSegmented } from '@/scripts/components/ui-segmented/use-ui-segmented'
import { keepFocusOnMouseDown } from '@/scripts/globals/focus'

const props = defineProps<UiSegmentedProps>()
const model = defineModel<string | null>({ default: null })
const { root, ariaLabel, tabbableIndex, select, onKeydown } = useUiSegmented(props, model)
</script>
