import electron from 'electron'

import { TRAY_IPC_CHANNELS } from '../../shared/ipc/index.ts'
import type { TrayState } from '../../shared/tray.ts'

type TrayIpcOptions = {
  ipcMain?: {
    handle: (
      channel: string,
      handler: (...args: unknown[]) => unknown | Promise<unknown>
    ) => void
  }
  trayController: {
    setState: (state: TrayState) => void
  }
}

/**
 * 创建托盘 IPC 注册器。
 *
 * renderer 只同步托盘显示状态，真正的菜单构建和系统托盘生命周期由 TrayController 管理。
 */
export function createTrayIpc(options: TrayIpcOptions) {
  const ipcMain = options.ipcMain ?? electron.ipcMain

  return {
    register() {
      ipcMain.handle(
        TRAY_IPC_CHANNELS.SYNC_STATE,
        (_event, state: TrayState) => {
          options.trayController.setState(state)
        }
      )
    },
  }
}

/** 注册托盘 IPC 的便捷入口，保持和其它 registerXxxIpc 一致。 */
export function registerTrayIpc(options: TrayIpcOptions) {
  createTrayIpc(options).register()
}
