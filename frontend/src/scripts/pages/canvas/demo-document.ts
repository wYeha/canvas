/** Демо-документ «Дашборд» для визуальной проверки канваса до импорта и сохранения (загружается по `?demo` в dev). */
import { SCHEMA_VERSION, type BlockNode, type LayoutDocument, type LayoutNode, type RootEntry } from '@shared'
import { createBlock, createDocument } from './factories'

/** Поля блока, которые демо переопределяет поверх значений по умолчанию. */
type BlockSpec = Partial<Omit<BlockNode, 'id' | 'type' | 'label' | 'children'>>

/** Блок с подписью, настройками и детьми. */
function block(label: string, spec: BlockSpec, children: LayoutNode[] = []): BlockNode {
  return { ...createBlock('flex', label), ...spec, children }
}

/** Внутренние отступы: `pad(16)` — 16 со всех сторон, `pad(12, 24)` — вертикаль и горизонталь. */
function pad(vertical: number, horizontal: number = vertical): BlockNode['padding'] {
  return { top: vertical, right: horizontal, bottom: vertical, left: horizontal }
}

/** Flex-контейнер демо. */
function flex(
  direction: 'row' | 'column',
  gap: number | null,
  extra: Partial<{ align: 'center'; wrap: boolean }> = {},
) {
  return {
    kind: 'flex' as const,
    direction,
    wrap: extra.wrap ?? false,
    justify: 'flex-start' as const,
    align: extra.align ?? ('stretch' as const),
    gap,
  }
}

/** Grid-контейнер демо с одинаковым зазором. */
function grid(columns: string, gap: number) {
  return {
    kind: 'grid' as const,
    columns,
    rows: 'auto',
    justifyItems: 'stretch' as const,
    alignItems: 'stretch' as const,
    columnGap: gap,
    rowGap: gap,
  }
}

/** Подпись KPI-карточки: и отдельного корня-заготовки, и карточек в ряду KPI дашборда. */
const KPI_LABEL = 'KPI-карточка'

/** Корень на поле. */
function root(node: BlockNode, x: number, y: number, width: number): RootEntry {
  return { canvas: { x, y, width, height: null, exportMaxWidth: false }, node }
}

/** Шапка дашборда: логотип, меню, пользователь. */
function buildHeader(): BlockNode {
  return block('header', { container: flex('row', 16, { align: 'center' }), padding: pad(12, 24) }, [
    block('logo', { self: { width: '120px' } }),
    block('nav', { container: flex('row', 12), self: { flex: '1' } }, [
      block('nav-item', {}),
      block('nav-item', {}),
      block('nav-item', {}),
    ]),
    block('user', { self: { width: '160px' } }),
  ])
}

/** Левая колонка: три пункта меню. */
function buildSidebar(): BlockNode {
  return block('sidebar', { container: flex('column', 8), padding: pad(16) }, [
    block('menu-item', {}),
    block('menu-item', {}),
    block('menu-item', {}),
  ])
}

/** Основная область: ряд из четырёх KPI, графики и таблица. */
function buildMain(): BlockNode {
  const kpiCards = [0, 1, 2, 3].map(() => block(KPI_LABEL, {}))
  return block('main', { container: flex('column', 24), padding: pad(24), self: { flex: '1' } }, [
    block('kpi-row', { container: grid('repeat(4, 1fr)', 16) }, kpiCards),
    block('charts', { container: grid('repeat(2, 1fr)', 16) }, [
      block('chart-left', { self: { minHeight: '200px' } }),
      block('chart-right', { self: { minHeight: '200px' } }),
    ]),
    block('table', { self: { minHeight: '240px' } }),
  ])
}

/** Создаёт демо-документ: корни «Дашборд» (1440), «KPI-карточка» (240) и «Карточка графика» (480). */
export function createDemoDocument(): LayoutDocument {
  const kpi = block(KPI_LABEL, { container: flex('column', 8), padding: pad(16) }, [
    block('kpi-title', {}),
    block('kpi-value', {}),
  ])
  const chartCard = block('Карточка графика', { container: flex('column', 12), padding: pad(16) }, [
    block('chart-title', {}),
    block('chart-area', { self: { minHeight: '180px' } }),
  ])
  const dashboard = block('Дашборд', { container: flex('column', null) }, [
    buildHeader(),
    block('body', { container: grid('240px 1fr', 0) }, [buildSidebar(), buildMain()]),
  ])
  return {
    ...createDocument('Дашборд аналитики'),
    schemaVersion: SCHEMA_VERSION,
    labelCounter: 0,
    roots: [root(dashboard, 80, 80, 1440), root(kpi, 1600, 80, 240), root(chartCard, 1600, 360, 480)],
  }
}
