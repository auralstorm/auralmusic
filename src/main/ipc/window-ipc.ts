import electron, { type IpcMainInvokeEvent, type BrowserWindow } from 'electron'

import { WINDOW_IPC_CHANNELS } from '../window/types'

const { app, ipcMain } = electron

/** 从 IPC 事件反查发起调用的窗口，避免 renderer 传入窗口 id。 */
function getEventWindow(event: IpcMainInvokeEvent) {
  return electron.BrowserWindow.fromWebContents(event.sender)
}

/** 恢复并聚焦窗口，和托盘恢复行为保持一致。 */
function showWindow(window: BrowserWindow | null) {
  if (!window) {
    return
  }

  if (window.isMinimized()) {
    window.restore()
  }

  window.show()
  window.focus()
}

/**
 * 注册窗口控制 IPC。
 *
 * 所有窗口操作都基于事件来源窗口执行，renderer 不能越权操作其它 BrowserWindow。
 */
export function registerWindowIpc(
  options: { onQuitRequested?: () => void } = {}
) {
  ipcMain.handle(WINDOW_IPC_CHANNELS.MINIMIZE, event => {
    const window = getEventWindow(event)
    window?.minimize()
  })

  ipcMain.handle(WINDOW_IPC_CHANNELS.TOGGLE_MAXIMIZE, event => {
    const window = getEventWindow(event)
    if (!window) {
      return false
    }

    if (window.isMaximized()) {
      window.unmaximize()
      return false
    }

    window.maximize()
    return true
  })

  ipcMain.handle(WINDOW_IPC_CHANNELS.CLOSE, event => {
    const window = getEventWindow(event)
    window?.close()
  })

  ipcMain.handle(WINDOW_IPC_CHANNELS.QUIT_APP, () => {
    // 退出请求需要先更新应用状态，否则 close 事件会被隐藏到托盘逻辑拦截。
    options.onQuitRequested?.()
    app.quit()
  })

  ipcMain.handle(WINDOW_IPC_CHANNELS.HIDE_TO_TRAY, event => {
    const window = getEventWindow(event)
    window?.hide()
  })

  ipcMain.handle(WINDOW_IPC_CHANNELS.SHOW, event => {
    const window = getEventWindow(event)
    showWindow(window)
  })

  ipcMain.handle(WINDOW_IPC_CHANNELS.IS_MAXIMIZED, event => {
    const window = getEventWindow(event)
    return window?.isMaximized() ?? false
  })

  ipcMain.handle(WINDOW_IPC_CHANNELS.TOGGLE_FULLSCREEN, event => {
    const window = getEventWindow(event)
    if (!window) {
      return false
    }

    const nextFullscreen = !window.isFullScreen()
    window.setFullScreen(nextFullscreen)
    return nextFullscreen
  })

  ipcMain.handle(WINDOW_IPC_CHANNELS.IS_FULLSCREEN, event => {
    const window = getEventWindow(event)
    return window?.isFullScreen() ?? false
  })
}

/** 将 BrowserWindow 状态变化广播给 renderer，用于同步自绘标题栏按钮状态。 */
export function bindWindowStateEvents(window: BrowserWindow) {
  const emitMaximizeState = () => {
    window.webContents.send(
      WINDOW_IPC_CHANNELS.MAXIMIZE_CHANGED,
      window.isMaximized()
    )
  }

  const emitFullscreenState = () => {
    window.webContents.send(
      WINDOW_IPC_CHANNELS.FULLSCREEN_CHANGED,
      window.isFullScreen()
    )
  }

  window.on('maximize', emitMaximizeState)
  window.on('unmaximize', emitMaximizeState)
  window.on('enter-full-screen', emitFullscreenState)
  window.on('leave-full-screen', emitFullscreenState)
}
