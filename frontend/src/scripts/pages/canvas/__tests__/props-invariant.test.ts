/** Инвариант панели свойств: после любой серии правок через composables документ остаётся валидным для parseDocument. */
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { parseDocument } from '@shared'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { GRID_COLUMN_PRESETS } from '@/scripts/pages/canvas/props-container-grid'
import { useCanvasPropsBlock } from '@/scripts/pages/canvas/use-canvas-props-block'
import { useCanvasPropsChild } from '@/scripts/pages/canvas/use-canvas-props-child'
import { useCanvasPropsContainer } from '@/scripts/pages/canvas/use-canvas-props-container'
import { useCanvasPropsPreview } from '@/scripts/pages/canvas/use-canvas-props-preview'
import { makeDoc } from './tree-fixture'

describe('панель свойств: документ остаётся валидным', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /** Проверяет текущий документ стора схемой с проверками целостности. */
  function expectValidStore(layoutStore: ReturnType<typeof useLayoutStore>): void {
    const result = parseDocument(layoutStore.document)
    expect(result.ok, result.ok ? '' : result.error).toBe(true)
  }

  it('padding, span 2.7, flex↔grid, пресеты ширины и колонок, очистка полей', async () => {
    const layoutStore = useLayoutStore()
    expect(layoutStore.loadDocument(makeDoc()).ok).toBe(true)
    const block = useCanvasPropsBlock()
    const container = useCanvasPropsContainer()
    const child = useCanvasPropsChild()
    const preview = useCanvasPropsPreview()

    // Корень A: padding по сторонам, пресеты ширины, переключение flex↔grid и колонки
    layoutStore.select('A')
    await nextTick()
    block.setSide('top', 4)
    block.setSide('left', 9.5)
    block.padding.value = 12
    block.padding.value = null
    preview.widthPreset.value = '1024'
    container.kind.value = 'grid'
    container.columnsPreset.value = GRID_COLUMN_PRESETS[4]?.value ?? ''
    container.columns.value = '  [a] 1fr   calc(100% - 20px) '
    container.applyColumns()
    container.rows.value = 'AUTO'
    container.applyRows()
    container.kind.value = 'flex'
    expectValidStore(layoutStore)

    // Ребёнок flex-родителя: flex, размеры, очистка
    layoutStore.select('a2')
    await nextTick()
    child.flexPreset.value = '1'
    child.flexCustom.value = '0 0 280px'
    child.applyFlex()
    child.width.value = '240'
    child.applyWidth()
    child.height.value = 'calc(100vh - 8px)'
    child.applyHeight()
    child.minHeight.value = '50%'
    child.applyMinHeight()
    expectValidStore(layoutStore)
    child.flexPreset.value = ''
    child.width.value = ''
    child.applyWidth()
    child.height.value = ''
    child.applyHeight()
    child.minHeight.value = ''
    child.applyMinHeight()
    expectValidStore(layoutStore)

    // Ребёнок grid-родителя: дробный span
    layoutStore.select('a1x')
    await nextTick()
    child.colSpan.value = 2.7
    child.rowSpan.value = 2.7
    expectValidStore(layoutStore)
    child.colSpan.value = null
    child.rowSpan.value = 1
    expectValidStore(layoutStore)

    // Небезопасный ввод отклоняется и документ не портит
    layoutStore.select('a2')
    await nextTick()
    child.flexCustom.value = '1; color: red'
    child.applyFlex()
    expect(child.flexError.value).toBe(true)
    expectValidStore(layoutStore)
  })
})
