/** Логика фрагмента UiKitPanelParts: данные и состояние витрины для UiField, UiPanelSection, UiChips и UiDropdown. */
import { ref, type Ref } from 'vue'
import type { UiChipOption } from '@/scripts/components/ui-chips/ui-chips.types'
import type { UiDropdownItem } from '@/scripts/components/ui-dropdown/ui-dropdown.types'

/** Пресеты ширины превью. */
const WIDTH_PRESETS: UiChipOption[] = ['1920', '1440', '1280', '1024', '480'].map((width) => ({
  value: width,
  label: width,
}))

/** Пресеты колонок сетки; последний недоступен, чтобы показать disabled-чип. */
const COLUMN_PRESETS: UiChipOption[] = [
  { value: '1fr 1fr', label: '1fr ×2' },
  { value: '1fr 1fr 1fr', label: '1fr ×3' },
  { value: '250px 1fr', label: '250px 1fr' },
  { value: 'auto', label: 'auto', disabled: true },
]

/** Действия меню (как внизу панели свойств). */
const MENU_ITEMS: UiDropdownItem[] = [
  { value: 'up', label: 'Выше' },
  { value: 'down', label: 'Ниже', disabled: true },
  { value: 'duplicate', label: 'Дублировать' },
  { value: 'delete', label: 'Удалить', danger: true },
]

/** Возвращает варианты и значения для витрины. */
export function useUiKitPanelParts(): {
  widthPresets: UiChipOption[]
  columnPresets: UiChipOption[]
  menuItems: UiDropdownItem[]
  width: Ref<string | null>
  columns: Ref<string | null>
  fieldText: Ref<string>
  blockOpen: Ref<boolean>
  containerOpen: Ref<boolean>
  lastAction: Ref<string>
} {
  return {
    widthPresets: WIDTH_PRESETS,
    columnPresets: COLUMN_PRESETS,
    menuItems: MENU_ITEMS,
    width: ref<string | null>('1440'),
    columns: ref<string | null>(null),
    fieldText: ref('Блок-1'),
    blockOpen: ref(true),
    containerOpen: ref(false),
    lastAction: ref('—'),
  }
}
