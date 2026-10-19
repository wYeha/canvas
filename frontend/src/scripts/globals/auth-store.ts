/**
 * Pinia-хранилище сессии: проверена ли она, вход и выход. Нужна роутеру, странице входа и хедеру редактора.
 * Сервер недоступен — режим `offline`: редактор работает с локальными документами, вход не требуется.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isUnavailable } from '@/scripts/globals/api'
import { fetchSession, loginErrorMessage, requestLogin, requestLogout } from '@/scripts/globals/auth-api'

/** Состояние сессии: ещё не проверена, вошли, не вошли, сервер недоступен. */
export type SessionState = 'unknown' | 'authenticated' | 'anonymous' | 'offline'

/** Результат входа: успех или текст ошибки для пользователя. */
export type LoginOutcome = { ok: true } | { ok: false; message: string }

/** Хранилище сессии. */
export const useAuthStore = defineStore('auth', () => {
  const state = ref<SessionState>('unknown')
  let pending: Promise<SessionState> | null = null

  /** Спрашивает сервер о сессии. Сбой, кроме «не вошли», считается недоступностью сервера: локальная работа не блокируется. */
  async function check(): Promise<SessionState> {
    const result = await fetchSession()
    if (result.ok) state.value = 'authenticated'
    else state.value = result.error.kind === 'unauthorized' ? 'anonymous' : 'offline'
    return state.value
  }

  /** Состояние сессии; сервер спрашивается один раз (параллельные вызовы ждут один запрос). */
  function ensureChecked(): Promise<SessionState> {
    if (state.value !== 'unknown') return Promise.resolve(state.value)
    pending ??= check().finally(() => {
      pending = null
    })
    return pending
  }

  /** Входит по паролю. */
  async function login(password: string): Promise<LoginOutcome> {
    const result = await requestLogin(password)
    if (result.ok) {
      state.value = 'authenticated'
      return { ok: true }
    }
    if (isUnavailable(result.error)) state.value = 'offline'
    return { ok: false, message: loginErrorMessage(result.error) }
  }

  /** Выходит; даже если сервер не ответил, приложение считает сессию закрытой и ведёт на вход. */
  async function logout(): Promise<void> {
    await requestLogout()
    state.value = 'anonymous'
  }

  /** Проверяет сессию заново (сервер мог появиться после офлайна). */
  function recheck(): Promise<SessionState> {
    state.value = 'unknown'
    return ensureChecked()
  }

  /** Сервер ответил «нужно войти» на другой запрос (например, при синхронизации): сессия истекла. */
  function markAnonymous(): void {
    state.value = 'anonymous'
  }

  return { state, ensureChecked, recheck, login, logout, markAnonymous }
})
