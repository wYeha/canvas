/** Тесты фрагмента буфера (17.4): источники связей по цепочке, разбор текста и добавление недостающих корней. */
import { describe, expect, it } from 'vitest'
import { FRAGMENT_FORMAT, parseFragment } from '@shared'
import {
  buildFragment,
  collectSources,
  serializeFragment,
  withFragmentSources,
} from '@/scripts/pages/canvas/clipboard-fragment'
import { findNode } from '@/scripts/pages/canvas/tree-query'
import { linkedDoc, otherDoc } from './clipboard-fixture'
import { expectValid } from './tree-fixture'

/** Узел `id` документа со связями (или ошибка теста). */
function nodeOf(id: string) {
  const node = findNode(linkedDoc(), id)
  if (node === undefined) throw new Error(`нет ${id}`)
  return node
}

describe('collectSources', () => {
  it('цепочка связей: сначала то, на что ссылаются (I, потом K), каждый один раз', () => {
    expect(collectSources(linkedDoc(), nodeOf('P')).map((entry) => entry.node.id)).toEqual(['I', 'K'])
  })

  it('без связей — пусто', () => {
    expect(collectSources(linkedDoc(), nodeOf('I'))).toEqual([])
  })
})

describe('текст фрагмента', () => {
  it('сериализованный фрагмент разбирается обратно', () => {
    const parsed = parseFragment(serializeFragment(buildFragment(linkedDoc(), nodeOf('P'), 1440)))
    expect(parsed.kind).toBe('fragment')
    if (parsed.kind === 'fragment') {
      expect(parsed.fragment.rootWidth).toBe(1440)
      expect(parsed.fragment.sources).toHaveLength(2)
    }
  })

  it('чужой текст и чужой JSON — не фрагмент; наша метка с битыми данными — ошибка', () => {
    expect(parseFragment('просто текст').kind).toBe('not-fragment')
    expect(parseFragment('{"a":1}').kind).toBe('not-fragment')
    expect(parseFragment(JSON.stringify({ format: FRAGMENT_FORMAT, version: 1, node: {} })).kind).toBe('invalid')
  })
})

describe('withFragmentSources', () => {
  it('добавляет только недостающие корни со своими id, столбиком от точки', () => {
    const { sources } = buildFragment(linkedDoc(), nodeOf('P'), null)
    const next = withFragmentSources(otherDoc(), sources, { x: 100, y: 50 })
    expect(next.roots.map((entry) => entry.node.id)).toEqual(['X', 'I', 'K'])
    expect(next.roots[1]?.canvas).toMatchObject({ x: 100, y: 50 })
    expectValid(next)
  })

  it('источники уже есть в документе — документ не меняется', () => {
    const doc = linkedDoc()
    const { sources } = buildFragment(doc, nodeOf('P'), null)
    expect(withFragmentSources(doc, sources, { x: 0, y: 0 })).toBe(doc)
  })
})
