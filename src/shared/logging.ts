/** 主进程和 renderer 支持的日志级别。 */
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const

export type LogLevel = (typeof LOG_LEVELS)[number]

export type LogMeta = Record<string, unknown>

/** renderer 通过 preload 上报给主进程的日志 payload。 */
export type RendererLogPayload = {
  level: LogLevel | string
  scope: string
  message: string
  meta?: unknown
}

const SENSITIVE_KEY_PATTERN =
  /cookie|authorization|token|password|secret|music_u/i
const PATH_KEY_PATTERN = /path|filepath|targetpath|localpath/i
const URL_KEY_PATTERN = /sourceurl|audiourl|playurl|musicurl/i
const MAX_SANITIZE_DEPTH = 6

/** 只把普通对象当作可递归清洗对象，避免 Date/Map 等对象展开异常。 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}

/** 本地路径日志只保留文件名，降低泄露用户目录结构的风险。 */
function toBaseName(value: string) {
  return value.split(/[\\/]/).filter(Boolean).at(-1) || value
}

/** 音频直链和明确 URL 字段默认脱敏。 */
function shouldRedactUrl(key: string, value: string) {
  if (URL_KEY_PATTERN.test(key)) {
    return true
  }

  return (
    /^https?:\/\//i.test(value) &&
    /\.(mp3|flac|m4a|aac|ogg|wav)(\?|$)/i.test(value)
  )
}

/** 递归清洗日志值，处理敏感字段、路径、URL、Error 和深度限制。 */
function sanitizeValue(value: unknown, key: string, depth: number): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return '[redacted]'
  }

  if (typeof value === 'string') {
    if (shouldRedactUrl(key, value)) {
      return '[redacted-url]'
    }

    if (PATH_KEY_PATTERN.test(key)) {
      return toBaseName(value)
    }

    return value
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    }
  }

  if (value === null || typeof value !== 'object') {
    return value
  }

  if (depth >= MAX_SANITIZE_DEPTH) {
    return '[max-depth]'
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, key, depth + 1))
  }

  if (!isPlainObject(value)) {
    return String(value)
  }

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      sanitizeValue(entryValue, entryKey, depth + 1),
    ])
  )
}

/**
 * 统一处理日志元数据，避免用户凭证、音频直链和本地完整路径写入日志。
 * @param meta 原始日志元数据
 * @returns 可安全落盘的元数据
 */
export function sanitizeLogMeta(meta: unknown): LogMeta {
  const sanitized = sanitizeValue(meta, '', 0)
  return isPlainObject(sanitized) ? sanitized : { value: sanitized }
}

/** 校验日志级别，renderer 上报未知级别时主进程会拒绝写入。 */
export function isLogLevel(value: unknown): value is LogLevel {
  return LOG_LEVELS.includes(value as LogLevel)
}

/** 清洗日志 scope，避免奇怪字符影响日志格式或文件搜索。 */
export function sanitizeLogScope(value: unknown) {
  const scope = String(value || 'app')
    .trim()
    .replace(/[^a-zA-Z0-9:_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return (scope || 'app').slice(0, 64)
}

/** 清洗日志正文并限制长度，避免超长日志刷爆文件。 */
export function sanitizeLogMessage(value: unknown) {
  return (
    String(value || '')
      .trim()
      .slice(0, 500) || 'log'
  )
}

/** 只读取 URL host 用于日志诊断，避免完整播放直链入日志。 */
export function readLogUrlHost(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  try {
    return new URL(value).host || null
  } catch {
    return null
  }
}
