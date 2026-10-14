/** Логика компонента UiDropdown: меню действий поверх общего всплывающего списка (menu/menuitem-паттерн). */
import { computed, useId, type ComputedRef } from 'vue'
import type { UiDropdownProps, UiDropdownTriggerAttrs } from '@/scripts/components/ui-dropdown/ui-dropdown.types'
import { firstEnabledIndex, lastEnabledIndex } from '@/scripts/globals/list-nav'
import { usePopupList, type PopupList } from '@/scripts/globals/use-popup-list'

/** Состояние меню: общий всплывающий список плюс id и ARIA триггера. */
export interface UiDropdownState extends Omit<PopupList, 'anchor'> {
  trigger: PopupList['anchor']
  menuId: string
  activeId: ComputedRef<string | undefined>
  triggerAttrs: ComputedRef<UiDropdownTriggerAttrs>
  itemId: (index: number) => string
  choose: (index: number) => void
}

/** Возвращает состояние и обработчики меню; ссылки root, trigger и list привязываются в шаблоне по имени. */
export function useUiDropdown(
  props: Readonly<UiDropdownProps>,
  emit: (event: 'select', value: string) => void,
): UiDropdownState {
  const menuId = ['ui-dropdown', useId()].join('-')

  /** Выбирает пункт (если он доступен): сообщает значение и закрывает меню. */
  function choose(index: number): void {
    const item = props.items[index]
    if (!item || item.disabled) return
    emit('select', item.value)
    popup.close(true)
  }

  const popup = usePopupList({
    /** Пункты меню. */
    items: () => props.items,
    /** Недоступность открытия. */
    disabled: () => props.disabled === true,
    /** ↓ открывает на первом доступном пункте, ↑ — на последнем (APG). */
    initialIndex: (fromEnd) => (fromEnd ? lastEnabledIndex(props.items) : firstEnabledIndex(props.items)),
    choose,
    matchWidth: false,
    wrap: true,
  })

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

  const { anchor: trigger, ...rest } = popup
  return { ...rest, trigger, menuId, activeId, triggerAttrs, itemId, choose }
}
