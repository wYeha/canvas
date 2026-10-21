/**
 * Composable системного буфера обмена для Ctrl+C / Ctrl+V канваса (17.4). Хоткеи не отменяют нажатие, поэтому
 * браузер присылает события `copy` / `paste` — в них буфер доступен синхронно и без запроса разрешений: при
 * копировании текст фрагмента кладётся в буфер, при вставке читается оттуда (в том числе скопированный в другой
 * вкладке). Если браузер события не прислал (бывает без выделенного текста), на следующем такте срабатывает запасной
 * путь: копия пишется через Clipboard API (если браузер позволит) и уже лежит во внутреннем буфере, вставка берётся
 * из внутреннего.
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { CLIPBOARD_TEXT_TYPE } from './constants'
import { useCanvasClipboard } from './use-canvas-clipboard'

/** Команда буфера из хоткея. */
export type ClipboardCommand = 'copy' | 'paste'

/** Подключает события буфера; возвращает `begin` — его вызывает хоткей Ctrl+C / Ctrl+V вместо самого действия. */
export function useCanvasSystemClipboard(): { begin: (command: ClipboardCommand) => boolean } {
  const { copySelected, pasteClipboard } = useCanvasClipboard()
  /** Текст фрагмента, ждущий события `copy`. */
  let pendingCopy: string | null = null
  /** Вставка ждёт события `paste`. */
  let pendingPaste = false

  /**
   * Начинает копирование или вставку по хоткею; `true`, если команда принята (тогда нажатие не отменяется — нужны
   * события буфера). Копирование без выделения не принимается.
   */
  function begin(command: ClipboardCommand): boolean {
    if (command === 'copy') {
      pendingCopy = copySelected()
      if (pendingCopy === null) return false
    } else {
      pendingPaste = true
    }
    // Запасной путь: события не было — копия уже во внутреннем буфере, вставка — из него
    setTimeout(settle, 0)
    return true
  }

  /**
   * Пишет текст в системный буфер через Clipboard API (без события `copy`). Не вышло (нет API, нет разрешения) —
   * не страшно: копия уже во внутреннем буфере, вставка в этой вкладке её найдёт.
   */
  async function writeFallback(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Запасной путь — внутренний буфер, сообщать нечего
    }
  }

  /** Завершает команду, для которой браузер не прислал событие буфера. */
  function settle(): void {
    if (pendingCopy !== null) void writeFallback(pendingCopy)
    pendingCopy = null
    if (!pendingPaste) return
    pendingPaste = false
    pasteClipboard(null)
  }

  /** Событие `copy` после Ctrl+C на канвасе: текст фрагмента — в системный буфер. */
  function onCopy(e: ClipboardEvent): void {
    if (pendingCopy === null || e.clipboardData === null) return
    e.clipboardData.setData(CLIPBOARD_TEXT_TYPE, pendingCopy)
    e.preventDefault()
    pendingCopy = null
  }

  /** Событие `paste` после Ctrl+V на канвасе: фрагмент из системного буфера (или запасной внутренний). */
  function onPaste(e: ClipboardEvent): void {
    if (!pendingPaste) return
    pendingPaste = false
    const text = e.clipboardData?.getData(CLIPBOARD_TEXT_TYPE) ?? null
    if (pasteClipboard(text)) e.preventDefault()
  }

  onMounted(() => {
    window.addEventListener('copy', onCopy)
    window.addEventListener('paste', onPaste)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('copy', onCopy)
    window.removeEventListener('paste', onPaste)
  })

  return { begin }
}
