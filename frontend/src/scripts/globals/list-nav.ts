/** Чистая навигация по спискам вариантов (UiSelect, UiSegmented): соседний доступный пункт, края, поиск по первой букве. */

/** Пункт списка: для навигации важна только недоступность. */
export interface NavItem {
  disabled?: boolean
}

/** Подпись пункта вместе с признаком недоступности (для поиска по буквам). */
export interface LabeledNavItem extends NavItem {
  label: string
}

/**
 * Ищет ближайший доступный пункт от индекса `from` в направлении `step`; -1, если подходящего нет.
 * `from = -1` с шагом +1 даёт первый доступный, с шагом −1 (при wrap) — последний.
 * С wrap поиск идёт по кругу, без wrap упирается в край.
 */
export function findEnabledIndex(items: readonly NavItem[], from: number, step: 1 | -1, wrap: boolean): number {
  const count = items.length
  const start = from < 0 && step < 0 ? count : from
  for (let offset = 1; offset <= count; offset++) {
    const raw = start + step * offset
    if (!wrap && (raw < 0 || raw >= count)) return -1
    const index = ((raw % count) + count) % count
    if (!items[index]?.disabled) return index
  }
  return -1
}

/** Возвращает индекс первого доступного пункта или -1. */
export function firstEnabledIndex(items: readonly NavItem[]): number {
  return findEnabledIndex(items, -1, 1, false)
}

/** Возвращает индекс последнего доступного пункта или -1. */
export function lastEnabledIndex(items: readonly NavItem[]): number {
  return findEnabledIndex(items, items.length, -1, false)
}

/** Ищет следующий после `from` доступный пункт, подпись которого начинается с символа (по кругу); -1, если нет. */
export function typeaheadIndex(items: readonly LabeledNavItem[], from: number, char: string): number {
  const needle = char.toLowerCase()
  for (let offset = 1; offset <= items.length; offset++) {
    const index = (from + offset) % items.length
    const item = items[index]
    if (item && !item.disabled && item.label.toLowerCase().startsWith(needle)) return index
  }
  return -1
}
