/**
 * Демо-документ «Дашборд» для визуальной проверки канваса до импорта и сохранения (загружается по `?demo` в dev).
 * KPI-карточка и карточка графика — корни-компоненты, подключённые в дашборд связями.
 */
import {
  SCHEMA_VERSION,
  type BlockNode,
  type LayoutDocument,
  type LayoutNode,
  type NodeId,
  type RootEntry,
} from '@shared'
import { DEFAULT_GAP } from './constants'
import { createBlock, createDocument, createLinkBlock } from './factories'

/** Поля блока, которые демо переопределяет поверх значений по умолчанию. */
type BlockSpec = Partial<Omit<BlockNode, 'id' | 'type' | 'label' | 'children'>>

/** Блок с подписью, настройками и детьми. */
function block(label: string, spec: BlockSpec, children: LayoutNode[] = []): BlockNode {
  const base = createBlock('flex', label)
  // Контейнер демо — с зазором по умолчанию, как у нового блока
  const container = { ...(spec.container ?? base.container), gap: DEFAULT_GAP }
  return { ...base, ...spec, container, self: { ...base.self, ...spec.self }, children }
}

/** Flex-контейнер демо. */
function flex(direction: 'row' | 'column', extra: Partial<{ align: 'center'; wrap: boolean }> = {}) {
  return {
    kind: 'flex' as const,
    direction,
    wrap: extra.wrap ?? false,
    justify: 'flex-start' as const,
    align: extra.align ?? ('stretch' as const),
  }
}

/** Grid-контейнер демо. */
function grid(columns: string) {
  return {
    kind: 'grid' as const,
    columns,
    rows: 'auto',
    justifyItems: 'stretch' as const,
    alignItems: 'stretch' as const,
  }
}

/** Число KPI-карточек в ряду дашборда (повтор связи). */
const KPI_COUNT = 4

/** Корень на поле. */
function root(node: BlockNode, x: number, y: number, width: number): RootEntry {
  return { canvas: { x, y, width, height: null, exportMaxWidth: false }, node }
}

/** Шапка дашборда: логотип, меню, пользователь. */
function buildHeader(): BlockNode {
  return block('header', { container: flex('row', { align: 'center' }) }, [
    block('logo', { self: { widthMode: 'fixed', width: '120px' } }),
    block('nav', { container: flex('row'), self: { widthMode: 'fill' } }, [
      block('nav-item', {}),
      block('nav-item', {}),
      block('nav-item', {}),
    ]),
    // Точка статуса лежит поверх блока пользователя в правом верхнем углу
    block('user', { self: { widthMode: 'fixed', width: '160px' } }, [
      block('status', { self: { position: 'top-right' } }),
    ]),
  ])
}

/** Пунктов меню в левой колонке: больше, чем помещается на экране, — колонка прокручивается. */
const MENU_ITEM_COUNT = 16

/** Левая колонка: заголовок, прилипающий к верху, и длинное меню (пункт ×N) с прокруткой на всю высоту тела. */
function buildSidebar(): BlockNode {
  return block('sidebar', { container: { ...flex('column'), scroll: 'y' }, self: { heightMode: 'fill' } }, [
    block('menu-title', { self: { position: 'sticky-top' } }),
    block('menu-item', { repeat: MENU_ITEM_COUNT }),
  ])
}

/** Основная область: ряд KPI (связь на KPI-карточку ×4), два графика (связи на карточку графика) и таблица. */
function buildMain(kpiId: NodeId, chartId: NodeId): BlockNode {
  return block('main', { container: flex('column'), self: { widthMode: 'fill', heightMode: 'fill' } }, [
    block('kpi-row', { container: grid('repeat(4, 1fr)') }, [{ ...createLinkBlock(kpiId), repeat: KPI_COUNT }]),
    block('charts', { container: grid('repeat(2, 1fr)') }, [createLinkBlock(chartId), createLinkBlock(chartId)]),
    block('table', { self: { minHeight: '240px' } }),
  ])
}

/** Создаёт демо-документ: корни «Дашборд» (1440), «KPI-карточка» (240) и «Карточка графика» (480), подключённые в дашборд. */
export function createDemoDocument(): LayoutDocument {
  const kpi = block('KPI-карточка', { container: flex('column') }, [block('kpi-title', {}), block('kpi-value', {})])
  const chartCard = block('Карточка графика', { container: flex('column') }, [
    block('chart-title', {}),
    block('chart-area', { self: { minHeight: '180px' } }),
  ])
  const dashboard = block('Дашборд', { container: flex('column') }, [
    buildHeader(),
    block('body', { container: grid('240px 1fr'), self: { heightMode: 'fill' } }, [
      buildSidebar(),
      buildMain(kpi.id, chartCard.id),
    ]),
  ])
  return {
    ...createDocument('Дашборд аналитики'),
    schemaVersion: SCHEMA_VERSION,
    labelCounter: 0,
    roots: [
      {
        ...root(dashboard, 80, 80, 1440),
        canvas: { ...root(dashboard, 80, 80, 1440).canvas, height: 900, fullScreen: true },
      },
      root(kpi, 1600, 80, 240),
      root(chartCard, 1600, 360, 480),
    ],
  }
}
