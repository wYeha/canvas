/** Тесты чистой логики панели «Слои»: значок, подпись, сворачивание, раскрытие пути, классы строки. */
import { describe, expect, it } from 'vitest'
import {
  expandPath,
  layerCaption,
  layerChevronClasses,
  layerIcon,
  layerRowClasses,
  layerToggleLabel,
  toggleCollapsed,
} from '@/scripts/pages/canvas/layers'
import { createLinkBlock } from '@/scripts/pages/canvas/factories'
import { NO_SOURCE_LABELS } from '@/scripts/pages/canvas/node-view'
import { findNode, getPath } from '@/scripts/pages/canvas/tree-query'
import { block, makeDoc } from './tree-fixture'

const doc = makeDoc()

/** Узел фикстуры по id (тест падает, если его нет). */
function node(id: string) {
  const found = findNode(doc, id)
  if (found === undefined) throw new Error(`нет узла ${id}`)
  return found
}

describe('layerIcon / layerCaption', () => {
  it('блок: значок по виду контейнера и подпись', () => {
    expect(layerIcon(node('A'))).toBe('flex')
    expect(layerIcon(node('a1'))).toBe('grid')
    expect(layerCaption(node('a1'), NO_SOURCE_LABELS)).toBe('a1')
  })

  it('пустая подпись — заглушка', () => {
    expect(layerCaption({ ...block('x', 'flex'), label: '  ' }, NO_SOURCE_LABELS)).toBe('Без подписи')
  })
})

describe('строка связи', () => {
  it('значок link, подпись — имя источника, без источника — «источник не найден»', () => {
    const link = { ...createLinkBlock('C'), id: 'l' }
    expect(layerIcon(link)).toBe('link')
    expect(layerCaption(link, new Map([['C', 'Карточка']]))).toBe('Карточка')
    expect(layerCaption(link, NO_SOURCE_LABELS)).toBe('источник не найден')
  })
})

describe('toggleCollapsed', () => {
  it('добавляет и убирает id, вход не меняет', () => {
    const empty = new Set<string>()
    const once = toggleCollapsed(empty, 'A')
    expect([...once]).toEqual(['A'])
    expect(empty.size).toBe(0)
    expect(toggleCollapsed(once, 'A').size).toBe(0)
  })
})

describe('expandPath', () => {
  it('раскрывает свёрнутых предков, сам узел оставляет как есть', () => {
    const collapsed = new Set(['A', 'a1', 'a1x', 'C'])
    const next = expandPath(collapsed, getPath(doc, 'a1x'))
    expect([...next].sort()).toEqual(['C', 'a1x'])
    expect(collapsed.size).toBe(4)
  })

  it('без изменений возвращает то же множество', () => {
    const collapsed = new Set(['C'])
    expect(expandPath(collapsed, getPath(doc, 'a1x'))).toBe(collapsed)
    expect(expandPath(collapsed, [])).toBe(collapsed)
  })
})

describe('классы и подсказки строки', () => {
  it('выделение важнее наведения, корень помечен', () => {
    expect(layerRowClasses({ root: true, selected: true, hovered: true })).toEqual([
      'canvas-layer-item__row',
      'canvas-layer-item__row--root',
      'canvas-layer-item__row--selected',
    ])
    expect(layerRowClasses({ root: false, selected: false, hovered: true })).toEqual([
      'canvas-layer-item__row',
      'canvas-layer-item__row--hovered',
    ])
  })

  it('модификаторы перетаскивания в «Слоях»', () => {
    expect(
      layerRowClasses({
        root: false,
        selected: false,
        hovered: false,
        dragSource: true,
        dropInside: true,
        dropForbidden: true,
      }),
    ).toEqual([
      'canvas-layer-item__row',
      'canvas-layer-item__row--drag-source',
      'canvas-layer-item__row--drop-inside',
      'canvas-layer-item__row--drop-forbidden',
    ])
  })

  it('шеврон и подсказка зависят от раскрытия', () => {
    expect(layerChevronClasses(true)).toEqual(['canvas-layer-item__chevron'])
    expect(layerChevronClasses(false)).toContain('canvas-layer-item__chevron--collapsed')
    // Имя с подписью блока: у каждой стрелки своё (скринридер и агенты различают их)
    expect(layerToggleLabel(true, 'nav')).toBe('Свернуть «nav»')
    expect(layerToggleLabel(false, 'nav')).toBe('Развернуть «nav»')
  })
})
