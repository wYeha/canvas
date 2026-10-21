/**
 * Composable черновика текстового поля блока: правка живёт локально, в документ уходит на Enter/blur (с `live` — ещё и
 * через паузу в наборе), Esc откатывает; недопустимое значение — ошибка и откат. Поле регистрируется в
 * `text-draft-store`: незаписанный ввод виден в статусе и дописывается перед сохранением, экспортом и уходом.
 */
import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { NodeId } from '@shared'
import { TEXT_DRAFT_COMMIT_MS } from './constants'
import { draftKeyCommand } from './props-block'
import { useTextDraftStore } from './text-draft-store'

/** Источник значения: id блока и текущий текст поля; `null` — блока нет. */
export interface TextDraftSource {
  id: NodeId
  value: string
}

/**
 * Настройки черновика: многострочность, необязательная нормализация (`null` — значение недопустимо) и `live` —
 * записывать ввод через паузу `TEXT_DRAFT_COMMIT_MS`, не дожидаясь blur.
 */
export interface TextDraftOptions {
  multiline: boolean
  normalize?: (value: string) => string | null
  live?: boolean
}

/** Возвращает черновик и обработчики; `commit` вызывается с id блока, который редактировался (даже если выделение уже сменилось). */
export function useBlockTextDraft(
  source: () => TextDraftSource | null,
  options: TextDraftOptions,
  commit: (id: NodeId, value: string) => void,
) {
  const draft: Ref<string> = ref('')
  /** Последняя запись отклонена как недопустимая; сбрасывается правкой, Esc и сменой значения. */
  const error = ref(false)
  let ownerId: NodeId | null = null
  /** Значение владельца в документе на момент последней синхронизации черновика (с ним и сравнивается ввод). */
  let ownerValue = ''
  /** Отложенная запись ввода (`live`); `null` — не запланирована. */
  let liveTimer: ReturnType<typeof setTimeout> | null = null
  const draftStore = useTextDraftStore()
  const key = Symbol('text-draft')
  const unregister = draftStore.register(key, flush)

  // Любое внешнее изменение (смена выделения, undo, правка в другом месте) перезаписывает черновик.
  // Если сменился владелец, а черновик старого владельца изменён и ещё не сохранён, он применяется к старому id до сброса.
  watch(
    [() => source()?.id, () => source()?.value],
    ([id], [oldId, oldValue]) => {
      if (oldId !== undefined && id !== oldId) flushOldOwner(oldId, oldValue)
      const current = source()
      // Эхо собственной записи по паузе: набор мог продолжиться до этого тика — черновик не трогаем
      if (current !== null && current.id === ownerId && current.value === ownerValue) return
      clearLiveTimer()
      ownerId = current?.id ?? null
      ownerValue = current?.value ?? ''
      draft.value = ownerValue
      error.value = false
      draftStore.setDirty(key, false)
    },
    { immediate: true },
  )

  /**
   * Черновик отличается от значения владельца. Сравнение — с запомненным значением, а не с `source()`: при
   * размонтировании секции выделение уже сменилось, и `source()` описывает другой блок.
   */
  function isDirty(): boolean {
    return ownerId !== null && draft.value !== ownerValue
  }

  /** Отменяет отложенную запись ввода. */
  function clearLiveTimer(): void {
    if (liveTimer !== null) clearTimeout(liveTimer)
    liveTimer = null
  }

  /**
   * Записывает черновик без побочных эффектов для набора: только если он допустим и нормализация его не меняет
   * (иначе подмена текста под курсором мешала бы печатать — такой ввод дождётся blur или Enter).
   */
  function flush(): void {
    clearLiveTimer()
    if (ownerId === null || !isDirty()) return
    const next = options.normalize ? options.normalize(draft.value) : draft.value
    if (next !== draft.value) return
    ownerValue = next
    draftStore.setDirty(key, false)
    commit(ownerId, next)
  }

  // Набор: отметка «есть незаписанный ввод» и (у `live`) запись через паузу
  watch(draft, () => {
    const dirtyNow = isDirty()
    draftStore.setDirty(key, dirtyNow)
    clearLiveTimer()
    if (dirtyNow && options.live === true) liveTimer = setTimeout(flush, TEXT_DRAFT_COMMIT_MS)
  })

  onBeforeUnmount(() => {
    flush()
    unregister()
  })

  /** Сохраняет несохранённый изменённый черновик прежнего владельца (смена выделения без blur); недопустимый — отбрасывается. */
  function flushOldOwner(oldId: NodeId, oldValue: string | undefined): void {
    if (draft.value === (oldValue ?? '')) return
    const next = options.normalize ? options.normalize(draft.value) : draft.value
    if (next !== null && next !== oldValue) commit(oldId, next)
  }

  /**
   * Записывает черновик в документ, только если он отличается от текущего значения источника
   * (blur без правки документ не трогает и ошибку не показывает). Недопустимое значение откатывается с ошибкой.
   */
  function apply(): void {
    clearLiveTimer()
    if (ownerId === null) return
    if (draft.value === (source()?.value ?? '')) return
    const next = options.normalize ? options.normalize(draft.value) : draft.value
    if (next === null) {
      draft.value = source()?.value ?? ''
      error.value = true
      return
    }
    error.value = false
    draft.value = next
    commit(ownerId, next)
  }

  /** Откатывает черновик к значению документа; если правка была, Esc не уходит выше (не закрывает модалки). */
  function cancel(event: KeyboardEvent): void {
    const original = source()?.value ?? ''
    if (draft.value !== original) event.stopPropagation()
    draft.value = original
    error.value = false
  }

  /** Клавиатура: Enter (в многострочном Ctrl+Enter) применяет, Esc откатывает. */
  function onKeydown(event: KeyboardEvent): void {
    const command = draftKeyCommand(event, options.multiline)
    if (command === null) error.value = false
    if (command === 'apply') {
      event.preventDefault()
      apply()
    } else if (command === 'cancel') {
      cancel(event)
    }
  }

  return { draft, error, apply, onKeydown }
}
