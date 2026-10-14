/** Фокус при открытии окна экспорта: функция-ссылка на кнопку «Копировать» и её элемент для `UiModal.initialFocus`. */
import { shallowRef, type ShallowRef } from 'vue'

/** Результат `useExportCopyFocus`. */
export interface ExportCopyFocus {
  /** Элемент кнопки «Копировать»; `null`, пока она не отрисована. */
  copyEl: ShallowRef<HTMLElement | null>
  /** Функция-ссылка для `:ref` кнопки (экземпляр компонента или `null` при размонтировании). */
  setCopyButton: (instance: unknown) => void
}

/**
 * Запоминает DOM-элемент кнопки. `null` игнорируется: слот футера перерисовывается вместе с модалкой, и ссылка
 * на каждом проходе сбрасывалась бы в `null` и обратно, зацикливая обновления (проп `initialFocus` зависит от элемента).
 */
export function useExportCopyFocus(): ExportCopyFocus {
  const copyEl = shallowRef<HTMLElement | null>(null)

  /** Берёт корневой элемент компонента-кнопки. */
  function setCopyButton(instance: unknown): void {
    const el = (instance as { $el?: unknown } | null)?.$el
    if (el instanceof HTMLElement) copyEl.value = el
  }

  return { copyEl, setCopyButton }
}
