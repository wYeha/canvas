/** Тесты props-sections: состав секций, заголовок панели, разбор и изменение состояния сворачивания. */
import { describe, expect, it } from 'vitest'
import { createBlock, createLinkBlock } from '@/scripts/pages/canvas/factories'
import { NO_SOURCE_LABELS } from '@/scripts/pages/canvas/node-view'
import {
  isSectionOpen,
  parseSectionsState,
  propsHeader,
  propsSectionIds,
  withSectionOpen,
} from '@/scripts/pages/canvas/props-sections'
import { findNode } from '@/scripts/pages/canvas/tree-query'
import { makeDoc } from './tree-fixture'

const doc = makeDoc()

/** Находит узел фикстуры, который обязан существовать. */
function node(id: string) {
  const found = findNode(doc, id)
  if (found === undefined) throw new Error(id)
  return found
}

describe('propsSectionIds', () => {
  it('корневой блок: превью, блок, контейнер', () => {
    expect(propsSectionIds(node('A'), null)).toEqual(['preview', 'block', 'container'])
  })

  it('вложенный блок: блок, контейнер, как ребёнок', () => {
    expect(propsSectionIds(node('a1'), 'flex')).toEqual(['block', 'container', 'child'])
    expect(propsSectionIds(node('b1'), 'grid')).toEqual(['block', 'container', 'child'])
  })

  it('связь: только «Связь» и «Как ребёнок»', () => {
    expect(propsSectionIds(createLinkBlock('C'), 'flex')).toEqual(['link', 'child'])
  })
})

describe('propsHeader', () => {
  it('корень: «корневой · flex»', () => {
    expect(propsHeader(node('A'), null, NO_SOURCE_LABELS)).toMatchObject({ title: 'A', meta: 'корневой · flex' })
  })

  it('вложенный блок: «grid · ребёнок flex»', () => {
    expect(propsHeader(node('a1'), 'flex', NO_SOURCE_LABELS)).toMatchObject({ icon: '#', meta: 'grid · ребёнок flex' })
  })

  it('связь: значок ⇢, имя источника, «связь · ребёнок flex»', () => {
    expect(propsHeader(createLinkBlock('C'), 'flex', new Map([['C', 'Карточка']]))).toEqual({
      icon: '⇢',
      title: 'Карточка',
      meta: 'связь · ребёнок flex',
    })
  })

  it('блок без подписи получает заглушку', () => {
    expect(propsHeader({ ...createBlock('flex', ''), id: 'x' }, null, NO_SOURCE_LABELS).title).toBe('Без подписи')
  })
})

describe('состояние секций', () => {
  it('по умолчанию все раскрыты', () => {
    expect(isSectionOpen({}, 'block')).toBe(true)
  })

  it('разбор: валидный JSON, мусор отбрасывается', () => {
    expect(parseSectionsState('{"block":false,"child":"x"}')).toEqual({ block: false })
    expect(parseSectionsState(null)).toEqual({})
    expect(parseSectionsState('не json')).toEqual({})
    expect(parseSectionsState('[true]')).toEqual({})
    expect(parseSectionsState('null')).toEqual({})
  })

  it('withSectionOpen не мутирует вход', () => {
    const state = Object.freeze({ block: true })
    const next = withSectionOpen(state, 'container', false)
    expect(next).toEqual({ block: true, container: false })
    expect(isSectionOpen(next, 'container')).toBe(false)
  })
})
