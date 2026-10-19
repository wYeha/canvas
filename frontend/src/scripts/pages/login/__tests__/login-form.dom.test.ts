/** DOM-тесты формы входа: фокус, ошибка неверного пароля, переход после входа по адресу возврата, недоступный сервер. */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Router } from 'vue-router'
import LoginPage from '@/views/pages/login/LoginPage.vue'
import { LOGIN_ERROR_MESSAGES } from '@/scripts/globals/auth-api'
import { createTestRouter } from '@/scripts/globals/__tests__/test-router'

let wrapper: VueWrapper | null = null

/** Подменяет fetch очередью ответов (`null` — сбой сети). */
function stubResponses(...responses: ({ status: number; body?: unknown } | null)[]) {
  const fetchMock = vi.fn(() => {
    const next = responses.shift()
    if (!next) return Promise.reject(new TypeError('Failed to fetch'))
    const body = next.body === undefined ? null : JSON.stringify(next.body)
    return Promise.resolve(new Response(body, { status: next.status }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Монтирует страницу входа на адресе `path`. */
async function mountLogin(path = '/login'): Promise<{ router: Router; input: HTMLInputElement }> {
  setActivePinia(createPinia())
  const router = createTestRouter()
  await router.push(path)
  wrapper = mount(LoginPage, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { router, input: wrapper.get<HTMLInputElement>('input[type="password"]').element }
}

/** Вводит пароль и отправляет форму. */
async function submit(password: string): Promise<void> {
  if (!wrapper) throw new Error('Форма не смонтирована')
  await wrapper.get('input').setValue(password)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('форма входа', () => {
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
  })

  it('фокус в поле пароля; кнопка недоступна без пароля', async () => {
    const { input } = await mountLogin()
    expect(document.activeElement).toBe(input)
    expect(wrapper?.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('неверный пароль: текст ошибки, поле очищено и снова в фокусе, адрес тот же', async () => {
    const { router, input } = await mountLogin()
    stubResponses({ status: 401, body: { error: { code: 'INVALID_PASSWORD', message: 'Неверный пароль' } } })
    await submit('не тот')
    expect(wrapper?.text()).toContain('Неверный пароль')
    expect(input.value).toBe('')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(input)
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('верный пароль: переход по адресу возврата', async () => {
    const { router } = await mountLogin('/login?redirect=/%3Fdemo')
    const fetchMock = stubResponses({ status: 204 })
    await submit('пароль')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ body: '{"password":"пароль"}' }),
    )
    expect(router.currentRoute.value.fullPath).toBe('/?demo')
  })

  it('сервер недоступен — понятный текст', async () => {
    await mountLogin()
    stubResponses(null)
    await submit('пароль')
    expect(wrapper?.text()).toContain(LOGIN_ERROR_MESSAGES.UNAVAILABLE)
  })
})
