/** Логика компонента UiDropdown: меню действий поверх общего всплывающего списка (menu/menuitem-паттерн). */
import { computed, useId, type ComputedRef } from 'vue'
import type { UiDropdownProps, UiDropdownTriggerAttrs } from '@/scripts/components/ui-dropdown/ui-dropdown.types'
import { firstEnabledIndex } from '@/scripts/globals/list-nav'
import { usePopupList, type PopupList } from '@/scripts/globals/use-popup-list'

/** Клавиши, открывающие меню с кнопки-триггера (Enter и Space открывают нативным click). */
const OPEN_KEYS = ['ArrowDown', 'ArrowUp']

/** Состояние меню: общий всплывающий список плюс id, ARIA триггера и обработчики. */
export interface UiDropdownState extends Omit<PopupList, 'anchor'> {
  trigger: PopupList['anchor']
  menuId: string
  activeId: ComputedRef<string | undefined>
  triggerAttrs: ComputedRef<UiDropdownTriggerAttrs>
  itemId: (index: number) => string
  choose: (index: number) => void
  onTriggerKeydown: (event: KeyboardEvent) => void
  onMenuKeydown: (event: KeyboardEvent) => void
}

/** Возвращает состояние и обработчики меню; ссылки root, trigger и list привязываются в шаблоне по имени. */
export function useUiDropdown(
  props: Readonly<UiDropdownProps>,
  emit: (event: 'select', value: string) => void,
): UiDropdownState {
  const popup = usePopupList({
    /** Пункты меню. */
    items: () => props.items,
    /** Недоступность открытия. */
    disabled: () => props.disabled === true,
    /** При открытии активен первый доступный пункт. */
    initialIndex: () => firstEnabledIndex(props.items),
    matchWidth: false,
    wrap: true,
  })
  const menuId = ['ui-dropdown', useId()].join('-')

  /** Возвращает id пункта меню для aria-activedescendant. */
  function itemId(index: number): string {
    return `${menuId}-item-${String(index)}`
  }

  const activeId = computed(() => (popup.activeIndex.value >= 0 ? itemId(popup.activeIndex.value) : undefined))
  const triggerAttrs = computed<UiDropdownTriggerAttrs>(() => ({
    'aria-haspopup': 'menu',
    'aria-expanded': popup.isOpen.value,
    'aria-controls': popup.isOpen.value ? menuId : undefined,
  }))

  /** Выбирает пункт (если он доступен): сообщает значение и закрывает меню. */
  function choose(index: number): void {
    const item = props.items[index]
    if (!item || item.disabled) return
    emit('select', item.value)
    popup.close(true)
  }

  /** Клавиатура на триггере: стрелки открывают меню. */
  function onTriggerKeydown(event: KeyboardEvent): void {
    if (!OPEN_KEYS.includes(event.key)) return
    event.preventDefault()
    popup.open()
  }

  /** Клавиатура в меню: навигация, Enter/Space — выбрать, Esc — закрыть, Tab — закрыть и уйти дальше. */
  function onMenuKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(popup.activeIndex.value)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      popup.close(true)
    } else if (event.key === 'Tab') {
      popup.close(true)
    } else if (popup.navigate(event)) {
      event.preventDefault()
    }
  }

  const { anchor: trigger, ...rest } = popup
  return { ...rest, trigger, menuId, activeId, triggerAttrs, itemId, choose, onTriggerKeydown, onMenuKeydown }
}
