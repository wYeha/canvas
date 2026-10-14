/** Блокировка прокрутки страницы под модальными окнами: со счётчиком, чтобы вложенные окна не снимали её раньше времени. */

/** Значение overflow, скрывающее прокрутку. */
const HIDDEN_OVERFLOW = 'hidden'

/** Минимальный интерфейс элемента, у которого управляется overflow (позволяет тестировать без DOM). */
export interface ScrollLockTarget {
  style: { overflow: string }
}

/** Блокировка прокрутки: lock/unlock вызываются парно. */
export interface ScrollLock {
  lock: () => void
  unlock: () => void
}

/** Создаёт блокировку для элемента: первое lock запоминает overflow и скрывает прокрутку, последнее unlock возвращает. */
export function createScrollLock(target: ScrollLockTarget): ScrollLock {
  let count = 0
  let previous = ''
  return {
    /** Увеличивает счётчик; при первом вызове скрывает прокрутку. */
    lock(): void {
      if (count === 0) {
        previous = target.style.overflow
        target.style.overflow = HIDDEN_OVERFLOW
      }
      count += 1
    },
    /** Уменьшает счётчик; при последнем вызове возвращает прежний overflow. */
    unlock(): void {
      if (count === 0) return
      count -= 1
      if (count === 0) target.style.overflow = previous
    },
  }
}

/** Блокировка прокрутки страницы (body); создаётся лениво, чтобы модуль безопасно импортировался без DOM. */
let pageLock: ScrollLock | null = null

/** Возвращает общую блокировку прокрутки страницы. */
export function getPageScrollLock(): ScrollLock {
  pageLock ??= createScrollLock(document.body)
  return pageLock
}
