/**
 * Composable фрагмента CanvasLinks: стрелки связей в координатах поля (SVG-слой внутри слоя мира, пан и зум его
 * двигают сами). Концы — по замерам источника и плашки в DOM после перерисовки; стрелка выделенной связи
 * или её источника — акцентная. Размер наконечника и ручки конца держит экранный размер (делится на зум).
 * Ручка на конце стрелки (`data-link-end-id`) начинает перепривязку; на время любого перетаскивания ручки не ловят
 * указатель (иначе поиск блока под курсором попадал бы в них), стрелка перепривязываемой связи скрыта.
 */
import { computed, nextTick, onMounted, shallowRef, watch, type ComputedRef } from 'vue'
import { buildLinkIndex, type NodeId } from '@shared'
import { useCameraStore } from './camera-store'
import { LINK_ARROW_HEAD_PX, LINK_ARROW_MARKERS, LINK_END_HANDLE_PX } from './constants'
import { useDragStore } from './dnd/drag-store'
import { arrowSegment, type ArrowSegment } from './link-arrows'
import { useLayoutStore } from './layout-store'
import { useViewSettingsStore } from './view-settings-store'
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
  linkId: NodeId
  classes: string[]
  marker: string
}

/** Наконечник для разметки: id маркера и классы (цвет — классом, маркер не наследует цвет линии). */
export interface LinkArrowMarker {
  id: string
  classes: string[]
}

/** Наконечники: обычный и акцентный. */
const MARKERS: readonly LinkArrowMarker[] = [
  { id: LINK_ARROW_MARKERS.idle, classes: ['canvas-links__head'] },
  { id: LINK_ARROW_MARKERS.active, classes: ['canvas-links__head', 'canvas-links__head--active'] },
]

/** Ссылка на маркер для атрибута `marker-end`. */
function markerUrl(id: string): string {
  return `url(#${id})`
}

/** Стрелки, размеры наконечника и ручки конца в координатах поля, классы слоя. */
export interface CanvasLinksView {
  arrows: ComputedRef<LinkArrowView[]>
  headSize: ComputedRef<number>
  handleRadius: ComputedRef<number>
  layerClasses: ComputedRef<string[]>
  markers: readonly LinkArrowMarker[]
}

/** Возвращает стрелки, размеры наконечника и ручки конца в координатах поля и классы слоя. */
export function useCanvasLinks(): CanvasLinksView {
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()
  const dragStore = useDragStore()
  const viewSettings = useViewSettingsStore()
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

  // После перерисовки: документ, высоты корней (раскладка внутри), предпросмотр перемещения корня, зум (замер делится
  // на него), живое зеркало (меняет размеры плашек без смены документа)
  watch(
    [
      () => layoutStore.document,
      () => cameraStore.rootHeights,
      () => dragStore.rootPosition,
      () => cameraStore.camera.zoom,
      () => viewSettings.linksMirrored,
    ],
    measure,
    { flush: 'post' },
  )
  onMounted(() => {
    void nextTick(measure)
  })

  /**
   * Стрелки с классами: выделение не пересчитывает замеры; перепривязываемая связь без стрелки. Без «все стрелки»
   * видны только стрелки выделенной связи или выделенного источника — на большом документе иначе паутина.
   */
  const arrows = computed<LinkArrowView[]>(() => {
    const selected = layoutStore.selectedId
    const hidden = dragStore.relinkingId
    const all = viewSettings.linkArrowsAll
    return measured.value.flatMap(({ linkId, sourceId, segment }) => {
      if (linkId === hidden || (!all && selected !== linkId && selected !== sourceId)) return []
      const active = selected === linkId || selected === sourceId
      return {
        key: linkId,
        linkId,
        ...segment,
        classes: active ? ['canvas-links__arrow', 'canvas-links__arrow--active'] : ['canvas-links__arrow'],
        marker: markerUrl(active ? LINK_ARROW_MARKERS.active : LINK_ARROW_MARKERS.idle),
      }
    })
  })

  /** Наконечник в единицах поля: на экране всегда `LINK_ARROW_HEAD_PX`. */
  const headSize = computed(() => LINK_ARROW_HEAD_PX / cameraStore.camera.zoom)

  /** Радиус ручки конца стрелки в единицах поля: на экране всегда `LINK_END_HANDLE_PX`. */
  const handleRadius = computed(() => LINK_END_HANDLE_PX / cameraStore.camera.zoom)

  /** Классы слоя: во время перетаскивания ручки не принимают указатель. */
  const layerClasses = computed(() =>
    dragStore.isDragging ? ['canvas-links', 'canvas-links--dragging'] : ['canvas-links'],
  )

  return { arrows, headSize, handleRadius, layerClasses, markers: MARKERS }
}
