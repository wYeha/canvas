/**
 * Composable страницы canvas: запускает документы (сохранённые или демо по `?demo`), дописывает сохранение
 * при уходе со страницы и возвращает камеру при каждой смене документа (вписать всё; пустой — в начало).
 */
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useCameraStore } from './camera-store'
import { useDocumentsStore } from './documents-store'
import { isDemoRequested } from './save-status'

/** Событие страницы, при котором дописываем отложенное сохранение (закрытие вкладки, уход со страницы). */
const PAGE_HIDE_EVENT = 'pagehide'

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
    fitWhenMeasured()
  })
  onBeforeUnmount(() => {
    window.removeEventListener(PAGE_HIDE_EVENT, flushOnHide)
    documents.flush()
  })
}
