# Правила бэкенда

Обязательны для всех, кто пишет код в `backend/`. Бэкенд маленький: хранит документы одного пользователя и защищает их паролем.

## Стек

- Node.js LTS, TypeScript (`strict`), Fastify.
- SQLite через `better-sqlite3`: файл базы на сервере, без отдельного сервера БД.
- Валидация: zod-схемы из `@shared`. Это те же схемы, что проверяют импорт `.json` на фронте.
- Пароль хранится в виде хэша argon2 в `.env`. Сессия — httpOnly cookie `lc_session` (SameSite=Strict, Secure, путь `/api`) со случайным токеном; в таблице `sessions` лежит только его хэш и срок.

## Структура `backend/src`

```
main.ts            — точка входа: чтение окружения, сборка сервера, запуск
server.ts          — создание Fastify, регистрация плагинов и роутов (buildServer, без прослушивания порта)
config.ts          — чтение и проверка переменных окружения
constants.ts       — значения по умолчанию, лимиты, коды ошибок
db/
  connection.ts    — открытие SQLite, настройки соединения, применение миграций
  migrations.ts    — чтение и применение SQL-миграций, учёт в schema_migrations
  db-constants.ts  — константы слоя базы
  migrations/      — 001_init.sql, 002_... (только добавлять, не менять старые)
plugins/
  errors.ts        — единый формат ошибок, обработчик 404
  auth.ts          — разбор cookie, проверка сессии, декоратор requireAuth
routes/
  health.ts        — GET /api/health
  auth.ts          — POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
  documents.ts     — CRUD /api/documents, журнал удалений GET /api/deleted-documents
services/
  documents.ts     — SQL-запросы к таблицам documents и deleted_documents
  sessions.ts      — SQL-запросы к таблице sessions (в базе только SHA-256 токена)
cli/
  hash-password.ts — хэш argon2 для PASSWORD_HASH (npm run hash-password -w backend)
```

## Правила

1. Роуты только принимают запрос, валидируют его и вызывают сервис. SQL пишется только в `services/`.
2. Любые входные данные проверяются zod-схемой. Тело запроса ограничено 1 МБ.
3. Все роуты, кроме `/api/auth/login` и `/api/health`, закрыты авторизацией.
4. На вход стоит rate limit (`@fastify/rate-limit`). За прокси доверяем только адресам прокси (`trustProxy: 'loopback'`), не `true`: иначе клиент подделает IP левыми записями `X-Forwarded-For` и обойдёт лимит.
5. Секреты лежат только в `.env`, который не коммитится. В репозитории есть `.env.example`.
6. SQL-запросы параметризованы. Конкатенация строк в SQL запрещена.
7. Ошибки возвращаются в едином формате `{ error: { code, message } }`. Стек-трейсы наружу не отдаются.
8. Правила комментариев те же, что на фронте: шапка у каждого файла, JSDoc у каждой функции, по-русски.
9. Сервисы покрыты тестами Vitest на временной in-memory SQLite. Тесты лежат в `__tests__/` рядом с кодом; роуты проверяются через `app.inject` без открытия порта.
10. Импорты внутри `backend/src` — через алиас `@/` (→ `backend/src`), `../` запрещён, как на фронте.
