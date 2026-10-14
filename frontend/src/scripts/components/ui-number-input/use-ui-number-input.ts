/** Логика компонента UiNumberInput: черновик текста, фиксация правки, стрелки, Enter и Esc. */
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import {
  DEFAULT_STEP,
  formatNumber,
  parseNumberText,
  resolveCommit,
  stepNumber,
} from '@/scripts/components/ui-number-input/number-input'
import type { UiNumberInputProps } from '@/scripts/components/ui-number-input/ui-number-input.types'
import type { UiInputAttrs } from '@/scripts/components/ui-text-input/ui-text-input.types'

/** Направление шага по клавише-стрелке. */
const ARROW_DIRECTIONS: Record<string, 1 | -1> = { ArrowUp: 1, ArrowDown: -1 }

/** Возвращает черновик текста поля, ARIA-атрибуты spinbutton и обработчики клавиатуры и blur. */
export function useUiNumberInput(
  props: Readonly<UiNumberInputProps>,
  model: Ref<number | null>,
): {
  draft: Ref<string>
  controlAttrs: ComputedRef<UiInputAttrs>
  onKeydown: (event: KeyboardEvent) => void
  onBlur: () => void
} {
  const draft = ref(formatNumber(model.value))
  // Внешнее изменение значения (в том числе наше собственное) всегда перезаписывает черновик
  watch(model, (value) => {
    draft.value = formatNumber(value)
  })

  const controlAttrs = computed<UiInputAttrs>(() => ({
    ...props.inputAttrs,
    role: 'spinbutton',
    inputmode: 'decimal',
    'aria-valuenow': model.value ?? undefined,
    'aria-valuemin': props.min,
    'aria-valuemax': props.max,
    'aria-valuetext': model.value === null ? undefined : [String(model.value), props.unit].filter(Boolean).join(' '),
  }))

  /** Фиксирует черновик: пусто → null, нечисло → откат, число → с ограничением по min/max. */
  function commit(): void {
    const result = resolveCommit(draft.value, model.value, props.min, props.max, props.unit)
    draft.value = result.text
    model.value = result.value
  }

  /** Шагает стрелкой от числа в черновике (нечисло — от последнего корректного значения). */
  function stepFromDraft(direction: 1 | -1, shift: boolean): void {
    const parsed = parseNumberText(draft.value, props.unit)
    const current = parsed.kind === 'number' ? parsed.value : parsed.kind === 'empty' ? null : model.value
    const next = stepNumber(current, direction, props.step ?? DEFAULT_STEP, shift, props.min, props.max)
    draft.value = formatNumber(next)
    model.value = next
  }

  /** Esc отменяет правку; если черновик был изменён, событие гасится, чтобы не закрыть внешнюю модалку. */
  function cancelEdit(event: KeyboardEvent): void {
    const restored = formatNumber(model.value)
    if (draft.value !== restored) event.stopPropagation()
    draft.value = restored
  }

  /** Клавиатура: ↑/↓ — шаг (Shift ×10), Enter — зафиксировать, Esc — отменить правку. */
  function onKeydown(event: KeyboardEvent): void {
    const direction = ARROW_DIRECTIONS[event.key]
    if (direction) {
      event.preventDefault()
      stepFromDraft(direction, event.shiftKey)
    } else if (event.key === 'Enter') {
      commit()
    } else if (event.key === 'Escape') {
      cancelEdit(event)
    }
  }

  return { draft, controlAttrs, onKeydown, onBlur: commit }
}
