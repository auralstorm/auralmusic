import {
  isLogLevel,
  sanitizeLogMessage,
  sanitizeLogMeta,
  sanitizeLogScope,
  type LogLevel,
  type RendererLogPayload,
} from '../../shared/logging.ts'

type ScopedLogger = Record<LogLevel, (message: string, meta?: unknown) => void>

type NormalizedRendererLogPayload = {
  level: LogLevel
  scope: string
  message: string
  meta?: unknown
}

/**
 * 归一化 renderer 上报的日志 payload。
 *
 * renderer 是非可信边界，主进程写入前必须校验日志级别并清洗 scope/message/meta。
 */
export function normalizeRendererLogPayload(
  payload: unknown
): NormalizedRendererLogPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const value = payload as Partial<RendererLogPayload>
  if (!isLogLevel(value.level)) {
    return null
  }

  const scope = `renderer:${sanitizeLogScope(value.scope)}`
  const message = sanitizeLogMessage(value.message)
  const meta =
    value.meta === undefined ? undefined : sanitizeLogMeta(value.meta)

  return {
    level: value.level,
    scope,
    message,
    ...(meta === undefined ? {} : { meta }),
  }
}

/** 将 renderer 日志写入主进程日志文件，返回 false 表示 payload 被拒绝。 */
export function writeRendererLogPayload(
  payload: unknown,
  createLogger: (scope: string) => ScopedLogger
) {
  const normalized = normalizeRendererLogPayload(payload)
  if (!normalized) {
    return false
  }

  const logger = createLogger(normalized.scope)
  logger[normalized.level](normalized.message, normalized.meta)
  return true
}
