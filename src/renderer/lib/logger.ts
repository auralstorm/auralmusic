import {
  sanitizeLogMeta,
  sanitizeLogScope,
  type LogLevel,
} from '../../shared/logging.ts'

type RuntimeApiLike = {
  getPlatform?: () => string
  getArch?: () => string
  getAppVersion?: () => string
}

type ElectronLoggerApiLike = Record<
  LogLevel,
  (scope: string, message: string, meta?: unknown) => void
> & {
  getLogFilePath?: () => Promise<string>
  openLogDirectory?: () => Promise<boolean>
}

type RendererLoggerTarget = {
  appRuntime?: RuntimeApiLike
  electronLogger?: ElectronLoggerApiLike
}

type FallbackConsole = Record<LogLevel, (...args: unknown[]) => void>

type RendererLoggerOptions = {
  target?: RendererLoggerTarget
  fallbackConsole?: FallbackConsole
}

type RendererLogger = Record<
  LogLevel,
  (message: string, meta?: unknown) => void
>

function getDefaultTarget(): RendererLoggerTarget {
  if (typeof window === 'undefined') {
    return {}
  }

  return window as unknown as RendererLoggerTarget
}

function createRuntimeMeta(runtime?: RuntimeApiLike) {
  return {
    appVersion: runtime?.getAppVersion?.(),
    arch: runtime?.getArch?.(),
    platform: runtime?.getPlatform?.(),
    process: 'renderer',
  }
}

function withRuntimeMeta(meta: unknown, runtime?: RuntimeApiLike) {
  const baseMeta = sanitizeLogMeta(meta ?? {})
  return {
    ...baseMeta,
    runtime: createRuntimeMeta(runtime),
  }
}

export function createRendererLogger(
  scope: string,
  options: RendererLoggerOptions = {}
): RendererLogger {
  const target = options.target ?? getDefaultTarget()
  const fallbackConsole = options.fallbackConsole ?? console
  const safeScope = sanitizeLogScope(scope)

  const write = (level: LogLevel, message: string, meta?: unknown) => {
    const api = target.electronLogger

    if (api?.[level]) {
      const nextMeta = withRuntimeMeta(meta, target.appRuntime)
      api[level](safeScope, message, nextMeta)
      return
    }

    const nextMeta = sanitizeLogMeta(meta ?? {})
    fallbackConsole[level](`[${safeScope}]`, message, nextMeta)
  }

  return {
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
  }
}
