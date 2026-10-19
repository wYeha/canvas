/** Тесты решения навигации: вход, возврат после входа, офлайн-режим, безопасный адрес возврата. */
import { describe, expect, it } from 'vitest'
import { resolveGuard, safeRedirect, type GuardTarget } from '@/scripts/globals/auth-guard'

const canvas: GuardTarget = { name: 'canvas', fullPath: '/?demo', requiresAuth: true, redirect: undefined }
const login: GuardTarget = { name: 'login', fullPath: '/login', requiresAuth: false, redirect: '/?demo' }

describe('resolveGuard', () => {
  it('не вошедшего ведёт на вход с адресом возврата', () => {
    expect(resolveGuard(canvas, 'anonymous')).toEqual({ name: 'login', query: { redirect: '/?demo' } })
  })

  it('вошедшего и офлайн пускает в редактор', () => {
    expect(resolveGuard(canvas, 'authenticated')).toBe(true)
    expect(resolveGuard(canvas, 'offline')).toBe(true)
  })

  it('вошедшего со страницы входа возвращает по адресу возврата', () => {
    expect(resolveGuard(login, 'authenticated')).toBe('/?demo')
    expect(resolveGuard(login, 'anonymous')).toBe(true)
    expect(resolveGuard(login, 'offline')).toBe(true)
  })

  it('маршрут без входа пускает всегда', () => {
    expect(resolveGuard({ ...canvas, requiresAuth: false }, 'anonymous')).toBe(true)
  })
})

describe('safeRedirect', () => {
  it('пропускает только внутренние пути', () => {
    expect(safeRedirect('/?demo')).toBe('/?demo')
    expect(safeRedirect('//evil.example')).toBe('/')
    expect(safeRedirect('https://evil.example')).toBe('/')
    expect(safeRedirect(['/a'])).toBe('/')
    expect(safeRedirect(undefined)).toBe('/')
  })
})
