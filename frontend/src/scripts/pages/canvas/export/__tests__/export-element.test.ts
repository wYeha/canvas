/** Тесты экспорта смыслового элемента (15.4): тег листа, пометка в комментарии у пустых элементов и контейнеров. */
import { describe, expect, it } from 'vitest'
import { exportRootHtml } from '@/scripts/pages/canvas/export/export-html'
import { block, docOf, root } from './export-fixture'

/** HTML страницы с детьми `children`. */
function html(children: ReturnType<typeof block>[]): string {
  const doc = docOf(root(block('flex', 'Страница', { id: 'page' }, children), 1440, null, false))
  const [entry] = doc.roots
  if (!entry) throw new Error('нет корня')
  return exportRootHtml(doc, entry)
}

describe('экспорт смыслового элемента', () => {
  it('у листа элемент становится тегом вместо раскладочного', () => {
    const out = html([block('flex', 'Заголовок', { element: 'h1' }), block('flex', 'Купить', { element: 'button' })])
    expect(out).toContain('<h1><!-- Заголовок --></h1>')
    expect(out).toContain('<button><!-- Купить --></button>')
  })

  it('пустые элементы (img, input) и контейнеры — пометкой в начале комментария, тег раскладочный', () => {
    const out = html([
      block('flex', 'аватар', { element: 'img' }),
      block('flex', '', { element: 'input' }),
      block('flex', 'список', { element: 'ul' }, [block('flex', 'пункт', { element: 'li' })]),
    ])
    expect(out).toContain('<div><!-- img: аватар --></div>')
    expect(out).toContain('<div><!-- input --></div>')
    expect(out).toContain('<!-- ul: список -->')
    expect(out).toContain('<li><!-- пункт --></li>')
  })

  it('незнакомый элемент — пометкой, в тег не попадает', () => {
    expect(html([block('flex', 'виджет', { element: 'my-widget' })])).toContain('<div><!-- my-widget: виджет --></div>')
  })
})

describe('экспорт колонок на узких экранах (15.5)', () => {
  it('намерение в комментарии grid-контейнера и в заголовке корня', () => {
    const cards = block('grid', 'карточки', {}, [block('flex', 'a'), block('flex', 'b')])
    const narrowCards = {
      ...cards,
      container: { ...cards.container, columns: 'repeat(3, 1fr)', narrowColumns: [2, 1] },
    } as typeof cards
    expect(html([narrowCards])).toContain('<!-- карточки, колонки на узких экранах: 3 → 2 → 1 -->')
    const page = block('grid', 'Страница', { id: 'page' })
    const narrowPage = { ...page, container: { ...page.container, narrowColumns: [1] } } as typeof page
    const doc = docOf(root(narrowPage, 1440, null, false))
    const [entry] = doc.roots
    if (!entry) throw new Error('нет корня')
    expect(exportRootHtml(doc, entry).split('\n')[0]).toContain('колонки на узких экранах: 2 → 1')
  })
})
