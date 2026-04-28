import electron from 'electron'

import { LOGGING_IPC_CHANNELS } from '../../shared/ipc/index.ts'
import type { LogLevel } from '../../shared/logging.ts'

export type LoggerApi = Record<
  LogLevel,
  /** 写入一条结构化日志；scope 用来标识调用模块，meta 用来承载可序列化上下文。 */
  (scope: string, message: string, meta?: unknown) => void
> & {
  /** 获取当前日志文件路径，用于诊断页展示或复制路径。 */
  getLogFilePath: () => Promise<string>
  /** 使用系统文件管理器打开日志目录。 */
  openLogDirectory: () => Promise<boolean>
}

type LoggerApiDependencies = {
  contextBridge?: {
    exposeInMainWorld: (key: string, value: unknown) => void
  }
  ipcRenderer?: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  }
}

/**
 * 创建日志桥接 API。
 *
 * 日志写入被设计成 fire-and-forget：业务代码记录日志时不应该因为磁盘写入失败阻断 UI 流程。
 */
export function createLoggerApi(dependencies: LoggerApiDependencies = {}) {
  const bridge = dependencies.contextBridge ?? electron.contextBridge
  const renderer = dependencies.ipcRenderer ?? electron.ipcRenderer

  const write = (
    level: LogLevel,
    scope: string,
    message: string,
    meta?: unknown
  ) => {
    // 吞掉日志写入异常，避免错误处理路径再次触发日志错误造成调用链噪声。
    void renderer
      .invoke(LOGGING_IPC_CHANNELS.WRITE, {
        level,
        scope,
        message,
        meta,
      })
      .catch(() => undefined)
  }

  const api: LoggerApi = {
    debug: (scope, message, meta) => write('debug', scope, message, meta),
    info: (scope, message, meta) => write('info', scope, message, meta),
    warn: (scope, message, meta) => write('warn', scope, message, meta),
    error: (scope, message, meta) => write('error', scope, message, meta),
    getLogFilePath: async () => {
      return renderer.invoke(
        LOGGING_IPC_CHANNELS.GET_FILE_PATH
      ) as Promise<string>
    },
    openLogDirectory: async () => {
      return renderer.invoke(
        LOGGING_IPC_CHANNELS.OPEN_DIRECTORY
      ) as Promise<boolean>
    },
  }

  return {
    api,
    expose() {
      // renderer 只能通过受控方法写日志，不能直接访问日志文件或主进程 logger 实例。
      bridge.exposeInMainWorld('electronLogger', api)
    },
  }
}

export function exposeLoggerApi() {
  createLoggerApi().expose()
}
