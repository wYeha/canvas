/** Тесты генератора HTML: формат комментариев и тегов на небольшом дереве, снапшот демо-документа, детерминированность. */
import { describe, expect, it } from 'vitest'
import { createFlexContainer } from '@/scripts/pages/canvas/factories'
import { createDemoDocument } from '@/scripts/pages/canvas/demo-document'
import { exportNodeLines, exportRootHtml } from '@/scripts/pages/canvas/export/export-html'
import { block, docOf, root, smallTree } from './export-fixture'

describe('exportRootHtml', () => {
  it('небольшое дерево с фиксированной высотой корня', () => {
    const entry = root(smallTree(), 1280, 900, false)
    expect(exportRootHtml(docOf(entry), entry)).toMatchInlineSnapshot(`
      "<!-- Корневой блок «Каталог», ширина превью 1280px, высота превью 900px
        Страница каталога
        для десктопа
      -->
      <main style="display:flex; flex-direction:column; gap:24px">
        <!-- cards
          Карточки товаров
          по три в ряд
        -->
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; flex:1">
          <div><!-- card ×3 — Карточка товара --></div>
          <div></div>
          <div style="grid-column:span 2">
            <!-- promo
              Рекламный блок

              с картинкой
            -->
          </div>
          <div style="display:grid; grid-template-columns:repeat(2, 1fr); grid-template-rows:40px 1fr; column-gap:8px; grid-row:span 2"><!-- gallery --></div>
        </div>
        <footer style="height:80px"><!-- footer --></footer>
      </main>
      "
    `)
  })

  it('exportMaxWidth: max-width и margin после styleEntries, в заголовке «по центру»', () => {
    const entry = root(block('flex', 'Лендинг', { repeat: 2 }), 1200, null, true)
    expect(exportRootHtml(docOf(entry), entry)).toMatchInlineSnapshot(`
      "<!-- Корневой блок «Лендинг» ×2, max-width 1200px по центру -->
      <div style="max-width:1200px; margin:0 auto"></div>
      "
    `)
  })

  it('пустая подпись корня → «Без подписи»; описание из одной строки — следующей строкой заголовка', () => {
    const entry = root(block('grid', '  ', { description: 'Одна строка' }), 480, null, false)
    expect(exportRootHtml(docOf(entry), entry)).toMatchInlineSnapshot(`
      "<!-- Корневой блок «Без подписи», ширина превью 480px
        Одна строка
      -->
      <div></div>
      "
    `)
  })

  it('демо-документ: корень «Дашборд»', () => {
    const doc = createDemoDocument()
    const [dashboard] = doc.roots
    if (!dashboard) throw new Error('В демо нет корней')
    expect(exportRootHtml(doc, dashboard)).toMatchSnapshot()
  })

  it('текст заканчивается ровно одним переводом строки и не содержит \\r', () => {
    const doc = createDemoDocument()
    for (const entry of doc.roots) {
      const html = exportRootHtml(doc, entry)
      expect(html.endsWith('\n')).toBe(true)
      expect(html.endsWith('\n\n')).toBe(false)
      expect(html).not.toContain('\r')
    }
  })
})

describe('детерминированность', () => {
  it('документы с разными id дают одинаковый текст', () => {
    const first = createDemoDocument()
    const second = createDemoDocument()
    expect(second.roots[0]?.node.id).not.toBe(first.roots[0]?.node.id)
    const texts = [first, second].map((doc) => doc.roots.map((entry) => exportRootHtml(doc, entry)).join(''))
    expect(texts[1]).toBe(texts[0])
  })
})

describe('exportNodeLines', () => {
  it('вложенный узел: свойства «как ребёнок» по реальному родителю и отступ по глубине', () => {
    const leaf = block('flex', 'cell', { self: { colSpan: 2, flex: '1' } })
    expect(exportNodeLines(docOf(), leaf, 'grid', 1)).toEqual(['  <div style="grid-column:span 2"><!-- cell --></div>'])
  })

  it('пустой лист без подписи — без комментария, без редакторского min-height и без контейнера по умолчанию', () => {
    expect(exportNodeLines(docOf(), block('flex', ''), 'flex', 0)).toEqual(['<div></div>'])
  })

  it('лист с изменённым контейнером сохраняет контейнерную часть целиком', () => {
    const leaf = block('flex', 'row', { container: { ...createFlexContainer(), gap: 8 } })
    expect(exportNodeLines(docOf(), leaf, 'flex', 0)).toEqual(['<div style="display:flex; gap:8px"><!-- row --></div>'])
  })
})
