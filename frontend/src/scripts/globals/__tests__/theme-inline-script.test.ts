/** Тесты: inline-скрипт темы в index.html использует те же ключ, атрибут, запрос и значения, что constants.ts. */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PREFERS_DARK_QUERY, THEMES, THEME_ATTRIBUTE, THEME_STORAGE_KEY } from '@/scripts/globals/constants'

const INDEX_HTML_URL = new URL('../../../../index.html', import.meta.url)

/** Возвращает текст inline-скрипта (без src) из <head> index.html. */
function readInlineScript(): string {
  const html = readFileSync(INDEX_HTML_URL, 'utf8')
  const match = /<script>([\s\S]*?)<\/script>/.exec(html)
  return match?.[1] ?? ''
}

describe('inline-скрипт темы в index.html', () => {
  const script = readInlineScript()

  it('найден в index.html', () => {
    expect(script).not.toBe('')
  })

  it.each([
    ['ключ localStorage', THEME_STORAGE_KEY],
    ['атрибут темы', THEME_ATTRIBUTE],
    ['медиазапрос тёмной темы', PREFERS_DARK_QUERY],
    ['светлая тема', THEMES.LIGHT],
    ['тёмная тема', THEMES.DARK],
  ])('содержит %s из constants.ts', (_name, value) => {
    expect(script).toContain(`'${value}'`)
  })
})
