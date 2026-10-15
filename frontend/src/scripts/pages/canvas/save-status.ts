/** Чистая часть статуса сохранения и демо-режима: подпись статуса, признак демо по URL, нужно ли автосохранять. */
import { DEMO_QUERY_PARAM } from './constants'
import { SAVE_STATUS_LABELS } from './documents-constants'
import type { SaveStatus } from './documents.types'

/** Подпись статуса сохранения для хедера. */
export function saveStatusLabel(status: SaveStatus): string {
  return SAVE_STATUS_LABELS[status]
}

/** Демо запрошено, если это dev-сборка и в строке запроса есть `?demo`. В production демо недоступно всегда. */
export function isDemoRequested(search: string, isDev: boolean): boolean {
  return isDev && new URLSearchParams(search).has(DEMO_QUERY_PARAM)
}

/** Демо-документ временный: его не сохраняют и в список документов он не попадает. */
export function isAutosaveEnabled(status: SaveStatus): boolean {
  return status !== 'demo'
}
