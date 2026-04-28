import electron from 'electron'

import { TRAY_IPC_CHANNELS } from '../../shared/ipc/index.ts'
import type { TrayCommand, TrayState } from '../../shared/tray.ts'

export type TrayApi = {
  /** 将播放状态、曲目信息等托盘菜单需要的快照同步给主进程。 */
  syncState: (state: TrayState) => Promise<void>
  /** 订阅托盘菜单命令；返回取消函数用于卸载监听。 */
  onCommand: (listener: (command: TrayCommand) => void) => () => void
}

type TrayApiDependencies = {
  contextBridge?: {
    exposeInMainWorld: (key: string, value: unknown) => void
  }
  ipcRenderer?: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    on: (channel: string, listener: (...args: unknown[]) => void) => void
    removeListener: (
      channel: string,
      listener: (...args: unknown[]) => void
    ) => void
  }
}

/**
 * 创建托盘桥接 API。
 *
 * 这里允许注入 contextBridge/ipcRenderer，是为了让单元测试可以用假实现验证通道和监听清理，
 * 生产环境则默认使用 Electron 提供的真实对象。
 */
export function createTrayApi(dependencies: TrayApiDependencies = {}) {
  const bridge = dependencies.contextBridge ?? electron.contextBridge
  const renderer = dependencies.ipcRenderer ?? electron.ipcRenderer

  const api: TrayApi = {
    syncState: async state => {
      await renderer.invoke(TRAY_IPC_CHANNELS.SYNC_STATE, state)
    },
    onCommand: listener => {
      // 托盘命令来自主进程菜单点击，renderer 只接收业务命令，不接触原始 IPC event。
      const ipcListener = (_event: unknown, command: unknown) => {
        listener(command as TrayCommand)
      }

      renderer.on(TRAY_IPC_CHANNELS.COMMAND, ipcListener)

      return () => {
        renderer.removeListener(TRAY_IPC_CHANNELS.COMMAND, ipcListener)
      }
    },
  }

  return {
    api,
    expose() {
      // 挂到 window.electronTray，和其它 preload API 保持一致的命名边界。
      bridge.exposeInMainWorld('electronTray', api)
    },
  }
}

export function exposeTrayApi() {
  createTrayApi().expose()
}
