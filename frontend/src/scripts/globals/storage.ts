/** Безопасная обёртка над localStorage: недоступное хранилище (приватный режим, квота) не ломает приложение. */

/** Читает строку по ключу; при ошибке доступа или отсутствии значения возвращает null. */
export function getStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Записывает строку по ключу; возвращает true, если запись удалась. */
export function setStorageItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
