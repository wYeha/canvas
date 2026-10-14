/** Composable черновика текстового поля блока: правка живёт локально, в документ уходит на Enter/blur, Esc откатывает. */
import { ref, watch, type Ref } from 'vue'
import type { NodeId } from '@shared'
import { draftKeyCommand } from './props-block'

/** Источник значения: id блока и текущий текст поля; `null` — блока нет. */
export interface TextDraftSource {
  id: NodeId
  value: string
}

/** Возвращает черновик и обработчики; `commit` вызывается с id блока, который редактировался (даже если выделение уже сменилось). */
export function useBlockTextDraft(
  source: () => TextDraftSource | null,
  multiline: boolean,
  commit: (id: NodeId, value: string) => void,
) {
  const draft: Ref<string> = ref('')
  let ownerId: NodeId | null = null

  // Любое внешнее изменение (смена выделения, undo, правка в другом месте) перезаписывает черновик
  watch(
    [() => source()?.id, () => source()?.value],
    () => {
      const current = source()
      ownerId = current?.id ?? null
      draft.value = current?.value ?? ''
    },
    { immediate: true },
  )

  /** Записывает черновик в документ; повторная запись того же текста стором отбрасывается. */
  function apply(): void {
    if (ownerId !== null) commit(ownerId, draft.value)
  }

  /** Откатывает черновик к значению документа; если правка была, Esc не уходит выше (не закрывает модалки). */
  function cancel(event: KeyboardEvent): void {
    const original = source()?.value ?? ''
    if (draft.value !== original) event.stopPropagation()
    draft.value = original
  }

  /** Клавиатура: Enter (в многострочном Ctrl+Enter) применяет, Esc откатывает. */
  function onKeydown(event: KeyboardEvent): void {
    const command = draftKeyCommand(event, multiline)
    if (command === 'apply') {
      event.preventDefault()
      apply()
    } else if (command === 'cancel') {
      cancel(event)
    }
  }

  return { draft, apply, onKeydown }
}
