/** Тесты grid-части секции «Контейнер»: чистые функции (пресеты, нормализация, выравнивание) и composable с черновиками и стором. */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import {
  GRID_ALIGN_OPTIONS,
  GRID_COLUMN_PRESETS,
  activeColumnPreset,
  asGridAlign,
  normalizeColumns,
  normalizeRows,
  rowsFromField,
  rowsToField,
} from '@/scripts/pages/canvas/props-container-grid'
import { useCanvasPropsContainer } from '@/scripts/pages/canvas/use-canvas-props-container'

describe('пресеты колонок', () => {
  it('значения по плану', () => {
    expect(GRID_COLUMN_PRESETS.map((p) => p.value)).toEqual([
      'repeat(2, 1fr)',
      'repeat(3, 1fr)',
      'repeat(4, 1fr)',
      '250px 1fr',
      'repeat(auto-fill, minmax(200px, 1fr))',
    ])
  })

  it('активный пресет сравнивается после нормализации пробелов', () => {
    expect(activeColumnPreset('repeat(3, 1fr)')).toBe('repeat(3, 1fr)')
    expect(activeColumnPreset('  250px    1fr ')).toBe('250px 1fr')
    expect(activeColumnPreset('1fr 2fr')).toBeNull()
  })
})

describe('нормализация шаблонов', () => {
  it('columns: пусто и небезопасное — null, иначе нормализованная строка', () => {
    expect(normalizeColumns('  1fr   2fr ')).toBe('1fr 2fr')
    expect(normalizeColumns('   ')).toBeNull()
    expect(normalizeColumns('1fr; x')).toBeNull()
  })

  it('rows: пусто и auto дают пустое поле, небезопасное — null', () => {
    expect(normalizeRows('')).toBe('')
    expect(normalizeRows(' auto ')).toBe('')
    expect(normalizeRows('100px  1fr')).toBe('100px 1fr')
    expect(normalizeRows('a{b}')).toBeNull()
  })

  it('rows: auto в любом регистре даёт пустое поле', () => {
    expect(normalizeRows('AUTO')).toBe('')
    expect(normalizeRows(' Auto ')).toBe('')
  })

  it('поле строк и значение документа переводятся друг в друга', () => {
    expect(rowsToField('auto')).toBe('')
    expect(rowsToField('1fr 2fr')).toBe('1fr 2fr')
    expect(rowsFromField('')).toBe('auto')
    expect(rowsFromField('1fr')).toBe('1fr')
  })
})

describe('выравнивание', () => {
  it('слова start/center/end/stretch, чужое отклоняется', () => {
    expect(GRID_ALIGN_OPTIONS.map((o) => o.value)).toEqual(['start', 'center', 'end', 'stretch'])
    expect(asGridAlign('end')).toBe('end')
    expect(asGridAlign('flex-end')).toBeNull()
  })
})

describe('useCanvasPropsContainer (grid)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /** Grid-корень с выделением и composable. */
  function setup() {
    const layoutStore = useLayoutStore()
    layoutStore.addRoot('grid', 'Корень', { x: 0, y: 0 })
    layoutStore.select(layoutStore.document.roots[0]?.node.id ?? null)
    return { layoutStore, props: useCanvasPropsContainer() }
  }

  /** Контейнер корня документа. */
  function container(layoutStore: ReturnType<typeof useLayoutStore>) {
    const node = layoutStore.document.roots[0]?.node
    if (!node) throw new Error('нет корня')
    return node.container
  }

  /** Минимальное событие клавиши для onKeydown черновика. */
  function key(code: string): KeyboardEvent {
    const event = {
      code,
      ctrlKey: false,
      metaKey: false,
      /** Заглушка preventDefault. */
      preventDefault: () => undefined,
      /** Заглушка stopPropagation. */
      stopPropagation: () => undefined,
    }
    return event as unknown as KeyboardEvent
  }

  it('columns: Enter применяет нормализованное значение, Esc откатывает', () => {
    const { layoutStore, props } = setup()
    props.columns.value = '  1fr   3fr '
    props.onColumnsKeydown(key('Enter'))
    expect(container(layoutStore)).toMatchObject({ columns: '1fr 3fr' })
    expect(props.columns.value).toBe('1fr 3fr')
    props.columns.value = '5fr'
    props.onColumnsKeydown(key('Escape'))
    expect(props.columns.value).toBe('1fr 3fr')
    expect(container(layoutStore)).toMatchObject({ columns: '1fr 3fr' })
  })

  it('columns: пустое и небезопасное — ошибка и откат, документ не меняется', () => {
    const { layoutStore, props } = setup()
    props.columns.value = ''
    props.applyColumns()
    expect(props.columnsError.value).toBe(true)
    expect(props.columns.value).toBe('repeat(2, 1fr)')
    props.columns.value = '1fr; color:red'
    props.applyColumns()
    expect(props.columnsError.value).toBe(true)
    expect(container(layoutStore)).toMatchObject({ columns: 'repeat(2, 1fr)' })
    props.onColumnsKeydown(key('KeyA'))
    expect(props.columnsError.value).toBe(false)
  })

  it('rows: пусто и auto — auto; свой шаблон пишется', () => {
    const { layoutStore, props } = setup()
    expect(props.rows.value).toBe('')
    props.rows.value = '100px 1fr'
    props.applyRows()
    expect(container(layoutStore)).toMatchObject({ rows: '100px 1fr' })
    props.rows.value = 'auto'
    props.applyRows()
    expect(container(layoutStore)).toMatchObject({ rows: 'auto' })
    expect(props.rows.value).toBe('')
    props.rows.value = '<b>'
    props.applyRows()
    expect(props.rowsError.value).toBe(true)
    expect(container(layoutStore)).toMatchObject({ rows: 'auto' })
  })

  it('пресет колонок пишется сразу и подсвечивается', async () => {
    const { layoutStore, props } = setup()
    expect(props.columnsPreset.value).toBe('repeat(2, 1fr)')
    props.columnsPreset.value = '250px 1fr'
    await nextTick()
    expect(container(layoutStore)).toMatchObject({ columns: '250px 1fr' })
    expect(props.columnsPreset.value).toBe('250px 1fr')
    expect(props.columns.value).toBe('250px 1fr')
  })

  it('justify/align items: только допустимые слова', () => {
    const { layoutStore, props } = setup()
    props.justifyItems.value = 'center'
    props.alignItems.value = 'end'
    props.alignItems.value = 'baseline'
    expect(container(layoutStore)).toMatchObject({ justifyItems: 'center', alignItems: 'end' })
  })
})
