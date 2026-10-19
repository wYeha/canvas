/** Тесты миграций: порядок, повторный запуск без изменений, откат упавшей миграции, файл базы на диске. */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import BetterSqlite3 from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from '@/db/connection'
import { applyMigrations, readMigrations, type Migration } from '@/db/migrations'

/** Список таблиц базы (без служебных sqlite_*). */
function tables(db: BetterSqlite3.Database): unknown[] {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .pluck()
    .all()
}

describe('миграции', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  it('читает файлы по порядку номеров, начиная с 001_init', () => {
    const migrations = readMigrations()
    expect(migrations[0]?.name).toBe('001_init.sql')
    const versions = migrations.map((migration) => migration.version)
    expect(versions).toEqual([...versions].sort((a, b) => a - b))
  })

  it('создаёт таблицы documents, deleted_documents, sessions и учёт миграций; повторный запуск ничего не применяет', () => {
    const db = new BetterSqlite3(':memory:')
    expect(applyMigrations(db)).toEqual(readMigrations().map((migration) => migration.version))
    expect(tables(db)).toEqual(['deleted_documents', 'documents', 'schema_migrations', 'sessions'])
    expect(applyMigrations(db)).toEqual([])
    db.close()
  })

  it('упавшая миграция откатывается целиком и не записывается', () => {
    const db = new BetterSqlite3(':memory:')
    const broken: Migration[] = [{ version: 1, name: '001_broken.sql', sql: 'CREATE TABLE a (x INTEGER); NOT SQL' }]
    expect(() => applyMigrations(db, broken)).toThrow(/001_broken\.sql/)
    expect(tables(db)).toEqual(['schema_migrations'])
    db.close()
  })

  it('openDatabase создаёт папку и файл базы, при повторном открытии схема та же', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lc-db-'))
    tempDirs.push(dir)
    const path = join(dir, 'nested', 'test.db')
    openDatabase(path).close()
    const reopened = openDatabase(path)
    expect(tables(reopened)).toEqual(['deleted_documents', 'documents', 'schema_migrations', 'sessions'])
    reopened.close()
  })
})
