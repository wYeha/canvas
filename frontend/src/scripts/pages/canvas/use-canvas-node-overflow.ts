/**
 * Composable переполнения одного блока на поле (16.4): классы обрезки по осям (снимаются, пока блок раскрыт), метка у
 * края, атрибут `data-clip` для замера и бейдж «+N скрыто ↓» / «свернуть ↑». Копии повтора обрезаются, но не
 * замеряются и бейджа не получают.
 */
import { computed, type ComputedRef } from 'vue'
import type { NodeId } from '@shared'
import { OVERFLOW_COLLAPSE_TEXT, OVERFLOW_COLLAPSE_TITLE, OVERFLOW_EXPAND_TITLE } from './constants'
import { overflowBadgeText, type ClipAxes } from './overflow'
import { useCanvasOverflowState } from './use-canvas-overflow'

/** Бейдж переполнения для шаблона: текст и подсказка. */
export interface OverflowBadge {
  text: string
  title: string
}

/** Результат: классы обрезки и метки, атрибут осей, бейдж и переключатель раскрытия. */
export interface CanvasNodeOverflow {
  classes: ComputedRef<string[]>
  clipAttr: ComputedRef<string | null>
  badge: ComputedRef<OverflowBadge | null>
  toggle: () => void
}

/** Состояние переполнения блока `id` (у копии — `null`) с осями обрезки `clip`. */
export function useCanvasNodeOverflow(id: ComputedRef<NodeId | null>, clip: ComputedRef<ClipAxes>): CanvasNodeOverflow {
  const state = useCanvasOverflowState()

  /** Раскрыт ли блок временно. */
  const expanded = computed(() => id.value !== null && state !== null && state.isExpanded(id.value))
  /** Переполнение настоящего блока по последнему замеру. */
  const overflow = computed(() => (id.value === null || state === null ? null : state.overflowOf(id.value)))

  /** Обрезка по осям (пока не раскрыт) и метка у края, где содержимое не помещается. */
  const classes = computed<string[]>(() => {
    const result: string[] = []
    if (!expanded.value) {
      if (clip.value.x) result.push('canvas-node--clip-x')
      if (clip.value.y) result.push('canvas-node--clip-y')
    }
    if (overflow.value !== null) result.push(`canvas-node--overflow-${overflow.value.axis}`)
    return result
  })

  /** `data-clip` для замера: оси обрезки настоящего блока (`x`, `y`, `xy`) или `null`. */
  const clipAttr = computed<string | null>(() => {
    const axes = `${clip.value.x ? 'x' : ''}${clip.value.y ? 'y' : ''}`
    return id.value === null || axes === '' ? null : axes
  })

  /** Бейдж: «+N скрыто ↓» у обрезанного, «свернуть ↑» у раскрытого. */
  const badge = computed<OverflowBadge | null>(() => {
    if (overflow.value === null) return null
    if (expanded.value) return { text: OVERFLOW_COLLAPSE_TEXT, title: OVERFLOW_COLLAPSE_TITLE }
    return { text: overflowBadgeText(overflow.value), title: OVERFLOW_EXPAND_TITLE }
  })

  /** Раскрывает или снова обрезает блок. */
  function toggle(): void {
    if (id.value !== null) state?.toggleExpanded(id.value)
  }

  return { classes, clipAttr, badge, toggle }
}
