-- Миграция 001: таблица документов. Документ хранится целиком JSON-строкой в data,
-- остальные колонки дублируют поля документа для списка без разбора JSON.
CREATE TABLE documents (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  root_count INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX documents_updated_at ON documents (updated_at DESC);
