/** Логика фрагмента UiKitToast: какой тост показан в витрине (ошибка, обычный или никакой). */
import { ref, type Ref } from 'vue'
import type { UiToastKind } from '@/scripts/components/ui-toast/ui-toast.types'

/** Возвращает вид показанного тоста и действия показа и закрытия. */
export function useUiKitToast(): {
  kind: Ref<UiToastKind | null>
  show: (kind: UiToastKind) => void
  hide: () => void
} {
  const kind = ref<UiToastKind | null>(null)

  /** Показывает тост нужного вида. */
  function show(next: UiToastKind): void {
    kind.value = next
  }

  /** Скрывает тост. */
  function hide(): void {
    kind.value = null
  }

  return { kind, show, hide }
}
