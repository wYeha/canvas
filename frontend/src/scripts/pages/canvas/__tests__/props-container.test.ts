/** Тесты секции «Контейнер»: convertContainer, варианты переключателей, повороты иконок и запись flex-полей через composable и стор. */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ICON_PATHS } from '@/scripts/components/ui-icon/ui-icon.constants'
import { createFlexContainer, createGridContainer } from '@/scripts/pages/canvas/factories'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import {
  ALIGN_OPTIONS,
  DIRECTION_OPTIONS,
  JUSTIFY_OPTIONS,
  asFlexAlign,
  asFlexDirection,
  convertContainer,
  iconOrientation,
} from '@/scripts/pages/canvas/props-container'
import { useCanvasPropsContainer } from '@/scripts/pages/canvas/use-canvas-props-container'

describe('convertContainer', () => {
  it('тот же тип возвращает как есть', () => {
    const flex = createFlexContainer()
    expect(convertContainer(flex, 'flex')).toBe(flex)
  })

  it('flex → grid: gap в оба отступа, align → alignItems, остальное по умолчанию', () => {
    const flex = { ...createFlexContainer(), gap: 12, align: 'flex-end' as const, direction: 'column' as const }
    expect(convertContainer(flex, 'grid')).toEqual({
      ...createGridContainer(),
      columnGap: 12,
      rowGap: 12,
      alignItems: 'end',
    })
  })

  it('flex → grid: baseline становится stretch, пустой gap остаётся null', () => {
    const grid = convertContainer({ ...createFlexContainer(), align: 'baseline' }, 'grid')
    expect(grid).toMatchObject({ alignItems: 'stretch', columnGap: null, rowGap: null })
  })

  it('grid → flex: gap = columnGap ?? rowGap, alignItems → align, остальное по умолчанию', () => {
    const base = createGridContainer()
    expect(convertContainer({ ...base, columnGap: 8, rowGap: 4, alignItems: 'start' }, 'flex')).toEqual({
      ...createFlexContainer(),
      gap: 8,
      align: 'flex-start',
    })
    expect(convertContainer({ ...base, columnGap: null, rowGap: 4 }, 'flex')).toMatchObject({ gap: 4 })
    expect(convertContainer({ ...base, alignItems: 'center' }, 'flex')).toMatchObject({ gap: null, align: 'center' })
  })
})

describe('варианты и иконки', () => {
  it('число сегментов и подпись с CSS-значением', () => {
    expect(DIRECTION_OPTIONS.map((o) => o.label)).toEqual(['row', 'column', 'row-reverse', 'column-reverse'])
    expect(JUSTIFY_OPTIONS).toHaveLength(6)
    expect(ALIGN_OPTIONS).toHaveLength(5)
  })

  it('все иконки сегментов есть в наборе UiIcon', () => {
    for (const option of [...DIRECTION_OPTIONS, ...JUSTIFY_OPTIONS, ...ALIGN_OPTIONS]) {
      expect(option.icon && option.icon in ICON_PATHS).toBe(true)
    }
  })

  it('asFlex*: чужое значение отсекается', () => {
    expect(asFlexDirection('column')).toBe('column')
    expect(asFlexDirection('diagonal')).toBeNull()
    expect(asFlexAlign('start')).toBeNull()
  })

  it('iconOrientation: поворот по направлению и оси', () => {
    expect(iconOrientation('row', 'justify')).toBeNull()
    expect(iconOrientation('row-reverse', 'justify')).toBe('mirror')
    expect(iconOrientation('column', 'justify')).toBe('column')
    expect(iconOrientation('column-reverse', 'justify')).toBe('column-reverse')
    expect(iconOrientation('row-reverse', 'align')).toBeNull()
    expect(iconOrientation('column', 'align')).toBe('cross')
  })
})

describe('useCanvasPropsContainer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /** Flex-корень с выделением и composable. */
  function setup() {
    const layoutStore = useLayoutStore()
    layoutStore.addRoot('flex', 'Корень', { x: 0, y: 0 })
    layoutStore.select(layoutStore.document.roots[0]?.node.id ?? null)
    return { layoutStore, props: useCanvasPropsContainer() }
  }

  /** Контейнер корня документа. */
  function container(layoutStore: ReturnType<typeof useLayoutStore>) {
    const node = layoutStore.document.roots[0]?.node
    if (node?.type !== 'block') throw new Error('нет корня')
    return node.container
  }

  it('flex-поля пишутся в документ, чужие значения игнорируются', () => {
    const { layoutStore, props } = setup()
    props.direction.value = 'row-reverse'
    props.justify.value = 'space-between'
    props.align.value = 'baseline'
    props.wrap.value = true
    props.gap.value = 16
    expect(container(layoutStore)).toMatchObject({
      kind: 'flex',
      direction: 'row-reverse',
      justify: 'space-between',
      align: 'baseline',
      wrap: true,
      gap: 16,
    })
    props.direction.value = 'diagonal'
    props.justify.value = null
    expect(container(layoutStore)).toMatchObject({ direction: 'row-reverse', justify: 'space-between' })
    props.gap.value = null
    expect(container(layoutStore)).toMatchObject({ gap: null })
  })

  it('смена типа переносит gap и align; в grid flex-поля недоступны', () => {
    const { layoutStore, props } = setup()
    props.gap.value = 10
    props.align.value = 'flex-end'
    props.kind.value = 'grid'
    expect(container(layoutStore)).toMatchObject({ kind: 'grid', columnGap: 10, rowGap: 10, alignItems: 'end' })
    expect(props.flex.value).toBeNull()
    props.direction.value = 'column'
    expect(container(layoutStore).kind).toBe('grid')
    props.kind.value = 'flex'
    expect(container(layoutStore)).toMatchObject({ kind: 'flex', gap: 10, align: 'flex-end' })
    props.kind.value = 'bogus'
    expect(container(layoutStore).kind).toBe('flex')
  })

  it('классы иконок следуют направлению', () => {
    const { props } = setup()
    props.direction.value = 'column'
    expect(props.justifyClasses.value).toEqual([
      'canvas-props-container__icons',
      'canvas-props-container__icons--column',
    ])
    expect(props.alignClasses.value).toContain('canvas-props-container__icons--cross')
    props.direction.value = 'row'
    expect(props.justifyClasses.value).toEqual(['canvas-props-container__icons'])
  })
})
