/** DOM-тесты getTabbable: невидимые, inert и внутри disabled fieldset элементы не попадают в ловушку. */
import { afterEach, describe, expect, it } from 'vitest'
import { getTabbable } from '@/scripts/globals/focus-trap'

let container: HTMLElement | null = null

/** Создаёт контейнер с разметкой в документе. */
function setup(html: string): HTMLElement {
  container = document.createElement('div')
  container.innerHTML = html
  document.body.append(container)
  return container
}

afterEach(() => {
  container?.remove()
  container = null
})

describe('getTabbable', () => {
  it('берёт видимые доступные элементы и пропускает disabled и tabindex=-1', () => {
    const root = setup(
      '<button id="a"></button><button id="b" disabled></button><input id="c" tabindex="-1" /><a id="d" href="#"></a>',
    )
    expect(getTabbable(root).map((el) => el.id)).toEqual(['a', 'd'])
  })

  it('пропускает элементы в скрытых предках (v-show, hidden, inert) и с visibility:hidden', () => {
    const root = setup(`
      <button id="a"></button>
      <div style="display: none"><button id="b"></button></div>
      <div hidden><button id="c"></button></div>
      <div inert><button id="d"></button></div>
      <button id="e" style="visibility: hidden"></button>
    `)
    expect(getTabbable(root).map((el) => el.id)).toEqual(['a'])
  })

  it('пропускает элементы внутри disabled fieldset', () => {
    const root = setup('<fieldset disabled><input id="a" /></fieldset><fieldset><input id="b" /></fieldset>')
    expect(getTabbable(root).map((el) => el.id)).toEqual(['b'])
  })
})
