/** Запросы входа к API (проверка сессии, вход по паролю, выход) и текст ошибки входа для пользователя. */
import { authStatusSchema, type AuthStatus } from '@shared'
import { apiRequest, isUnavailable, type ApiFailure, type ApiResult } from '@/scripts/globals/api'

/** Пути API входа. */
const AUTH_PATHS = {
  ME: '/auth/me',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
} as const

/** Проверяет сессию: успех — сессия действительна, `unauthorized` — нужно войти. */
export function fetchSession(): Promise<ApiResult<AuthStatus>> {
  return apiRequest(AUTH_PATHS.ME, { schema: authStatusSchema })
}

/** Входит по паролю; при успехе сервер ставит httpOnly-cookie сессии. */
export function requestLogin(password: string): Promise<ApiResult<undefined>> {
  return apiRequest(AUTH_PATHS.LOGIN, { method: 'POST', body: { password } })
}

/** Выходит: сервер удаляет сессию и cookie. */
export function requestLogout(): Promise<ApiResult<undefined>> {
  return apiRequest(AUTH_PATHS.LOGOUT, { method: 'POST' })
}

/** Тексты ошибок входа, если сервер не прислал свой. */
export const LOGIN_ERROR_MESSAGES = {
  INVALID_PASSWORD: 'Неверный пароль',
  UNAVAILABLE: 'Сервер недоступен, попробуйте позже',
  UNKNOWN: 'Не удалось войти',
} as const

/** Текст ошибки входа: сервер недоступен — общий текст; иначе текст сервера (неверный пароль, лимит попыток). */
export function loginErrorMessage(error: ApiFailure): string {
  if (isUnavailable(error)) return LOGIN_ERROR_MESSAGES.UNAVAILABLE
  if (error.message !== null) return error.message
  return error.kind === 'unauthorized' ? LOGIN_ERROR_MESSAGES.INVALID_PASSWORD : LOGIN_ERROR_MESSAGES.UNKNOWN
}
