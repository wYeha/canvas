/**
 * DOM-тесты экспорта: разбор вывода браузерным парсером совпадает с моделью (на месте связей — источники),
 * инъекции в обход zod не дают лишних элементов и атрибутов.
 */
import { describe, expect, it } from 'vitest'
import {
  isLinkBlock,
  type BlockNode,
  type Container,
  type LayoutDocument,
  type LayoutNode,
  type LayoutTag,
  type RootEntry,
} from '@shared'
import { findRootEntry } from '@/scripts/pages/canvas/tree-query'
import { createBlock, createDocument, createGridContainer } from '@/scripts/pages/canvas/factories'
import { createDemoDocument } from '@/scripts/pages/canvas/demo-document'
import { toInlineStyle } from '@/scripts/pages/canvas/node-style'
import { gapVarEntries, usedGaps } from '@/scripts/pages/canvas/export/export-components'
import { exportRootHtml } from '@/scripts/pages/canvas/export/export-html'
import { exportStyleEntries, rootExportEntries } from '@/scripts/pages/canvas/export/export-style'
import { docOf, root, smallTree } from './export-fixture'

/** Разбирает текст экспорта как HTML-документ. */
function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

/** Корневой элемент экспорта: первый элемент в `body`. */
function rootElement(dom: Document): Element {
  const element = dom.body.firstElementChild
  if (!element) throw new Error('В выводе нет элементов')
  return element
}

/** Узел так, как его выводит экспорт: на месте связи — источник со свойствами места связи. */
function exported(doc: LayoutDocument | null, node: LayoutNode): LayoutNode {
  const source = doc !== null && isLinkBlock(node) ? findRootEntry(doc, node.sourceId)?.node : undefined
  return source === undefined ? node : { ...source, self: node.self, repeat: node.repeat }
}

/** Сверяет элемент с узлом модели рекурсивно: тег, стиль, число детей-элементов; `doc` — для подстановки связей. */
function expectMatches(
  element: Element,
  modelNode: LayoutNode,
  parent: Container | null,
  extra = '',
  doc: LayoutDocument | null = null,
): void {
  const node = exported(doc, modelNode)
  const direction = parent?.kind === 'flex' ? parent.direction : undefined
  const own = toInlineStyle(exportStyleEntries(node, parent?.kind ?? null, direction))
  const style = [own, extra].filter((part) => part !== '').join('; ')
  expect(element.getAttribute('style') ?? '').toBe(style)
  expect(element.tagName.toLowerCase()).toBe(node.tag)
  expect(element.children.length).toBe(node.children.length)
  node.children.forEach((child, index) => {
    const childElement = element.children.item(index)
    if (!childElement) throw new Error('Нет элемента для ребёнка')
    expectMatches(childElement, child, node.container, '', doc)
  })
}

/** Все тексты комментариев документа. */
function commentTexts(dom: Document): string[] {
  const texts: string[] = []
  const walker = dom.createTreeWalker(dom, NodeFilter.SHOW_COMMENT)
  for (let current = walker.nextNode(); current; current = walker.nextNode()) texts.push(current.textContent ?? '')
  return texts
}

/** Число узлов в поддереве модели. */
function countNodes(node: LayoutNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0)
}

/** Тег в обход типа: имитирует данные, не прошедшие zod. */
function unsafeTag(tag: string): LayoutTag {
  return tag as LayoutTag
}

/** Блок с подписью, полями поверх умолчаний и детьми. */
function block(label: string, extra: Partial<BlockNode> = {}, children: LayoutNode[] = []): BlockNode {
  return { ...createBlock('flex', label), ...extra, children }
}

describe('round-trip', () => {
  it('каждый корень демо-документа разбирается в ту же структуру и те же стили', () => {
    const doc = createDemoDocument()
    for (const entry of doc.roots) {
      const dom = parse(exportRootHtml(doc, entry))
      expect(dom.body.children.length).toBe(1)
      const gapVars = toInlineStyle([...rootExportEntries(entry.canvas), ...gapVarEntries(usedGaps(doc, [entry.node]))])
      expectMatches(rootElement(dom), entry.node, null, gapVars, doc)
    }
  })

  it('небольшое дерево: grid-ребёнок, grid-лист с rows и rowSpan, повтор, описания', () => {
    const entry = root(smallTree(), 1280, 900, false)
    const dom = parse(exportRootHtml(docOf(entry), entry))
    expectMatches(rootElement(dom), entry.node, null)
    const styles = Array.from(dom.body.querySelectorAll('div')).map((element) => element.getAttribute('style'))
    expect(styles).toContain(
      'display:grid; grid-template-columns:repeat(2, 1fr); grid-template-rows:40px 1fr; grid-row:span 2',
    )
  })

  it('корень-лист с exportMaxWidth: max-width и margin после фильтра контейнера', () => {
    const entry = root(createBlock('flex', 'Пусто'), 960, null, true)
    const dom = parse(exportRootHtml(docOf(entry), entry))
    expect(rootElement(dom).getAttribute('style')).toBe('max-width:960px; margin:0 auto')
  })

  it('корень с exportMaxWidth: export-only свойства после стилей превью', () => {
    const node = block('Лендинг', { tag: 'main' }, [block('hero', { self: { height: '400px' } })])
    const entry: RootEntry = { canvas: { x: 0, y: 0, width: 1200, height: 800, exportMaxWidth: true }, node }
    const doc: LayoutDocument = { ...createDocument(), roots: [entry] }
    const dom = parse(exportRootHtml(doc, entry))
    expectMatches(rootElement(dom), node, null, toInlineStyle(rootExportEntries(entry.canvas)))
  })
})

describe('инъекции в обход zod', () => {
  /** Документ с опасными подписями, описаниями, значениями CSS и тегами. */
  function injectedDocument(): { doc: LayoutDocument; entry: RootEntry } {
    const gridChild: BlockNode = {
      ...block('grid'),
      container: { ...createGridContainer(), columns: '1fr;}</style><script>' },
    }
    const node = block(
      '--><script>alert(1)</script><!--',
      { description: 'начало --> середина <!-- конец --!> финал' },
      [
        block('ширина', { self: { width: 'x" onclick="alert(1)' } }),
        gridChild,
        block('скрипт', { tag: unsafeTag('script') }),
        block('атрибут', { tag: unsafeTag('div onclick=x') }),
        block('описание', { description: 'строка --> раз\n<!-- два --!>' }),
      ],
    )
    const entry: RootEntry = { canvas: { x: 0, y: 0, width: 960, height: null, exportMaxWidth: false }, node }
    return { doc: { ...createDocument(), roots: [entry] }, entry }
  }

  it('нет script, нет атрибутов кроме style, элементов столько же, сколько узлов', () => {
    const { doc, entry } = injectedDocument()
    const dom = parse(exportRootHtml(doc, entry))
    expect(dom.querySelectorAll('script').length).toBe(0)
    const elements = Array.from(dom.body.querySelectorAll('*'))
    expect(elements.length).toBe(countNodes(entry.node))
    for (const element of elements) {
      expect(element.getAttributeNames().filter((name) => name !== 'style')).toEqual([])
    }
  })

  it('тексты комментариев сохраняют исходные слова', () => {
    const { doc, entry } = injectedDocument()
    const all = commentTexts(parse(exportRootHtml(doc, entry))).join('\n')
    for (const word of ['alert(1)', 'script', 'начало', 'середина', 'конец', 'финал', 'раз', 'два']) {
      expect(all).toContain(word)
    }
  })

  it('есть комментарии-предупреждения об отброшенных свойствах и заменённых тегах', () => {
    const { doc, entry } = injectedDocument()
    const texts = commentTexts(parse(exportRootHtml(doc, entry)))
    expect(texts).toContain(' внимание: отброшено небезопасное значение свойства «width» ')
    expect(texts).toContain(' внимание: отброшено небезопасное значение свойства «grid-template-columns» ')
    expect(texts.filter((text) => text === ' внимание: недопустимый тег заменён на div ').length).toBe(2)
  })
})
