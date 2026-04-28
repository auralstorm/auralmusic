import electronLog from 'electron-log/main'
import electron from 'electron'
import path from 'node:path'

import {
  sanitizeLogMessage,
  sanitizeLogMeta,
  sanitizeLogScope,
  type LogLevel,
} from '../../shared/logging.ts'
import {
  cleanupOldLogFiles,
  MAIN_LOG_MAX_SIZE_BYTES,
  rotateLogFile,
} from './log-retention.model.ts'

type ScopedLogger = Record<LogLevel, (message: string, meta?: unknown) => void>

let initialized = false

/** meta 允许传 falsy 值，只有 undefined 才表示没有上下文。 */
function hasMeta(meta: unknown) {
  return meta !== undefined
}

/** 写日志前统一清洗 scope/message/meta，避免 renderer 或错误对象写入不可控内容。 */
function writeScopedLog(
  logger: Pick<typeof electronLog, LogLevel>,
  level: LogLevel,
  message: string,
  meta?: unknown
) {
  const safeMessage = sanitizeLogMessage(message)

  if (hasMeta(meta)) {
    logger[level](safeMessage, sanitizeLogMeta(meta))
    return
  }

  logger[level](safeMessage)
}

/**
 * 初始化主进程日志系统。
 *
 * 日志文件、控制台级别、异常捕获和过期清理都在这里配置；函数可重复调用但只会初始化一次。
 */
export function initializeMainLogger() {
  if (initialized) {
    return
  }

  electronLog.initialize({
    preload: true,
    spyRendererConsole: false,
  })

  electronLog.transports.file.level = 'info'
  electronLog.transports.file.maxSize = MAIN_LOG_MAX_SIZE_BYTES
  electronLog.transports.file.format =
    '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] [{scope}] {text}'
  electronLog.transports.file.archiveLogFn = oldLogFile => {
    // 使用自定义轮转，保证归档数量和保留天数都由项目规则控制。
    rotateLogFile(oldLogFile.path)
  }
  electronLog.transports.console.level =
    process.env.NODE_ENV_ELECTRON_VITE === 'development' ? 'debug' : 'warn'
  electronLog.transports.console.format =
    '[{h}:{i}:{s}.{ms}] [{level}] [{scope}] {text}'

  electronLog.errorHandler.startCatching({ showDialog: false })
  electronLog.eventLogger.startLogging({
    scope: 'electron',
    level: 'warn',
  })

  cleanupOldLogFiles(path.dirname(getMainLogFilePath()))

  initialized = true
}

/** 创建带 scope 的主进程 logger，日志输出时会自动清洗 scope 和 meta。 */
export function createMainLogger(scope: string): ScopedLogger {
  const logger = electronLog.scope(sanitizeLogScope(scope))

  return {
    debug: (message, meta) => writeScopedLog(logger, 'debug', message, meta),
    info: (message, meta) => writeScopedLog(logger, 'info', message, meta),
    warn: (message, meta) => writeScopedLog(logger, 'warn', message, meta),
    error: (message, meta) => writeScopedLog(logger, 'error', message, meta),
  }
}

/** 获取当前主进程日志文件路径，用于诊断 UI 展示。 */
export function getMainLogFilePath() {
  return electronLog.transports.file.getFile().path
}

/** 使用系统文件管理器打开日志目录。 */
export async function openMainLogDirectory() {
  const result = await electron.shell.openPath(
    path.dirname(getMainLogFilePath())
  )
  return result === ''
}
