/** Действия окна экспорта: копирование (кнопка на 2 с становится «Скопировано») и скачивание файла. */
import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { copyText } from '@/scripts/globals/clipboard'
import { downloadText } from '@/scripts/globals/download'
import { wrapHtmlDocument } from '@/scripts/pages/canvas/export/export-file'
import { EXPORT_COPIED_MS, EXPORT_COPY_FAILED, EXPORT_DOWNLOAD_FAILED } from './export-modal.constants'

/** MIME-тип скачиваемого файла. */
const HTML_MIME = 'text/html'

/** Результат `useExportActions`. */
export interface ExportActionsState {
  /** Показывать ли «Скопировано» (2 с после успешного копирования). */
  copied: Ref<boolean>
  /** Сообщение об ошибке копирования или скачивания; пусто — всё хорошо. */
  actionError: Ref<string>
  /** Копирует текст в буфер; окно не закрывается. */
  copy: () => Promise<void>
  /** Скачивает полный HTML-документ. */
  download: () => void
}

/** Действия над готовым текстом экспорта; таймер «Скопировано» чистится при закрытии окна и размонтировании. */
export function useExportActions(
  open: Ref<boolean>,
  text: Ref<string>,
  fileName: Ref<string>,
  docName: Ref<string>,
): ExportActionsState {
  const copied = ref(false)
  const actionError = ref('')
  let timer: ReturnType<typeof setTimeout> | null = null
  let unmounted = false

  /** Останавливает таймер возврата кнопки и снимает «Скопировано». */
  function resetCopied(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
    copied.value = false
  }

  /** Копирует; успех включает «Скопировано» на 2 с (повторный клик перезапускает таймер), ошибка — сообщение. */
  async function copy(): Promise<void> {
    const ok = await copyText(text.value)
    // Пока копировали, окно могли закрыть: не включаем «Скопировано» и не заводим таймер
    if (unmounted || !open.value) return
    actionError.value = ok ? '' : EXPORT_COPY_FAILED
    resetCopied()
    if (!ok) return
    copied.value = true
    timer = setTimeout(resetCopied, EXPORT_COPIED_MS)
  }

  /** Скачивает `{имя}.html`: полный HTML-документ с тем же текстом, что копируется. */
  function download(): void {
    const ok = downloadText(fileName.value, wrapHtmlDocument(text.value, docName.value), HTML_MIME)
    actionError.value = ok ? '' : EXPORT_DOWNLOAD_FAILED
  }

  watch(open, (isOpen) => {
    if (isOpen) return
    resetCopied()
    actionError.value = ''
  })
  onBeforeUnmount(() => {
    unmounted = true
    resetCopied()
  })

  return { copied, actionError, copy, download }
}
