/**
 * Composable страницы canvas: запускает документы (сохранённые или демо по `?demo`), дописывает сохранение
 * при уходе со страницы и скрытии вкладки, следит за индексом из других вкладок, возвращает камеру при каждой смене документа (вписать всё; пустой — в начало),
 * сверяется с сервером при возврате на вкладку и появлении сети и уводит на вход, если сессия истекла.
 */
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/scripts/globals/auth-store'
import { LOGIN_REDIRECT_QUERY_PARAM, ROUTE_NAMES } from '@/scripts/globals/constants'
import { useCameraStore } from './camera-store'
import {
  ONLINE_EVENT,
  PAGE_HIDE_EVENT,
  STORAGE_EVENT,
  SYNC_RETRY_MS,
  VISIBILITY_CHANGE_EVENT,
} from './documents-constants'
import { DOCUMENTS_INDEX_STORAGE_KEY } from '@/scripts/globals/constants'
import { useDocumentsStore } from './documents-store'
import { isDemoRequested } from './save-status'

/** Запускает документы и привязывает к ним камеру и сохранение при закрытии страницы. */
export function useCanvasDocuments(): void {
  const documents = useDocumentsStore()
  const camera = useCameraStore()
  const auth = useAuthStore()
  const router = useRouter()
  const route = useRoute()

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

  /** Сверяется с сервером; если сервера не было (офлайн), сначала заново проверяет сессию — он мог появиться. */
  async function refreshRemote(): Promise<void> {
    if (auth.state === 'offline' && (await auth.recheck()) !== 'authenticated') return
    documents.refreshSync()
  }

  /** Вкладка скрыта (на мобильных и при переключении вкладок `pagehide` может не прийти): дописываем сохранение; снова видна — сверяемся с сервером. */
  function flushOnVisibility(): void {
    if (document.visibilityState === 'hidden') documents.flush()
    else void refreshRemote()
  }

  /** Сеть появилась: сверяемся с сервером. */
  function onOnline(): void {
    void refreshRemote()
  }

  /** Таймер перепроверки сервера в офлайне: кратковременный сбой при открытии не должен отключать сервер до перезагрузки. */
  let offlineTimer: ReturnType<typeof setInterval> | null = null

  /** В офлайне раз в `SYNC_RETRY_MS` проверяет, не появился ли сервер. */
  function recheckWhileOffline(): void {
    if (auth.state === 'offline') void refreshRemote()
  }

  /** Другая вкладка изменила индекс документов: обновляем список (`key === null` — хранилище очищено). */
  function onStorage(event: StorageEvent): void {
    if (event.key === null || event.key === DOCUMENTS_INDEX_STORAGE_KEY) documents.refreshIndex()
  }

  documents.init({ demo: isDemoRequested(window.location.search, import.meta.env.DEV) })
  // Сессия истекла (сервер ответил 401 при синхронизации): правки остаются в браузере и уйдут после входа.
  // Ручной выход сюда не попадает — на вход ведёт сам хедер (иначе две навигации подряд)
  watch(
    () => auth.expired,
    (expired) => {
      if (!expired) return
      void router.replace({ name: ROUTE_NAMES.LOGIN, query: { [LOGIN_REDIRECT_QUERY_PARAM]: route.fullPath } })
    },
  )
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
    window.addEventListener(ONLINE_EVENT, onOnline)
    offlineTimer = setInterval(recheckWhileOffline, SYNC_RETRY_MS)
    fitWhenMeasured()
  })
  onBeforeUnmount(() => {
    window.removeEventListener(PAGE_HIDE_EVENT, flushOnHide)
    document.removeEventListener(VISIBILITY_CHANGE_EVENT, flushOnVisibility)
    window.removeEventListener(STORAGE_EVENT, onStorage)
    window.removeEventListener(ONLINE_EVENT, onOnline)
    if (offlineTimer !== null) clearInterval(offlineTimer)
    documents.flush()
    documents.stopSync()
  })
}
