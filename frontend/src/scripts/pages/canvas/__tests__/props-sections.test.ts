/** Тесты props-sections: состав секций, заголовок панели, разбор и изменение состояния сворачивания. */
import { describe, expect, it } from 'vitest'
import { createBlock } from '@/scripts/pages/canvas/factories'
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
    expect(propsSectionIds('block', null)).toEqual(['preview', 'block', 'container'])
  })

  it('вложенный блок: блок, контейнер, как ребёнок', () => {
    expect(propsSectionIds('block', 'flex')).toEqual(['block', 'container', 'child'])
    expect(propsSectionIds('block', 'grid')).toEqual(['block', 'container', 'child'])
  })

  it('связь: только секция связи', () => {
    expect(propsSectionIds('link', 'flex')).toEqual(['link'])
  })
})

describe('propsHeader', () => {
  it('корень: «корневой · flex»', () => {
    expect(propsHeader(doc, node('A'), null)).toMatchObject({ title: 'A', meta: 'корневой · flex' })
  })

  it('вложенный блок: «grid · ребёнок flex»', () => {
    expect(propsHeader(doc, node('a1'), 'flex')).toMatchObject({ icon: '#', meta: 'grid · ребёнок flex' })
  })

  it('связь: «связь → цель»', () => {
    expect(propsHeader(doc, node('linkB'), 'flex')).toMatchObject({ icon: '→', title: 'Связь', meta: 'связь → B' })
  })

  it('блок без подписи получает заглушку', () => {
    expect(propsHeader(doc, { ...createBlock('flex', ''), id: 'x' }, null).title).toBe('Без подписи')
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
