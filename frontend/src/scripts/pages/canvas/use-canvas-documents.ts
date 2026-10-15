/**
 * Composable страницы canvas: запускает документы (сохранённые или демо по `?demo`), дописывает сохранение
 * при уходе со страницы и скрытии вкладки, следит за индексом из других вкладок и возвращает камеру при каждой смене документа (вписать всё; пустой — в начало).
 */
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useCameraStore } from './camera-store'
import { PAGE_HIDE_EVENT, STORAGE_EVENT, VISIBILITY_CHANGE_EVENT } from './documents-constants'
import { DOCUMENTS_INDEX_STORAGE_KEY } from '@/scripts/globals/constants'
import { useDocumentsStore } from './documents-store'
import { isDemoRequested } from './save-status'

/** Запускает документы и привязывает к ним камеру и сохранение при закрытии страницы. */
export function useCanvasDocuments(): void {
  const documents = useDocumentsStore()
  const camera = useCameraStore()

  /** Вписывает все корни после отрисовки (nextTick: высоты корней замеряются при их монтировании). */
  function fitAfterRender(): void {
    void nextTick(() => {
      camera.fitAll()
    })
  }

  /** Вписывает документ; если viewport ещё не измерен (вписывать некуда), ждёт первого замера. */
  function fitWhenMeasured(): void {
    if (camera.viewportSize.width > 0) {
      fitAfterRender()
      return
    }
    const stop = watch(
      () => camera.viewportSize.width > 0,
      (measured) => {
        if (!measured) return
        stop()
        fitAfterRender()
      },
    )
  }

  /** Дописывает отложенное сохранение, пока страница ещё жива. */
  function flushOnHide(): void {
    documents.flush()
  }

  /** Вкладка скрыта (на мобильных и при переключении вкладок `pagehide` может не прийти): дописываем сохранение. */
  function flushOnVisibility(): void {
    if (document.visibilityState === 'hidden') documents.flush()
  }

  /** Другая вкладка изменила индекс документов: обновляем список (`key === null` — хранилище очищено). */
  function onStorage(event: StorageEvent): void {
    if (event.key === null || event.key === DOCUMENTS_INDEX_STORAGE_KEY) documents.refreshIndex()
  }

  documents.init({ demo: isDemoRequested(window.location.search, import.meta.env.DEV) })
  // Смена документа: после отрисовки новых корней (их высоты замеряются при монтировании) вписываем всё
  watch(
    () => documents.loadSeq,
    () => {
      fitWhenMeasured()
    },
    { flush: 'post' },
  )
  onMounted(() => {
    window.addEventListener(PAGE_HIDE_EVENT, flushOnHide)
    document.addEventListener(VISIBILITY_CHANGE_EVENT, flushOnVisibility)
    window.addEventListener(STORAGE_EVENT, onStorage)
    fitWhenMeasured()
  })
  onBeforeUnmount(() => {
    window.removeEventListener(PAGE_HIDE_EVENT, flushOnHide)
    document.removeEventListener(VISIBILITY_CHANGE_EVENT, flushOnVisibility)
    window.removeEventListener(STORAGE_EVENT, onStorage)
    documents.flush()
  })
}
