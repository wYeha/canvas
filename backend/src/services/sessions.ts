/** SQL-запросы к таблице sessions: создание, проверка и удаление сессий входа. В базе — только хэш токена. */

import { createHash, randomBytes } from 'node:crypto'
import type { Database } from 'better-sqlite3'
import { SESSION_TOKEN_BYTES } from '@/constants'

/** SHA-256 токена в hex: токен случайный и длинный, поэтому медленный хэш здесь не нужен. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Создаёт сессию до `now + ttlMs`; возвращает токен для cookie (в базу он не попадает). */
export function createSession(db: Database, now: Date, ttlMs: number): string {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString('base64url')
  db.prepare('INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)').run(
    hashToken(token),
    now.toISOString(),
    new Date(now.getTime() + ttlMs).toISOString(),
  )
  return token
}

/** Действительна ли сессия с этим токеном на момент `now`. Даты ISO в UTC сравниваются как строки. */
export function isSessionValid(db: Database, token: string, now: Date): boolean {
  const row: unknown = db
    .prepare('SELECT 1 FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .pluck()
    .get(hashToken(token), now.toISOString())
  return row !== undefined
}

/** Удаляет сессию по токену (выход); отсутствующая — не ошибка. */
export function deleteSession(db: Database, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
}

/** Удаляет истёкшие сессии; возвращает их число. */
export function deleteExpiredSessions(db: Database, now: Date): number {
  return db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString()).changes
}
