/**
 * Composable фрагмента CanvasLinks: стрелки связей в координатах поля (SVG-слой внутри слоя мира, пан и зум его
 * двигают сами). Концы — по замерам источника и плашки в DOM после перерисовки; стрелка выделенной связи
 * или её источника — акцентная. Размер наконечника держит экранный размер (делится на зум).
 */
import { computed, nextTick, onMounted, shallowRef, watch, type ComputedRef } from 'vue'
import { buildLinkIndex, type NodeId } from '@shared'
import { useCameraStore } from './camera-store'
import { LINK_ARROW_HEAD_PX } from './constants'
import { useDragStore } from './dnd/drag-store'
import { arrowSegment, type ArrowSegment } from './link-arrows'
import { useLayoutStore } from './layout-store'
import { measureNodeWorldRect } from './node-dom'

/** Стрелка до отрисовки классов: связь, её источник и отрезок. */
interface MeasuredArrow {
  linkId: NodeId
  sourceId: NodeId
  segment: ArrowSegment
}

/** Стрелка для шаблона. */
export interface LinkArrowView extends ArrowSegment {
  key: NodeId
  classes: string[]
  marker: string
}

/** Id маркеров-наконечников (обычный и акцентный) в разметке слоя. */
export const LINK_ARROW_MARKERS = { idle: 'canvas-links-head', active: 'canvas-links-head-active' } as const

/** Возвращает стрелки и размер наконечника в координатах поля. */
export function useCanvasLinks(): { arrows: ComputedRef<LinkArrowView[]>; headSize: ComputedRef<number> } {
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()
  const dragStore = useDragStore()
  const measured = shallowRef<MeasuredArrow[]>([])

  /** Замеряет источники и плашки всех связей; не отрисованные (или пересекающиеся) пропускаются. */
  function measure(): void {
    const zoom = cameraStore.camera.zoom
    const next: MeasuredArrow[] = []
    for (const placement of buildLinkIndex(layoutStore.document).placements) {
      const source = measureNodeWorldRect(placement.sourceId, zoom)
      const target = measureNodeWorldRect(placement.linkId, zoom)
      const segment = source && target ? arrowSegment(source, target) : null
      if (segment !== null) next.push({ linkId: placement.linkId, sourceId: placement.sourceId, segment })
    }
    measured.value = next
  }

  // После перерисовки: документ, высоты корней (раскладка внутри), предпросмотр перемещения корня, зум (замер делится на него)
  watch(
    [
      () => layoutStore.document,
      () => cameraStore.rootHeights,
      () => dragStore.rootPosition,
      () => cameraStore.camera.zoom,
    ],
    measure,
    { flush: 'post' },
  )
  onMounted(() => {
    void nextTick(measure)
  })

  /** Стрелки с классами: выделение не пересчитывает замеры. */
  const arrows = computed<LinkArrowView[]>(() => {
    const selected = layoutStore.selectedId
    return measured.value.map(({ linkId, sourceId, segment }) => {
      const active = selected === linkId || selected === sourceId
      return {
        key: linkId,
        ...segment,
        classes: active ? ['canvas-links__arrow', 'canvas-links__arrow--active'] : ['canvas-links__arrow'],
        marker: `url(#${active ? LINK_ARROW_MARKERS.active : LINK_ARROW_MARKERS.idle})`,
      }
    })
  })

  /** Наконечник в единицах поля: на экране всегда `LINK_ARROW_HEAD_PX`. */
  const headSize = computed(() => LINK_ARROW_HEAD_PX / cameraStore.camera.zoom)

  return { arrows, headSize }
}
