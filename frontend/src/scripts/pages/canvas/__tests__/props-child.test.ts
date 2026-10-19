/** Тесты секции «Как ребёнок»: подсказка, число колонок, нормализация, правка self и composable со стором. */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import {
  CHILD_FLEX_OPTIONS,
  displayChildFlex,
  childHint,
  countGridColumns,
  normalizeChildFlex,
  normalizeChildSize,
  normalizeRepeat,
  withSelfSpan,
  withSelfText,
} from '@/scripts/pages/canvas/props-child'
import { createFlexContainer, createGridContainer } from '@/scripts/pages/canvas/factories'
import { findNode } from '@/scripts/pages/canvas/tree-query'
import { useCanvasPropsChild } from '@/scripts/pages/canvas/use-canvas-props-child'
import { makeDoc } from './tree-fixture'

describe('countGridColumns', () => {
  it('repeat, список треков, имена линий', () => {
    expect(countGridColumns('repeat(3, 1fr)')).toBe(3)
    expect(countGridColumns('250px 1fr')).toBe(2)
    expect(countGridColumns('  1fr   2fr  1fr ')).toBe(3)
    expect(countGridColumns('[a] 1fr [b] 200px')).toBe(2)
    expect(countGridColumns('repeat(2, 100px 1fr) 50px')).toBe(5)
    expect(countGridColumns('repeat(2, minmax(0, 1fr))')).toBe(2)
  })

  it('auto-fill и пустое — null', () => {
    expect(countGridColumns('repeat(auto-fill, minmax(200px, 1fr))')).toBeNull()
    expect(countGridColumns('1fr repeat(auto-fit, 100px)')).toBeNull()
    expect(countGridColumns('')).toBeNull()
  })
})

describe('childHint', () => {
  it('flex: стрелка по направлению', () => {
    expect(childHint({ ...createFlexContainer(), direction: 'row' })).toBe('в flex →')
    expect(childHint({ ...createFlexContainer(), direction: 'column' })).toBe('в flex ↓')
    expect(childHint({ ...createFlexContainer(), direction: 'row-reverse' })).toBe('в flex ←')
    expect(childHint({ ...createFlexContainer(), direction: 'column-reverse' })).toBe('в flex ↑')
  })

  it('grid: число колонок или без числа', () => {
    expect(childHint({ ...createGridContainer(), columns: 'repeat(3, 1fr)' })).toBe('в grid ×3')
    expect(childHint({ ...createGridContainer(), columns: 'repeat(auto-fill, 100px)' })).toBe('в grid')
  })
})

describe('нормализация', () => {
  it('flex: пробелы, пусто, небезопасное', () => {
    expect(normalizeChildFlex('  0   0  280px ')).toBe('0 0 280px')
    expect(normalizeChildFlex('')).toBe('0 1 auto')
    expect(normalizeChildFlex('   ')).toBe('0 1 auto')
    expect(normalizeChildFlex('1; color:red')).toBeNull()
  })

  it('размер: число → px, auto и пусто → пусто, единицы сохраняются', () => {
    expect(normalizeChildSize('120')).toBe('120px')
    expect(normalizeChildSize('12.5')).toBe('12.5px')
    expect(normalizeChildSize('50%')).toBe('50%')
    expect(normalizeChildSize('calc(100% - 8px)')).toBe('calc(100% - 8px)')
    expect(normalizeChildSize(' AUTO ')).toBe('')
    expect(normalizeChildSize('  ')).toBe('')
    expect(normalizeChildSize('10px}')).toBeNull()
  })

  it('быстрые значения flex: 0 1 auto, 1, auto, none', () => {
    expect(CHILD_FLEX_OPTIONS.map((o) => o.value)).toEqual(['0 1 auto', '1', 'auto', 'none'])
  })
})

describe('normalizeRepeat', () => {
  it('целое 1…24: пусто и меньше 1 — 1, больше 24 — 24, дробь — вниз', () => {
    expect(normalizeRepeat(null)).toBe(1)
    expect(normalizeRepeat(0)).toBe(1)
    expect(normalizeRepeat(-5)).toBe(1)
    expect(normalizeRepeat(3)).toBe(3)
    expect(normalizeRepeat(3.9)).toBe(3)
    expect(normalizeRepeat(24)).toBe(24)
    expect(normalizeRepeat(100)).toBe(24)
    expect(normalizeRepeat(Number.NaN)).toBe(1)
  })
})

describe('displayChildFlex', () => {
  it('пусто, пробелы и регистр дают 0 1 auto, своё значение сохраняется', () => {
    expect(displayChildFlex(undefined)).toBe('0 1 auto')
    expect(displayChildFlex('  0  1 AUTO ')).toBe('0 1 auto')
    expect(displayChildFlex(' 1 ')).toBe('1')
  })
})

describe('правка self', () => {
  it('текст: пустое удаляет ключ, остальное сохраняется, вход не мутируется', () => {
    const self = Object.freeze({ flex: '1', width: '10px' })
    expect(withSelfText(self, 'flex', '')).toEqual({ width: '10px' })
    expect(withSelfText(self, 'height', '5px')).toEqual({ flex: '1', width: '10px', height: '5px' })
  })

  it('span: null и 1 удаляют ключ, дробное округляется вниз', () => {
    const self = Object.freeze({ colSpan: 3, height: '5px' })
    expect(withSelfSpan(self, 'colSpan', null)).toEqual({ height: '5px' })
    expect(withSelfSpan(self, 'colSpan', 1)).toEqual({ height: '5px' })
    expect(withSelfSpan(self, 'colSpan', 2.7)).toEqual({ colSpan: 2, height: '5px' })
    expect(withSelfSpan(self, 'rowSpan', 4)).toEqual({ colSpan: 3, height: '5px', rowSpan: 4 })
  })
})

describe('useCanvasPropsChild', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /** Загружает фикстуру и выделяет узел. */
  function setup(id: string) {
    const layoutStore = useLayoutStore()
    expect(layoutStore.loadDocument(makeDoc()).ok).toBe(true)
    layoutStore.select(id)
    return { layoutStore, props: useCanvasPropsChild() }
  }

  /** Self узла документа. */
  function selfOf(layoutStore: ReturnType<typeof useLayoutStore>, id: string) {
    const node = findNode(layoutStore.document, id)
    if (!node) throw new Error(id)
    return node.self
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

  it('повтор: пишется в repeat узла, нормализуется, быстрые правки склеиваются в один шаг', () => {
    const { layoutStore, props } = setup('a2')
    expect(props.repeat.value).toBe(1)
    props.repeat.value = 3
    expect(findNode(layoutStore.document, 'a2')?.repeat).toBe(3)
    props.repeat.value = 99
    expect(props.repeat.value).toBe(24)
    layoutStore.undo()
    expect(findNode(layoutStore.document, 'a2')?.repeat).toBe(1)
  })

  it('повтор у корня не правится: секции нет, repeat остаётся 1', () => {
    const { layoutStore, props } = setup('A')
    props.repeat.value = 5
    expect(findNode(layoutStore.document, 'A')?.repeat).toBe(1)
  })

  it('корень: секции нет', () => {
    const { props } = setup('A')
    expect(props.node.value).toBeNull()
  })

  it('flex-родитель: быстрые значения и своё flex', () => {
    const { layoutStore, props } = setup('a2')
    expect(props.flexParent.value).toBe(true)
    expect(props.gridParent.value).toBe(false)
    expect(props.flexPreset.value).toBe('0 1 auto')
    expect(props.flexCustom.value).toBe('0 1 auto')
    props.flexPreset.value = '1'
    expect(selfOf(layoutStore, 'a2')).toEqual({ flex: '1' })
    props.flexPreset.value = '0 1 auto'
    expect(selfOf(layoutStore, 'a2')).toEqual({ flex: '0 1 auto' })
    props.flexCustom.value = ''
    props.onFlexKeydown(key('Enter'))
    expect(selfOf(layoutStore, 'a2')).toEqual({ flex: '0 1 auto' })
    props.flexCustom.value = ' 0  0 280px '
    props.onFlexKeydown(key('Enter'))
    expect(selfOf(layoutStore, 'a2')).toEqual({ flex: '0 0 280px' })
    expect(props.flexPreset.value).toBe('0 0 280px')
  })

  it('width: auto/пусто удаляют, число → px, небезопасное — ошибка и откат', () => {
    const { layoutStore, props } = setup('a2')
    props.width.value = '240'
    props.applyWidth()
    expect(selfOf(layoutStore, 'a2')).toEqual({ flex: '0 1 auto', width: '240px' })
    expect(props.width.value).toBe('240px')
    props.width.value = '1px; x'
    props.applyWidth()
    expect(props.widthError.value).toBe(true)
    expect(props.width.value).toBe('240px')
    props.width.value = 'auto'
    props.applyWidth()
    expect(selfOf(layoutStore, 'a2')).toEqual({ flex: '0 1 auto' })
  })

  it('height и min-height работают и в grid-родителе', () => {
    const { layoutStore, props } = setup('a1x')
    expect(props.gridParent.value).toBe(true)
    props.height.value = '100'
    props.applyHeight()
    props.minHeight.value = '40vh'
    props.onMinHeightKeydown(key('Enter'))
    expect(selfOf(layoutStore, 'a1x')).toEqual({ flex: '0 1 auto', height: '100px', minHeight: '40vh' })
  })

  it('span в grid-родителе: 1 и пусто удаляют ключ', () => {
    const { layoutStore, props } = setup('a1x')
    props.colSpan.value = 3
    props.rowSpan.value = 2
    expect(selfOf(layoutStore, 'a1x')).toEqual({ flex: '0 1 auto', colSpan: 3, rowSpan: 2 })
    props.colSpan.value = 1
    props.rowSpan.value = null
    expect(selfOf(layoutStore, 'a1x')).toEqual({ flex: '0 1 auto' })
  })

  it('чужие свойства не стираются при правке: flex остаётся при правке span', () => {
    const { layoutStore, props } = setup('a1x')
    layoutStore.updateNode('a1x', { self: { flex: '1', width: '5px' } })
    props.colSpan.value = 2
    expect(selfOf(layoutStore, 'a1x')).toEqual({ flex: '1', width: '5px', colSpan: 2 })
  })

  it('пустое flex старого документа показывается как 0 1 auto', () => {
    const { layoutStore, props } = setup('a3')
    layoutStore.updateNode('a3', { self: {} })
    expect(props.flexPreset.value).toBe('0 1 auto')
    expect(props.flexCustom.value).toBe('0 1 auto')
  })

  it('пресет flex правит self вложенного листа', () => {
    const { layoutStore, props } = setup('a3')
    props.flexPreset.value = 'auto'
    expect(selfOf(layoutStore, 'a3')).toEqual({ flex: 'auto' })
  })
})
