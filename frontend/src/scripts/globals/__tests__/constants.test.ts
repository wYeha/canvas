/** Тесты глобальных констант: селектор монтирования совпадает с контейнером в index.html. */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { APP_MOUNT_SELECTOR } from '@/scripts/globals/constants'

const INDEX_HTML_URL = new URL('../../../../index.html', import.meta.url)

describe('APP_MOUNT_SELECTOR', () => {
  it('является id-селектором', () => {
    expect(APP_MOUNT_SELECTOR.startsWith('#')).toBe(true)
  })

  it('совпадает с id контейнера в index.html', () => {
    const html = readFileSync(INDEX_HTML_URL, 'utf8')
    const id = APP_MOUNT_SELECTOR.slice(1)
    expect(html, `контейнер id="${id}" не найден в ${INDEX_HTML_URL.pathname}`).toContain(`id="${id}"`)
  })
})
