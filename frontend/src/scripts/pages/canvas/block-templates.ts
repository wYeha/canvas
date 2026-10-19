/** Чистые фабрики шаблонов-заготовок («ряд KPI», «сетка графиков» и др.): готовые поддеревья блоков для вставки. */
import type { BlockNode, ContainerKind, GridContainer } from '@shared'
import {
  TEMPLATE_CHARTS_COLUMNS,
  TEMPLATE_CHART_COUNT,
  TEMPLATE_CHART_HEIGHT,
  TEMPLATE_CONTENT_MIN_HEIGHT,
  TEMPLATE_FILTER_COUNT,
  TEMPLATE_GAP,
  TEMPLATE_GAP_LARGE,
  TEMPLATE_GAP_SMALL,
  TEMPLATE_KPI_COUNT,
  TEMPLATE_KPI_FLEX,
  TEMPLATE_MENU_ITEM_COUNT,
  TEMPLATE_ROOT_WIDTH,
  TEMPLATE_SIDEBAR_COLUMNS,
  TEMPLATE_TABLE_HEIGHT,
  TEMPLATE_WIDE_ROOT_WIDTH,
} from './constants'
import { createBlock } from './factories'

/** Шаблон-заготовка: пункт меню, ширина превью при вставке корнем и фабрика поддерева (каждый вызов — новые id). */
export interface BlockTemplate {
  id: string
  label: string
  rootWidth: number
  build: () => BlockNode
}

/** Параметры блока шаблона: что переопределяется поверх значений `createBlock`. */
interface BlockOptions {
  direction?: 'row' | 'column'
  gap?: number
  columns?: string
  self?: BlockNode['self']
  repeat?: number
  children?: BlockNode[]
}

/** Блок шаблона: `createBlock` (flex `0 1 auto`) плюс направление/gap/колонки, свойства «как ребёнок», повтор и дети. */
function tplBlock(kind: ContainerKind, label: string, options: BlockOptions = {}): BlockNode {
  const base = createBlock(kind, label)
  const { container } = base
  if (container.kind === 'flex') {
    base.container = { ...container, direction: options.direction ?? container.direction, gap: options.gap ?? null }
  } else {
    const grid: GridContainer = { ...container, columns: options.columns ?? container.columns }
    base.container = { ...grid, columnGap: options.gap ?? null, rowGap: options.gap ?? null }
  }
  base.self = { ...base.self, ...options.self }
  base.repeat = options.repeat ?? base.repeat
  base.children = options.children ?? []
  return base
}

/** «Ряд KPI»: flex row, четыре карточки `flex: 1` через повтор. */
function buildKpiRow(): BlockNode {
  const kpi = tplBlock('flex', 'KPI', { self: { flex: TEMPLATE_KPI_FLEX }, repeat: TEMPLATE_KPI_COUNT })
  return tplBlock('flex', 'Ряд KPI', { direction: 'row', gap: TEMPLATE_GAP, children: [kpi] })
}

/** «Сетка графиков 2×2»: grid на две колонки, график повторяется четыре раза. */
function buildChartGrid(): BlockNode {
  const chart = tplBlock('flex', 'График', {
    self: { height: TEMPLATE_CHART_HEIGHT },
    repeat: TEMPLATE_CHART_COUNT,
  })
  return tplBlock('grid', 'Сетка графиков', { columns: TEMPLATE_CHARTS_COLUMNS, gap: TEMPLATE_GAP, children: [chart] })
}

/** «Фильтры + таблица»: колонка из ряда фильтров и таблицы. */
function buildFiltersTable(): BlockNode {
  const filter = tplBlock('flex', 'Фильтр', { repeat: TEMPLATE_FILTER_COUNT })
  const filters = tplBlock('flex', 'Фильтры', { direction: 'row', gap: TEMPLATE_GAP_SMALL, children: [filter] })
  const table = tplBlock('flex', 'Таблица', { self: { height: TEMPLATE_TABLE_HEIGHT } })
  return tplBlock('flex', 'Фильтры и таблица', {
    direction: 'column',
    gap: TEMPLATE_GAP,
    children: [filters, table],
  })
}

/** «Сайдбар + контент»: grid `250px 1fr`, в сайдбаре колонка пунктов меню. */
function buildSidebarContent(): BlockNode {
  const item = tplBlock('flex', 'Пункт меню', { repeat: TEMPLATE_MENU_ITEM_COUNT })
  const sidebar = tplBlock('flex', 'Сайдбар', { direction: 'column', gap: TEMPLATE_GAP_SMALL, children: [item] })
  const content = tplBlock('flex', 'Контент', { self: { minHeight: TEMPLATE_CONTENT_MIN_HEIGHT } })
  return tplBlock('grid', 'Сайдбар и контент', {
    columns: TEMPLATE_SIDEBAR_COLUMNS,
    gap: TEMPLATE_GAP_LARGE,
    children: [sidebar, content],
  })
}

/** Все шаблоны в порядке показа в меню тулбара. */
export const BLOCK_TEMPLATES: readonly BlockTemplate[] = [
  { id: 'kpi-row', label: 'Ряд KPI', rootWidth: TEMPLATE_ROOT_WIDTH, build: buildKpiRow },
  { id: 'chart-grid', label: 'Сетка графиков 2×2', rootWidth: TEMPLATE_ROOT_WIDTH, build: buildChartGrid },
  { id: 'filters-table', label: 'Фильтры + таблица', rootWidth: TEMPLATE_ROOT_WIDTH, build: buildFiltersTable },
  {
    id: 'sidebar-content',
    label: 'Сайдбар + контент',
    rootWidth: TEMPLATE_WIDE_ROOT_WIDTH,
    build: buildSidebarContent,
  },
]

/** Возвращает шаблон по id; `undefined`, если такого нет. */
export function findBlockTemplate(id: string): BlockTemplate | undefined {
  return BLOCK_TEMPLATES.find((template) => template.id === id)
}
