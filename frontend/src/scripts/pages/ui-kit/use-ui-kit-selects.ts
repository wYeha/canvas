/** Логика фрагмента UiKitSelects: варианты и значения селектов и переключателей витрины. */
import { ref, type Ref } from 'vue'
import type { UiSegmentedOption } from '@/scripts/components/ui-segmented/ui-segmented.types'
import type { UiSelectOption } from '@/scripts/components/ui-select/ui-select.types'

/** Семантические теги блока (как в панели свойств); header сделан недоступным, чтобы показать disabled-пункт. */
const TAG_OPTIONS: UiSelectOption[] = ['div', 'header', 'aside', 'main', 'section', 'nav', 'footer'].map((tag) => ({
  value: tag,
  label: tag,
  disabled: tag === 'header',
}))

/** Направления flex с текстом; последний недоступен, чтобы показать disabled-сегмент. */
const DIRECTION_OPTIONS: UiSegmentedOption[] = [
  { value: 'row', label: 'row' },
  { value: 'column', label: 'column' },
  { value: 'row-reverse', label: 'row-reverse', disabled: true },
]

/** Иконочные сегменты: тип контейнера (подпись уходит в aria-label и title). */
const KIND_OPTIONS: UiSegmentedOption[] = [
  { value: 'flex', label: 'Flex', icon: 'flex' },
  { value: 'grid', label: 'Grid', icon: 'grid' },
]

/** Возвращает варианты и значения для витрины. */
export function useUiKitSelects(): {
  tagOptions: UiSelectOption[]
  directionOptions: UiSegmentedOption[]
  kindOptions: UiSegmentedOption[]
  tag: Ref<string | null>
  emptyTag: Ref<string | null>
  direction: Ref<string | null>
  kind: Ref<string | null>
} {
  return {
    tagOptions: TAG_OPTIONS,
    directionOptions: DIRECTION_OPTIONS,
    kindOptions: KIND_OPTIONS,
    tag: ref<string | null>('div'),
    emptyTag: ref<string | null>(null),
    direction: ref<string | null>('row'),
    kind: ref<string | null>('flex'),
  }
}
