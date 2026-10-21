/**
 * Composable фрагмента CanvasPropsPosition: положение выделенного блока в родителе (15.3) — вид (обычно / прилипает /
 * поверх), край прилипания и угол родителя. Всё хранится одним полем `self.position`; запись — шаг истории.
 */
import { computed, type ComputedRef, type WritableComputedRef } from 'vue'
import { CHILD_POSITIONS, type ChildPosition } from '@shared'
import { CHILD_POSITION_HINTS } from './constants'
import { useLayoutStore } from './layout-store'
import { positionForKind, positionKind, withPosition, type PositionKind } from './position'
import { findParent } from './tree-query'

/** Виды положения в порядке сегментов. */
const POSITION_KINDS: readonly PositionKind[] = ['static', 'sticky', 'overlay']

/** Поля фрагмента для шаблона. */
export interface CanvasPropsPositionState {
  kind: WritableComputedRef<string | null>
  /** Значение поля `position` для сегментов края и угла (у них значения — сами варианты положения). */
  position: WritableComputedRef<string | null>
  hint: ComputedRef<string>
}

/** Возвращает поля фрагмента; у корня (без родителя) значения пустые — фрагмент не показывают. */
export function useCanvasPropsPosition(): CanvasPropsPositionState {
  const layoutStore = useLayoutStore()

  /** Выделенный блок с родителем; у корня и без выделения — `null`. */
  const node = computed(() => {
    const selected = layoutStore.selectedNode
    return selected && findParent(layoutStore.document, selected.id) ? selected : null
  })

  /** Записывает положение (или стирает поле) выделенному блоку. */
  function write(next: ChildPosition | undefined): void {
    const target = node.value
    if (target && next !== target.self.position) {
      layoutStore.updateNode(target.id, { self: withPosition(target.self, next) })
    }
  }

  const kind: WritableComputedRef<string | null> = computed({
    /** Читает вид положения. */
    get: () => (node.value ? positionKind(node.value.self.position) : null),
    /** Пишет вид: вариант по умолчанию или прежний, если вид тот же. */
    set: (value) => {
      const next = POSITION_KINDS.find((item) => item === value)
      if (node.value && next !== undefined) write(positionForKind(node.value.self.position, next))
    },
  })

  const position: WritableComputedRef<string | null> = computed({
    /** Читает вариант положения (край или угол). */
    get: () => node.value?.self.position ?? null,
    /** Пишет вариант; чужая строка игнорируется. */
    set: (value) => {
      const next = CHILD_POSITIONS.find((item) => item === value)
      if (next !== undefined) write(next)
    },
  })

  /** Подсказка: что даст вид положения в экспорте. */
  const hint = computed(() => CHILD_POSITION_HINTS[node.value ? positionKind(node.value.self.position) : 'static'])

  return { kind, position, hint }
}
