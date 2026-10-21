/** Чистая часть статуса сохранения и демо-режима: подпись статуса (с учётом синхронизации), признак демо по URL, нужно ли автосохранять. */
import { DEMO_QUERY_PARAM } from './constants'
import { SAVE_STATUS_LABELS } from './documents-constants'
import type { SaveStatus } from './documents.types'
import type { SyncState } from './documents-sync'

/** Вид статуса в хедере: локальное сохранение вместе с синхронизацией. */
export type SaveStatusKind = keyof typeof SAVE_STATUS_LABELS

/**
 * Вид статуса: демо, ошибка и идущее сохранение — как есть; сохранённое в браузере уточняется синхронизацией
 * (без сервера — «в браузере», ждёт или идёт синхронизация — «сохраняется», сбой — «нет связи», совпало — «сохранено»).
 * Незаписанный ввод в полях «Свойств» (`inputPending`) — тоже «сохраняется».
 */
export function saveStatusKind(status: SaveStatus, sync: SyncState, inputPending = false): SaveStatusKind {
  if (status !== 'saved') return status
  if (inputPending) return 'saving'
  if (sync === 'off') return 'local'
  if (sync === 'syncing') return 'saving'
  return sync === 'failed' ? 'offline' : 'saved'
}

/** Подпись статуса сохранения для хедера. */
export function saveStatusLabel(status: SaveStatus, sync: SyncState, inputPending = false): string {
  return SAVE_STATUS_LABELS[saveStatusKind(status, sync, inputPending)]
}

/** Демо запрошено, если это dev-сборка и в строке запроса есть `?demo`. В production демо недоступно всегда. */
export function isDemoRequested(search: string, isDev: boolean): boolean {
  return isDev && new URLSearchParams(search).has(DEMO_QUERY_PARAM)
}

/** Демо-документ временный: его не сохраняют и в список документов он не попадает. */
export function isAutosaveEnabled(status: SaveStatus): boolean {
  return status !== 'demo'
}
