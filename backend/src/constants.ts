/** Константы бэкенда: значения окружения по умолчанию (в том числе путь к базе), лимиты запросов, коды ошибок API, параметры сессий и входа. */

/** Адрес по умолчанию: только локальный интерфейс, снаружи API доступно через nginx. */
export const DEFAULT_HOST = '127.0.0.1'
export const DEFAULT_PORT = 3000
export const DEFAULT_LOG_LEVEL = 'info'
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const
export const MAX_PORT = 65535

/** Файл базы SQLite относительно рабочей папки процесса; папка `backend/data/` не коммитится. */
export const DEFAULT_DATABASE_PATH = 'data/layout-canvas.db'

/** Файл переменных окружения относительно рабочей папки процесса (`npm run dev -w backend` запускается из backend/). */
export const ENV_FILE_PATH = '.env'

/** Предельный размер тела запроса: 1 МБ (правила бэкенда, п. 2). */
export const BODY_LIMIT_BYTES = 1024 * 1024

/** Предельная длина id документа в адресе (UUID — 36 символов); меньше `maxParamLength` Fastify (100), иначе он ответит 414 до проверки. */
export const MAX_DOCUMENT_ID_LENGTH = 64

/** Префикс всех маршрутов API. */
export const API_PREFIX = '/api'

/** Коды ошибок в едином формате ответа `{ error: { code, message } }`. */
export const ERROR_CODES = {
  notFound: 'NOT_FOUND',
  badRequest: 'BAD_REQUEST',
  internal: 'INTERNAL_ERROR',
  validation: 'VALIDATION_ERROR',
  documentNotFound: 'DOCUMENT_NOT_FOUND',
  documentExists: 'DOCUMENT_EXISTS',
  idMismatch: 'ID_MISMATCH',
  unauthorized: 'UNAUTHORIZED',
  invalidPassword: 'INVALID_PASSWORD',
  rateLimited: 'RATE_LIMITED',
} as const

/** Тексты ошибок для клиента: без подробностей реализации и стек-трейсов. */
export const ERROR_MESSAGES = {
  notFound: 'Маршрут не найден',
  badRequest: 'Некорректный запрос',
  internal: 'Внутренняя ошибка сервера',
  invalidId: 'Некорректный id документа',
  documentNotFound: 'Документ не найден',
  documentExists: 'Документ с таким id уже есть',
  idMismatch: 'id в адресе и в документе не совпадают',
  unauthorized: 'Нужно войти',
  invalidPassword: 'Неверный пароль',
  rateLimited: 'Слишком много попыток входа, попробуйте позже',
} as const

export const HTTP_STATUS_OK = 200
export const HTTP_STATUS_CREATED = 201
export const HTTP_STATUS_NO_CONTENT = 204
export const HTTP_STATUS_BAD_REQUEST = 400
export const HTTP_STATUS_UNAUTHORIZED = 401
export const HTTP_STATUS_NOT_FOUND = 404
export const HTTP_STATUS_CONFLICT = 409
export const HTTP_STATUS_TOO_MANY_REQUESTS = 429
export const HTTP_STATUS_INTERNAL = 500

/** Хэш пароля в `.env`: строка argon2 в PHC-формате (`$argon2id$v=19$...`). */
export const PASSWORD_HASH_PATTERN = /^\$argon2(id|i|d)\$/

/** Имя cookie сессии. */
export const SESSION_COOKIE_NAME = 'lc_session'

/** Cookie сессии отправляется только к API. */
export const SESSION_COOKIE_PATH = '/api'

/** Срок жизни сессии: 30 дней (один пользователь, вход редкий). */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** Длина случайного токена сессии в байтах. */
export const SESSION_TOKEN_BYTES = 32

/** Лимит попыток входа с одного IP за окно. */
export const LOGIN_RATE_LIMIT_MAX = 10

/** Окно лимита попыток входа: 15 минут. */
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000

/**
 * Каким прокси верить при `TRUST_PROXY=true`: nginx на той же машине (адреса loopback). IP клиента — самый правый
 * адрес `X-Forwarded-For`, не принадлежащий доверенным (его дописал nginx); левые записи задаёт клиент, им верить нельзя.
 */
export const TRUSTED_PROXY = 'loopback'
