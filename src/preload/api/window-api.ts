import { contextBridge, ipcRenderer } from 'electron'

import { WINDOW_IPC_CHANNELS } from '../../shared/ipc/index.ts'

export type WindowApi = {
  /** 请求主进程关闭当前窗口；实际关闭、隐藏到托盘还是二次确认由主进程策略决定。 */
  close: () => Promise<void>
  /** 最小化当前 BrowserWindow，不向渲染进程暴露 BrowserWindow 实例本身。 */
  minimize: () => Promise<void>
  /** 在最大化和还原之间切换，并返回切换后的最大化状态。 */
  toggleMaximize: () => Promise<boolean>
  /** 在全屏和退出全屏之间切换，并返回切换后的全屏状态。 */
  toggleFullScreen: () => Promise<boolean>
  /** 将窗口隐藏到系统托盘，适用于关闭按钮被配置为后台运行的场景。 */
  hideToTray: () => Promise<void>
  /** 从托盘或后台状态恢复窗口显示。 */
  show: () => Promise<void>
  /** 主动退出整个应用，绕过单纯关闭窗口可能触发的隐藏到托盘逻辑。 */
  quitApp: () => Promise<void>
  /** 查询主窗口当前是否最大化，用于启动后同步标题栏按钮状态。 */
  isMaximized: () => Promise<boolean>
  /** 查询主窗口当前是否全屏，用于渲染层恢复窗口控制状态。 */
  isFullScreen: () => Promise<boolean>
  /** 订阅主进程广播的最大化状态变化；返回值必须在组件卸载时调用以移除监听。 */
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
  /** 订阅主进程广播的全屏状态变化；返回值必须在组件卸载时调用以移除监听。 */
  onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void
  /** 订阅主进程发起的关闭确认请求，通常用于让渲染层展示关闭行为选择。 */
  onCloseRequested: (callback: () => void) => () => void
}

const windowApi: WindowApi = {
  close: async () => {
    await ipcRenderer.invoke(WINDOW_IPC_CHANNELS.CLOSE)
  },
  minimize: async () => {
    await ipcRenderer.invoke(WINDOW_IPC_CHANNELS.MINIMIZE)
  },
  toggleMaximize: async () => {
    return ipcRenderer.invoke(WINDOW_IPC_CHANNELS.TOGGLE_MAXIMIZE)
  },
  toggleFullScreen: async () => {
    return ipcRenderer.invoke(WINDOW_IPC_CHANNELS.TOGGLE_FULLSCREEN)
  },
  hideToTray: async () => {
    await ipcRenderer.invoke(WINDOW_IPC_CHANNELS.HIDE_TO_TRAY)
  },
  show: async () => {
    await ipcRenderer.invoke(WINDOW_IPC_CHANNELS.SHOW)
  },
  quitApp: async () => {
    await ipcRenderer.invoke(WINDOW_IPC_CHANNELS.QUIT_APP)
  },
  isMaximized: async () => {
    return ipcRenderer.invoke(WINDOW_IPC_CHANNELS.IS_MAXIMIZED)
  },
  isFullScreen: async () => {
    return ipcRenderer.invoke(WINDOW_IPC_CHANNELS.IS_FULLSCREEN)
  },
  onMaximizeChange: callback => {
    // Electron 事件会带上 IpcRendererEvent，preload 层吞掉该对象，避免 renderer 依赖 IPC 细节。
    const listener = (_event: unknown, isMaximized: boolean) => {
      callback(isMaximized)
    }

    ipcRenderer.on(WINDOW_IPC_CHANNELS.MAXIMIZE_CHANGED, listener)

    return () => {
      ipcRenderer.removeListener(WINDOW_IPC_CHANNELS.MAXIMIZE_CHANGED, listener)
    }
  },
  onFullScreenChange: callback => {
    // 所有订阅 API 都返回取消函数，调用方可以用 React effect cleanup 防止重复挂载泄漏。
    const listener = (_event: unknown, isFullScreen: boolean) => {
      callback(isFullScreen)
    }

    ipcRenderer.on(WINDOW_IPC_CHANNELS.FULLSCREEN_CHANGED, listener)

    return () => {
      ipcRenderer.removeListener(
        WINDOW_IPC_CHANNELS.FULLSCREEN_CHANGED,
        listener
      )
    }
  },
  onCloseRequested: callback => {
    const listener = () => {
      callback()
    }

    ipcRenderer.on(WINDOW_IPC_CHANNELS.CLOSE_REQUESTED, listener)

    return () => {
      ipcRenderer.removeListener(WINDOW_IPC_CHANNELS.CLOSE_REQUESTED, listener)
    }
  },
}

export function exposeWindowApi() {
  // 只暴露受控的窗口操作集合，renderer 无法直接访问 ipcRenderer 或 BrowserWindow。
  contextBridge.exposeInMainWorld('electronWindow', windowApi)
}
