/** Тест единого источника: HOTKEY_GROUPS совпадает с таблицей раздела «Горячие клавиши» в docs/USER_GUIDE.md. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { HOTKEY_GROUPS } from '@/scripts/modals/hotkeys-modal/hotkeys-modal.constants'
import type { HotkeyGroup } from '@/scripts/modals/hotkeys-modal/hotkeys-modal.types'

/** Путь к руководству от корня репозитория (шесть уровней вверх от этой папки). */
const GUIDE_PATH = fileURLToPath(new URL('../../../../../../docs/USER_GUIDE.md', import.meta.url))
/** Заголовок раздела с таблицей (без статуса ✅/⏳). */
const SECTION_TITLE = '## Горячие клавиши'
/** Маркер готовности в тексте руководства. */
const DONE_MARK = '✅'
/** Заголовок группы в таблице: «**Блоки**». */
const GROUP_HEADING = /^\*\*(.+)\*\*$/

/** Убирает маркер ✅ (вместе с пробелом перед ним) и лишние пробелы. */
function clean(text: string): string {
  return text.replaceAll(` ${DONE_MARK}`, '').replaceAll(DONE_MARK, '').replace(/\s+/g, ' ').trim()
}

/** Строки таблицы раздела: подряд идущие строки, начинающиеся с «|», после заголовка раздела. */
function tableLines(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/)
  const start = lines.findIndex((line) => line.startsWith(SECTION_TITLE))
  expect(start).toBeGreaterThanOrEqual(0)
  const rest = lines.slice(start + 1)
  const table = rest.slice(rest.findIndex((line) => line.startsWith('|')))
  const end = table.findIndex((line) => !line.startsWith('|'))
  return end === -1 ? table : table.slice(0, end)
}

/** Разбирает таблицу руководства в группы: строка `**Раздел**` открывает группу, остальные — строки группы. */
function parseGuide(markdown: string): HotkeyGroup[] {
  const groups: { title: string; rows: { keys: string; action: string }[] }[] = []
  // Первые две строки — шапка и разделитель
  for (const line of tableLines(markdown).slice(2)) {
    const [keysCell = '', actionCell = ''] = line.split('|').slice(1, 3)
    const keys = keysCell.trim()
    const heading = GROUP_HEADING.exec(keys)
    if (heading?.[1] !== undefined) groups.push({ title: heading[1], rows: [] })
    else groups.at(-1)?.rows.push({ keys, action: clean(actionCell) })
  }
  return groups
}

describe('HOTKEY_GROUPS и USER_GUIDE.md', () => {
  const guide = parseGuide(readFileSync(GUIDE_PATH, 'utf-8'))

  it('разделы совпадают по порядку и названиям', () => {
    expect(guide.map((group) => group.title)).toEqual(HOTKEY_GROUPS.map((group) => group.title))
  })

  it('строки каждого раздела совпадают по порядку и тексту', () => {
    expect(guide).toEqual(HOTKEY_GROUPS)
  })

  it('в константе нет маркеров готовности', () => {
    expect(JSON.stringify(HOTKEY_GROUPS)).not.toContain(DONE_MARK)
  })
})
