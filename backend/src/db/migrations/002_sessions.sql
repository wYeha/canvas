-- Миграция 002: сессии входа. Хранится только SHA-256 токена из cookie: утечка базы не даёт готовых сессий.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
) STRICT;

CREATE INDEX sessions_expires_at ON sessions (expires_at);
