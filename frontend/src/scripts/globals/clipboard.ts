/** Копирование текста в буфер обмена: Clipboard API, при недоступности — запасной путь через временное поле. */

/** Копирует через временный `textarea` и `execCommand('copy')` (нет HTTPS, нет прав на Clipboard API). */
function copyViaTextarea(text: string): boolean {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  try {
    area.select()
    // execCommand помечен устаревшим, но это единственный путь без HTTPS и прав на Clipboard API
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    return document.execCommand('copy')
  } finally {
    area.remove()
  }
}

/** Копирует текст в буфер; `true`, если получилось. Ошибки наружу не летят: вызывающий показывает сообщение. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Clipboard API отказал (нет прав, не HTTPS): пробуем запасной путь
  }
  try {
    return copyViaTextarea(text)
  } catch {
    return false
  }
}
