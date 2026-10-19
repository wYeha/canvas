/** Константы слоя базы: шаблон имени файла миграции, путь к файлу базы в памяти. */

/** Имя файла миграции: трёхзначный номер, подчёркивание, имя, `.sql` (`001_init.sql`). */
export const MIGRATION_FILE_PATTERN = /^(\d{3})_[\w-]+\.sql$/

/** Специальный путь better-sqlite3: база в памяти (тесты). */
export const IN_MEMORY_DATABASE = ':memory:'
