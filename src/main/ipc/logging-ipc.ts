import electron from 'electron'

import { LOGGING_IPC_CHANNELS } from '../../shared/ipc/index.ts'
import {
  createMainLogger,
  getMainLogFilePath,
  openMainLogDirectory,
} from '../logging/logger.ts'
import { writeRendererLogPayload } from '../logging/logging-ipc.model.ts'

type LoggingIpcRegistrationOptions = {
  ipcMain?: {
    handle: (
      channel: string,
      handler: (...args: unknown[]) => unknown | Promise<unknown>
    ) => void
  }
}

/**
 * 注册日志 IPC。
 *
 * renderer 日志先经过 payload 归一化，再写入主进程日志文件，避免 renderer 构造任意日志路径。
 */
export function registerLoggingIpc(
  options: LoggingIpcRegistrationOptions = {}
) {
  const ipcMain = options.ipcMain ?? electron.ipcMain

  ipcMain.handle(LOGGING_IPC_CHANNELS.WRITE, (_event, payload) => {
    return writeRendererLogPayload(payload, createMainLogger)
  })

  ipcMain.handle(LOGGING_IPC_CHANNELS.GET_FILE_PATH, () => {
    return getMainLogFilePath()
  })

  ipcMain.handle(LOGGING_IPC_CHANNELS.OPEN_DIRECTORY, () => {
    return openMainLogDirectory()
  })
}
