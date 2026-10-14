/** Логика компонента UiSegmented: roving tabindex, выбор по клику и стрелкам (radiogroup-паттерн). */
import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue'
import type { UiSegmentedOption, UiSegmentedProps } from '@/scripts/components/ui-segmented/ui-segmented.types'
import { findEnabledIndex, firstEnabledIndex, lastEnabledIndex } from '@/scripts/globals/list-nav'

/** Селектор сегментов внутри корня группы (поиск идёт от template ref, а не от document). */
const RADIO_SELECTOR = '[role="radio"]'

/** Возвращает true, если сегмент показывает только иконку или слот. */
export function isIconOnly(option: UiSegmentedOption): boolean {
  return option.iconOnly ?? option.icon !== undefined
}

/** Возвращает состояние и обработчики переключателя; ссылка root привязывается в шаблоне по имени. */
export function useUiSegmented(
  props: Readonly<UiSegmentedProps>,
  model: Ref<string | null>,
): {
  root: Ref<HTMLElement | null>
  tabbableIndex: ComputedRef<number>
  select: (index: number) => void
  onKeydown: (event: KeyboardEvent, index: number) => void
} {
  const root = ref<HTMLElement | null>(null)

  // Единственный сегмент в порядке табуляции: выбранный, а если выбора нет — первый доступный
  const tabbableIndex = computed(() => {
    const selected = props.options.findIndex((option) => option.value === model.value)
    const selectedOption = props.options[selected]
    return selectedOption && !selectedOption.disabled ? selected : firstEnabledIndex(props.options)
  })

  /** Выбирает сегмент по индексу, если он доступен и группа не заблокирована. */
  function select(index: number): void {
    const option = props.options[index]
    if (props.disabled || !option || option.disabled) return
    model.value = option.value
  }

  /** Выбирает сегмент и переносит на него фокус (после обновления DOM). */
  function selectAndFocus(index: number): void {
    if (index < 0) return
    select(index)
    void nextTick(() => root.value?.querySelectorAll<HTMLElement>(RADIO_SELECTOR)[index]?.focus())
  }

  /** Находит целевой индекс по клавише: ←/↑ назад, →/↓ вперёд по кругу, Home/End — края; -1, если клавиша не наша. */
  function targetIndex(key: string, from: number): number {
    if (key === 'ArrowRight' || key === 'ArrowDown') return findEnabledIndex(props.options, from, 1, true)
    if (key === 'ArrowLeft' || key === 'ArrowUp') return findEnabledIndex(props.options, from, -1, true)
    if (key === 'Home') return firstEnabledIndex(props.options)
    if (key === 'End') return lastEnabledIndex(props.options)
    return -1
  }

  /** Клавиатура на сегменте: стрелки и Home/End двигают выбор, как у нативных radio. */
  function onKeydown(event: KeyboardEvent, index: number): void {
    const target = targetIndex(event.key, index)
    if (target < 0) return
    event.preventDefault()
    selectAndFocus(target)
  }

  return { root, tabbableIndex, select, onKeydown }
}
