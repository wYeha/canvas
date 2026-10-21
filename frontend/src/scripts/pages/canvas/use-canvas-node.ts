/**
 * Composable фрагмента CanvasNode: из узла собирает вид (классы, стили раскладки, значок, подпись, копии повтора) для шаблона;
 * связь — плашка с именем источника, а в живом зеркале — содержимое источника (копиями, клик выделяет связь).
 */
import { computed, type ComputedRef } from 'vue'
import { isLinkBlock, type BlockNode, type ContainerKind, type FlexContainer, type NodeId } from '@shared'
import type { CanvasNodeProps } from './canvas-node.types'
import { REPEAT_RENDER_BUDGET } from './constants'
import { useDragStore } from './dnd/drag-store'
import { useLayoutStore } from './layout-store'
import { previewEntries, styleEntries, toStyleObject } from './node-style'
import { clipAxes, type ClipAxes } from './overflow'
import { sizeMarks } from './size-mode'
import { useCanvasNodeOverflow, type CanvasNodeOverflow } from './use-canvas-node-overflow'
import { useViewSettingsStore } from './view-settings-store'
import {
  blockClasses,
  blockLabel,
  directionIcon,
  isLeafBlock,
  linkSourceName,
  mirrorBlock,
  renderChildren,
  repeatMark,
  type RenderChild,
} from './node-view'

/** Без обрезки: «Структура» не рисует числа размеров. */
const NO_CLIP: ClipAxes = { x: false, y: false }

/** Вид блока для шаблона: классы, стили, значок типа, подпись, знак повтора и дети (с копиями повтора). */
export interface NodeView {
  classes: string[]
  style: Record<string, string>
  icon: string
  label: string
  /** `×N` после подписи у настоящего блока с повтором; у копий и без повтора — пусто. */
  repeat: string
  leaf: boolean
  children: RenderChild[]
  /** Связь показана живым зеркалом: дети — содержимое источника, вложенные связи внутри — плашками. */
  mirror: boolean
  /** Контейнер, в котором лежат дети (у зеркала — контейнер источника): вид и направление для их стилей. */
  childKind: ContainerKind
  childDirection: FlexContainer['direction'] | undefined
  /** Значки режимов размера в «Структуре» (`↔`, `⊢360⊣`); в «Пропорциях» и у корня — пусто. */
  sizeMarks: string
  /** Оси обрезки в «Пропорциях» (16.4). */
  clip: ClipAxes
}

/** Результат `useCanvasNode`: вид узла, его итоговые классы (с состоянием перетаскивания) и атрибуты пометки. */
export interface CanvasNodeState {
  view: ComputedRef<NodeView>
  classes: ComputedRef<string[]>
  /** `data-node-id` настоящего блока; у копии повтора — `null` (атрибута нет). */
  nodeAttr: ComputedRef<NodeId | null>
  /** `data-repeat-of` копии повтора (id исходного блока); у настоящего блока — `null`. */
  repeatAttr: ComputedRef<NodeId | null>
  /** Id для `data-label-node-id` подписи (двойной клик — переименование); у копии — `null`. */
  labelAttr: ComputedRef<NodeId | null>
  /** Переполнение: атрибут осей обрезки, бейдж «+N скрыто» и переключатель раскрытия. */
  overflow: Pick<CanvasNodeOverflow, 'clipAttr' | 'badge' | 'toggle'>
}

/** Возвращает вычисляемый вид узла; глубина и цвет считаются при рендере, в данных не хранятся. */
export function useCanvasNode(props: CanvasNodeProps): CanvasNodeState {
  const dragStore = useDragStore()
  const layoutStore = useLayoutStore()
  const viewSettings = useViewSettingsStore()

  /**
   * Подпись узла: у связи — имя источника, у блока — своя. Подписи корней читаются только у связи: иначе каждый
   * узел зависел бы от любой правки документа.
   */
  function nodeLabel(): string {
    const { node } = props
    return isLinkBlock(node) ? linkSourceName(node.sourceId, layoutStore.rootLabels) : blockLabel(node)
  }

  /** Копия повтора: id исходного блока или `null` у настоящего блока. */
  const copyOf = computed<NodeId | null>(() => props.copyOf ?? null)

  /**
   * Источник для живого зеркала: только у связи, при включённом зеркале и не внутри другого зеркала (один уровень —
   * объём отрисовки не больше источника на каждую связь). Тот же объект, пока источник не менялся: вид не пересобирается.
   */
  const mirrorSource = computed<BlockNode | null>(() => {
    const { node } = props
    if (!isLinkBlock(node) || props.inMirror === true || !viewSettings.linksMirrored) return null
    return layoutStore.rootNodes.get(node.sourceId) ?? null
  })

  /** Вид оформленного блока. */
  const view = computed<NodeView>(() => {
    const { node, depth, parentKind } = props
    const source = mirrorSource.value
    const shown = source !== null && isLinkBlock(node) ? mirrorBlock(node, source) : node
    const classes = blockClasses(shown, depth, parentKind)
    if (source !== null) classes.push('canvas-node--mirror')
    if (props.copyRoot === true) classes.push('canvas-node--repeat-copy')
    if (props.shadow === true) classes.push('canvas-node--repeat-shadow')
    // Содержимое зеркала — копии, относящиеся к связи: клик, ховер и перетаскивание по ним — к самой связи
    const childrenCopyOf = source === null ? copyOf.value : (copyOf.value ?? node.id)
    return {
      classes,
      style: toStyleObject(
        previewEntries(styleEntries(shown, parentKind, props.parentDirection), viewSettings.sizesShown),
      ),
      icon: directionIcon(shown),
      label: nodeLabel(),
      // У корня ×N не показываем: повтор корня не рисуется и не экспортируется
      repeat: copyOf.value === null && parentKind !== null ? repeatMark(node) : '',
      leaf: isLeafBlock(shown),
      // Тень копии повтора — без содержимого (16.5)
      children:
        props.shadow === true
          ? []
          : renderChildren(shown.children, childrenCopyOf, props.copyBudget ?? REPEAT_RENDER_BUDGET),
      mirror: source !== null,
      childKind: shown.container.kind,
      childDirection: shown.container.kind === 'flex' ? shown.container.direction : undefined,
      sizeMarks: !viewSettings.sizesShown && parentKind !== null ? sizeMarks(node.self) : '',
      clip: viewSettings.sizesShown ? clipAxes(shown, parentKind, props.rootFixedHeight === true) : NO_CLIP,
    }
  })

  /** Этот узел сейчас перетаскивают: отдельный булев computed, чтобы начало и конец жеста не пересобирали вид. */
  const isDragSource = computed<boolean>(() => copyOf.value === null && dragStore.draggingId === props.node.id)

  /**
   * Этот блок — приёмник drop: другой узел тянут, `dropTarget` указывает сюда (пунктир в SCSS, не оверлей).
   * Не совпадает с `isDragSource` (след на перетаскиваемом узле). Копии повтора приёмником не подсвечиваются.
   */
  const isDropReceiver = computed<boolean>(
    () =>
      copyOf.value === null &&
      dragStore.isTargeting &&
      dragStore.dropTarget?.kind === 'block' &&
      dragStore.dropTarget.id === props.node.id,
  )

  /** Блок под курсором отказал протягиваемой связи (свой корень, цикл): красная подсветка. */
  const isLinkDenied = computed<boolean>(() => copyOf.value === null && dragStore.linkDeniedId === props.node.id)

  const overflow = useCanvasNodeOverflow(
    computed(() => (copyOf.value === null ? props.node.id : null)),
    computed(() => view.value.clip),
  )

  /** Классы узла: вид, след перетаскиваемого, подсветка приёмника и отказа связи. */
  const classes = computed<string[]>(() => {
    const extra: string[] = []
    if (isDragSource.value) extra.push('canvas-node--drag-source')
    if (isDropReceiver.value) extra.push('canvas-node--drop-target')
    if (isLinkDenied.value) extra.push('canvas-node--link-denied')
    extra.push(...overflow.classes.value)
    return extra.length === 0 ? view.value.classes : [...view.value.classes, ...extra]
  })

  /** Пометка настоящего блока: копии её не получают, иначе замеры, выделение и DnD нашли бы копию. */
  const nodeAttr = computed<NodeId | null>(() => (copyOf.value === null ? props.node.id : null))
  /** Пометка копии повтора: клик, ховер и перетаскивание по ней относятся к исходному блоку. */
  const repeatAttr = copyOf
  /** Подпись копии не переименовывает отдельно: двойной клик по копии ловится по `data-repeat-of`. */
  const labelAttr = nodeAttr

  return {
    view,
    classes,
    nodeAttr,
    repeatAttr,
    labelAttr,
    overflow: { clipAttr: overflow.clipAttr, badge: overflow.badge, toggle: overflow.toggle },
  }
}
