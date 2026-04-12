import electron, { type IpcMainInvokeEvent, type BrowserWindow } from 'electron'

import { WINDOW_IPC_CHANNELS } from '../window/types'

const { ipcMain } = electron

function getEventWindow(event: IpcMainInvokeEvent) {
  return electron.BrowserWindow.fromWebContents(event.sender)
}

export function registerWindowIpc() {
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
