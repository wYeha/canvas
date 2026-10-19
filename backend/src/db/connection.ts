/** Открытие базы SQLite: создание папки файла, настройки соединения, применение миграций. */

import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import BetterSqlite3, { type Database } from 'better-sqlite3'
import { IN_MEMORY_DATABASE } from '@/db/db-constants'
import { applyMigrations } from '@/db/migrations'

/** Открывает базу по пути (или в памяти для `:memory:`) и доводит схему до последней миграции. */
export function openDatabase(path: string): Database {
  const inMemory = path === IN_MEMORY_DATABASE
  if (!inMemory) {
    try {
      mkdirSync(dirname(path), { recursive: true })
    } catch (error) {
      throw new Error(`Не удалось создать папку для базы ${path}`, { cause: error })
    }
  }
  const db = new BetterSqlite3(path)
  // WAL: чтения не ждут записи; в памяти режим не нужен
  if (!inMemory) db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  try {
    applyMigrations(db)
  } catch (error) {
    db.close()
    throw error
  }
  return db
}
