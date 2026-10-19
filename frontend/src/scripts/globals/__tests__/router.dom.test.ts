/** Тесты роутера приложения: перенаправление на вход, возврат после входа, офлайн-режим, витрина по ?ui. */
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '@/scripts/globals/router'

/** Подменяет fetch: на любой запрос отвечает статусом (`null` — сбой сети). */
function stubStatus(status: number | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      status === null
        ? Promise.reject(new TypeError('Failed to fetch'))
        : Promise.resolve(new Response(status === 200 ? '{"authenticated":true}' : null, { status })),
    ),
  )
}

/** Роутер в памяти, перешедший по адресу; возвращает итоговый полный адрес. */
async function navigate(path: string, isDev = false): Promise<string> {
  const router = createAppRouter(createMemoryHistory(), isDev)
  await router.push(path)
  return router.currentRoute.value.fullPath
}

describe('роутер приложения', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('без сессии редактор ведёт на вход с адресом возврата', async () => {
    stubStatus(401)
    expect(await navigate('/?demo')).toBe('/login?redirect=/?demo')
  })

  it('с сессией — редактор, а страница входа возвращает назад', async () => {
    stubStatus(200)
    expect(await navigate('/')).toBe('/')
    setActivePinia(createPinia())
    expect(await navigate('/login?redirect=/%3Fdemo')).toBe('/?demo')
  })

  it('сервер недоступен — редактор открывается офлайн', async () => {
    stubStatus(null)
    expect(await navigate('/')).toBe('/')
    setActivePinia(createPinia())
    stubStatus(502)
    expect(await navigate('/')).toBe('/')
  })

  it('неизвестный адрес — в редактор', async () => {
    stubStatus(200)
    expect(await navigate('/nope')).toBe('/')
  })

  it('?ui ведёт на витрину только в dev, без проверки сессии', async () => {
    stubStatus(401)
    expect(await navigate('/?ui', true)).toBe('/ui-kit')
    setActivePinia(createPinia())
    expect(await navigate('/?ui', false)).toBe('/login?redirect=/?ui')
  })
})
