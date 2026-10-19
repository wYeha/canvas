/** Миграции SQLite: SQL-файлы `NNN_имя.sql` из папки migrations применяются по порядку, применённые записываются в таблицу. */

import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Database } from 'better-sqlite3'
import { MIGRATION_FILE_PATTERN } from '@/db/db-constants'

/** Папка с SQL-файлами миграций рядом с этим модулем. */
const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations', import.meta.url))

/** Миграция: номер версии, имя файла и текст SQL. */
export interface Migration {
  version: number
  name: string
  sql: string
}

/** Читает миграции из папки и сортирует по номеру; файлы не по шаблону `NNN_имя.sql` пропускаются. */
export function readMigrations(dir: string = MIGRATIONS_DIR): Migration[] {
  return readdirSync(dir)
    .flatMap((name) => {
      const match = MIGRATION_FILE_PATTERN.exec(name)
      return match?.[1] ? [{ version: Number(match[1]), name, sql: readFileSync(`${dir}/${name}`, 'utf8') }] : []
    })
    .sort((a, b) => a.version - b.version)
}

/** Версии уже применённых миграций; таблица учёта `schema_migrations` создаётся при первом вызове. */
function appliedVersions(db: Database): Set<number> {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  ) STRICT`)
  const rows = db.prepare('SELECT version FROM schema_migrations').pluck().all()
  return new Set(rows.filter((version): version is number => typeof version === 'number'))
}

/**
 * Применяет ещё не применённые миграции, каждую в своей транзакции: при ошибке SQL эта миграция откатывается целиком,
 * а запуск сервера падает с именем файла. Возвращает номера применённых сейчас версий.
 */
export function applyMigrations(db: Database, migrations: readonly Migration[] = readMigrations()): number[] {
  const done = appliedVersions(db)
  const record = db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
  const applied: number[] = []
  for (const migration of migrations) {
    if (done.has(migration.version)) continue
    try {
      db.transaction(() => {
        db.exec(migration.sql)
        record.run(migration.version, migration.name, new Date().toISOString())
      })()
    } catch (error) {
      throw new Error(`Миграция ${migration.name} не применилась`, { cause: error })
    }
    applied.push(migration.version)
  }
  return applied
}
