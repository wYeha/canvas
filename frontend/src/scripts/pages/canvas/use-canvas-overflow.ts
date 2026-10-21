/**
 * Честное переполнение на канвасе (16.4): после перерисовки замеряет блоки с обрезкой и хранит, у кого сколько детей
 * не помещается, плюс временно раскрытые блоки. Состояние одного поля — provide/inject, не Pinia: его читают только
 * блоки на этом поле. Раскрытие — сеанс просмотра, в документ и историю не идёт.
 */
import { inject, onBeforeUnmount, provide, ref, shallowRef, watch, type InjectionKey, type Ref } from 'vue'
import type { NodeId } from '@shared'
import { useCameraStore } from './camera-store'
import { useLayoutStore } from './layout-store'
import { measureClipBlocks } from './node-dom'
import { measureOverflow, type NodeOverflow } from './overflow'
import { useViewSettingsStore } from './view-settings-store'

/** Состояние переполнения поля для блоков. */
export interface CanvasOverflowState {
  /** Переполнение блока или `null`, если всё помещается (или блок не обрезается). */
  overflowOf: (id: NodeId) => NodeOverflow | null
  /** Раскрыт ли блок временно (обрезка снята). */
  isExpanded: (id: NodeId) => boolean
  /** Раскрывает или снова обрезает блок. */
  toggleExpanded: (id: NodeId) => void
}

/** Ключ provide/inject состояния переполнения. */
const OVERFLOW_KEY: InjectionKey<CanvasOverflowState> = Symbol('canvas-overflow')

/** Подключает замер переполнения к слою мира `worldEl` и отдаёт состояние блокам поля. */
export function provideCanvasOverflow(worldEl: Ref<HTMLElement | null>): void {
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()
  const viewSettings = useViewSettingsStore()
  const overflows = shallowRef<ReadonlyMap<NodeId, NodeOverflow>>(new Map())
  const expanded = ref<ReadonlySet<NodeId>>(new Set())
  let frame: number | null = null

  /** Замеряет блоки с обрезкой и пересобирает карту переполнения. */
  function measure(): void {
    const world = worldEl.value
    const next = new Map<NodeId, NodeOverflow>()
    if (world !== null) {
      for (const block of measureClipBlocks(world)) {
        const overflow = measureOverflow(block.box, block.children, block.axes)
        if (overflow !== null) next.set(block.id, overflow)
      }
    }
    overflows.value = next
  }

  /** Откладывает замер на кадр: несколько изменений подряд — один замер. */
  function schedule(): void {
    if (frame !== null) return
    frame = requestAnimationFrame(() => {
      frame = null
      measure()
    })
  }

  // Раскладка меняется с документом, размерами корней, режимом «Пропорции / Структура», зеркалом и раскрытием
  watch(
    [
      () => layoutStore.document,
      () => cameraStore.rootHeights,
      () => viewSettings.sizesShown,
      () => viewSettings.linksMirrored,
      expanded,
    ],
    schedule,
    { flush: 'post', immediate: true },
  )

  onBeforeUnmount(() => {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
  })

  /** Переполнение блока по id. */
  function overflowOf(id: NodeId): NodeOverflow | null {
    return overflows.value.get(id) ?? null
  }

  /** Раскрыт ли блок. */
  function isExpanded(id: NodeId): boolean {
    return expanded.value.has(id)
  }

  /** Раскрывает или снова обрезает блок (новое множество — чтобы зависимые пересчитались). */
  function toggleExpanded(id: NodeId): void {
    const next = new Set(expanded.value)
    if (!next.delete(id)) next.add(id)
    expanded.value = next
  }

  provide(OVERFLOW_KEY, { overflowOf, isExpanded, toggleExpanded })
}

/** Состояние переполнения поля для блока; вне поля (отдельный блок в тестах) — `null`. */
export function useCanvasOverflowState(): CanvasOverflowState | null {
  return inject(OVERFLOW_KEY, null)
}
