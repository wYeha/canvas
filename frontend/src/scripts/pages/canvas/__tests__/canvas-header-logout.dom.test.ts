/** DOM-тесты выхода в хедере: кнопка только с сессией, выход ведёт на страницу входа. */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CanvasHeader from '@/views/pages/canvas/CanvasHeader.vue'
import { useAuthStore, type SessionState } from '@/scripts/globals/auth-store'
import { createTestRouter } from '@/scripts/globals/__tests__/test-router'
import { LOGOUT_LABEL } from '@/scripts/pages/canvas/constants'

let wrapper: VueWrapper | null = null

/** Монтирует хедер с заданным состоянием сессии. */
async function mountHeader(state: SessionState) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().state = state
  const router = createTestRouter()
  await router.push('/')
  wrapper = mount(CanvasHeader, { global: { plugins: [pinia, router] }, attachTo: document.body })
  return router
}

/** Кнопка выхода или `undefined`. */
function logoutButton() {
  return wrapper?.findAll('button').find((button) => button.attributes('aria-label') === LOGOUT_LABEL)
}

describe('выход в хедере', () => {
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
  })

  it('без сессии (офлайн) кнопки нет', async () => {
    await mountHeader('offline')
    expect(logoutButton()).toBeUndefined()
  })

  it('с сессией — кнопка; клик закрывает сессию и ведёт на вход', async () => {
    const router = await mountHeader('authenticated')
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetchMock)
    await logoutButton()?.trigger('click')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }))
    expect(useAuthStore().state).toBe('anonymous')
    expect(router.currentRoute.value.name).toBe('login')
  })
})
