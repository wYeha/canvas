/**
 * Файлы .json в меню документов: скачивание текущего документа и открытие файла как нового документа.
 * Ошибки показываются тостом; при ошибке документ в редакторе не меняется.
 */
import { ref, type Ref } from 'vue'
import type { ParseDocumentResult } from '@shared'
import { downloadText } from '@/scripts/globals/download'
import { readFileText } from '@/scripts/globals/read-file'
import { useToastStore } from '@/scripts/globals/toast-store'
import { DOCUMENT_FILE_MIME, IMPORT_ERROR_PREFIX, IMPORT_ERROR_READ, SAVE_FILE_ERROR } from './documents-constants'
import { checkImportSize, documentFileName, parseImportText, serializeDocument } from './documents-files'
import { useDocumentsStore } from './documents-store'
import { useLayoutStore } from './layout-store'

/** Действия с файлами для меню документов. */
export interface CanvasDocsFiles {
  fileInput: Ref<HTMLInputElement | null>
  saveFile: () => void
  pickFile: () => void
  onFileChange: (event: Event) => void
}

/** Возвращает действия «Сохранить в .json» и «Открыть .json…»; `fileInput` привязывается в шаблоне по имени. */
export function useCanvasDocsFiles(): CanvasDocsFiles {
  const documents = useDocumentsStore()
  const layout = useLayoutStore()
  const toast = useToastStore()
  const fileInput = ref<HTMLInputElement | null>(null)

  /** Показывает ошибку открытия файла тостом «Файл не открыт: …». */
  function failOpen(reason: string): void {
    toast.show(`${IMPORT_ERROR_PREFIX}${reason}`)
  }

  /** Скачивает текущий документ файлом `<название>.layout.json`. */
  function saveFile(): void {
    const doc = layout.document
    const ok = downloadText(documentFileName(doc.name), serializeDocument(doc), DOCUMENT_FILE_MIME)
    if (!ok) toast.show(SAVE_FILE_ERROR)
  }

  /** Открывает системное окно выбора файла. */
  function pickFile(): void {
    fileInput.value?.click()
  }

  /** Читает файл и разбирает его: проверка размера, чтение, JSON, схема; ошибка — текст причины. */
  async function readImport(file: File): Promise<ParseDocumentResult> {
    const sizeError = checkImportSize(file.size)
    if (sizeError !== null) return { ok: false, error: sizeError }
    try {
      return parseImportText(await readFileText(file))
    } catch {
      return { ok: false, error: IMPORT_ERROR_READ }
    }
  }

  /** Добавляет документ из файла; любая ошибка — тост без изменения документа. */
  async function importFile(file: File): Promise<void> {
    const parsed = await readImport(file)
    if (!parsed.ok) {
      failOpen(parsed.error)
      return
    }
    const result = documents.importDocument(parsed.document)
    if (!result.ok) failOpen(result.error)
  }

  /** Обрабатывает выбор файла; значение поля сбрасывается, чтобы тот же файл можно было открыть повторно. */
  function onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (file) void importFile(file)
  }

  return { fileInput, saveFile, pickFile, onFileChange }
}
