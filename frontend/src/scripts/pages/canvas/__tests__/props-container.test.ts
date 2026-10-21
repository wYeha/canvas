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
  withGap,
  withScroll,
} from '@/scripts/pages/canvas/props-container'
import { useCanvasPropsContainer } from '@/scripts/pages/canvas/use-canvas-props-container'

describe('convertContainer', () => {
  it('тот же тип возвращает как есть', () => {
    const flex = createFlexContainer()
    expect(convertContainer(flex, 'flex')).toBe(flex)
  })

  it('flex → grid: align → alignItems, остальное по умолчанию', () => {
    const flex = { ...createFlexContainer(), align: 'flex-end' as const, direction: 'column' as const }
    expect(convertContainer(flex, 'grid')).toEqual({ ...createGridContainer(), alignItems: 'end' })
  })

  it('flex → grid: baseline становится stretch', () => {
    const grid = convertContainer({ ...createFlexContainer(), align: 'baseline' }, 'grid')
    expect(grid).toMatchObject({ alignItems: 'stretch' })
  })

  it('grid → flex: alignItems → align, остальное по умолчанию', () => {
    const base = createGridContainer()
    expect(convertContainer({ ...base, alignItems: 'start' }, 'flex')).toEqual({
      ...createFlexContainer(),
      align: 'flex-start',
    })
    expect(convertContainer({ ...base, alignItems: 'center' }, 'flex')).toMatchObject({ align: 'center' })
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
    if (!node) throw new Error('нет корня')
    return node.container
  }

  it('flex-поля пишутся в документ, чужие значения игнорируются', () => {
    const { layoutStore, props } = setup()
    props.direction.value = 'row-reverse'
    props.justify.value = 'space-between'
    props.align.value = 'baseline'
    props.wrap.value = true
    expect(container(layoutStore)).toMatchObject({
      kind: 'flex',
      direction: 'row-reverse',
      justify: 'space-between',
      align: 'baseline',
      wrap: true,
    })
    props.direction.value = 'diagonal'
    props.justify.value = null
    expect(container(layoutStore)).toMatchObject({ direction: 'row-reverse', justify: 'space-between' })
  })

  it('смена типа переносит align; в grid flex-поля недоступны', () => {
    const { layoutStore, props } = setup()
    props.align.value = 'flex-end'
    props.kind.value = 'grid'
    expect(container(layoutStore)).toMatchObject({ kind: 'grid', alignItems: 'end' })
    expect(props.flex.value).toBeNull()
    props.direction.value = 'column'
    expect(container(layoutStore).kind).toBe('grid')
    props.kind.value = 'flex'
    expect(container(layoutStore)).toMatchObject({ kind: 'flex', align: 'flex-end' })
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

describe('withGap', () => {
  it('токен ставится, «нет» и чужое значение стирают поле; переключение flex↔grid сохраняет зазор', () => {
    const flex = { ...createFlexContainer(), gap: 'm' as const }
    expect(withGap(flex, 'l')).toEqual({ ...createFlexContainer(), gap: 'l' })
    expect(withGap(flex, 'none')).toEqual(createFlexContainer())
    expect(withGap(flex, 'xl')).toEqual(createFlexContainer())
    expect(convertContainer(flex, 'grid').gap).toBe('m')
  })
})

describe('withScroll', () => {
  it('ось ставится, «нет» и чужое значение стирают поле; переключение flex↔grid сохраняет прокрутку', () => {
    const flex = { ...createFlexContainer(), scroll: 'y' as const }
    expect(withScroll(flex, 'x')).toEqual({ ...createFlexContainer(), scroll: 'x' })
    expect(withScroll(flex, 'none')).toEqual(createFlexContainer())
    expect(withScroll(flex, 'z')).toEqual(createFlexContainer())
    const grid = convertContainer(flex, 'grid')
    expect(grid.scroll).toBe('y')
    expect(convertContainer(grid, 'flex').scroll).toBe('y')
    // Без заданных полей ключей нет вовсе (не undefined): документ сохраняется без мусора
    expect(convertContainer(createFlexContainer(), 'grid')).not.toHaveProperty('scroll')
  })
})
