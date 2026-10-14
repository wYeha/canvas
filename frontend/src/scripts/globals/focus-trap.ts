/** Фокус-ловушка для модальных окон: чистый расчёт следующего элемента по Tab и сбор фокусируемых элементов. */

/** Селектор элементов, на которые можно перейти по Tab. */
export const TABBABLE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[tabindex]',
  '[contenteditable="true"]',
].join(',')

/**
 * Возвращает индекс элемента, на который нужно перевести фокус по Tab (Shift — назад) внутри ловушки.
 * Фокус идёт по кругу; если фокус вне списка (current = -1), Tab ведёт на первый, Shift+Tab — на последний.
 * Пустой список даёт -1.
 */
export function nextFocusIndex(count: number, current: number, backwards: boolean): number {
  if (count === 0) return -1
  if (current < 0) return backwards ? count - 1 : 0
  const step = backwards ? -1 : 1
  return (current + step + count) % count
}

/** Проверяет, скрыт ли сам элемент или его предок: hidden, inert, display:none, visibility:hidden, отключённый fieldset. */
function isHiddenOrInert(element: Element): boolean {
  const style = getComputedStyle(element)
  if (style.visibility === 'hidden' || style.visibility === 'collapse') return true
  // Проверка по цепочке предков надёжнее getClientRects: работает и в браузере, и в happy-dom
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (node.hasAttribute('hidden') || node.hasAttribute('inert')) return true
    if (getComputedStyle(node).display === 'none') return true
    if (node !== element && node.tagName === 'FIELDSET' && node.hasAttribute('disabled')) return true
  }
  return false
}

/** Проверяет, можно ли перейти на элемент по Tab: он не отключён, не исключён через tabindex=-1 и видим. */
export function isTabbable(element: Element): boolean {
  if (element.hasAttribute('disabled') || element.getAttribute('tabindex') === '-1') return false
  return !isHiddenOrInert(element)
}

/** Собирает элементы контейнера, доступные по Tab, в порядке документа. */
export function getTabbable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)).filter(isTabbable)
}
