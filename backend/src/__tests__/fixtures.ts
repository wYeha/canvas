/** Тестовые данные бэкенда: минимальный валидный документ и открытая база в памяти. */

import type { Database } from 'better-sqlite3'
import { SCHEMA_VERSION, type BlockNode, type LayoutDocument } from '@shared'
import { openDatabase } from '@/db/connection'
import { IN_MEMORY_DATABASE } from '@/db/db-constants'

/** Минимальный flex-блок без детей. */
export function blockFixture(id: string): BlockNode {
  return {
    id,
    type: 'block',
    label: id,
    description: '',
    tag: 'div',
    container: { kind: 'flex', direction: 'row', wrap: false, justify: 'flex-start', align: 'stretch', gap: null },
    self: {},
    repeat: 1,
    children: [],
  }
}

/** Валидный документ с заданным числом корневых блоков; поля можно переопределить. */
export function documentFixture(overrides: Partial<LayoutDocument> = {}, rootCount = 1): LayoutDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'doc-1',
    name: 'Дашборд',
    labelCounter: rootCount,
    roots: Array.from({ length: rootCount }, (_, index) => ({
      canvas: { x: index * 100, y: 0, width: 1440, height: null, exportMaxWidth: false },
      node: blockFixture(`root-${String(index)}`),
    })),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  }
}

/** Новая пустая база в памяти с применёнными миграциями. */
export function memoryDatabase(): Database {
  return openDatabase(IN_MEMORY_DATABASE)
}
