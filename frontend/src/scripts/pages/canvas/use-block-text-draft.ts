/** Composable черновика текстового поля блока: правка живёт локально, в документ уходит на Enter/blur, Esc откатывает; недопустимое значение — ошибка и откат. */
import { ref, watch, type Ref } from 'vue'
import type { NodeId } from '@shared'
import { draftKeyCommand } from './props-block'

/** Источник значения: id блока и текущий текст поля; `null` — блока нет. */
export interface TextDraftSource {
  id: NodeId
  value: string
}

/** Настройки черновика: многострочность и необязательная нормализация (`null` — значение недопустимо). */
export interface TextDraftOptions {
  multiline: boolean
  normalize?: (value: string) => string | null
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

  // Любое внешнее изменение (смена выделения, undo, правка в другом месте) перезаписывает черновик
  watch(
    [() => source()?.id, () => source()?.value],
    () => {
      const current = source()
      ownerId = current?.id ?? null
      draft.value = current?.value ?? ''
      error.value = false
    },
    { immediate: true },
  )

  /** Записывает черновик в документ; повторная запись того же текста стором отбрасывается. Недопустимое значение откатывается с ошибкой. */
  function apply(): void {
    if (ownerId === null) return
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
