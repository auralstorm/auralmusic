import type {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  WebContents,
} from 'electron'

import type { CloseBehavior } from '../config/types'
import { resolveWindowCloseBehavior } from './close-behavior.ts'
import { toggleDetachedDevTools } from './devtools.ts'
import { WINDOW_IPC_CHANNELS } from './types.ts'
import {
  resolvePreloadPath,
  resolveRendererLoadTarget,
} from './window-paths.ts'
import path from 'node:path'

type BrowserWindowConstructor = new (
  options: BrowserWindowConstructorOptions
) => BrowserWindow

type CreateMainWindowOptions = {
  platform: NodeJS.Platform
  preloadPath: string
  mainDirname: string
  appIsPackaged: boolean
  resourcesPath?: string
}

type CreateMainWindowDependencies = {
  BrowserWindow: BrowserWindowConstructor
  globalShortcut: {
    register: (accelerator: string, callback: () => void) => boolean
  }
  appIsPackaged: boolean
  envRendererUrl?: string
  isDevelopment: boolean
  mainDirname: string
  platform: NodeJS.Platform
  getIsQuitting: () => boolean
  setMainWindow: (window: BrowserWindow | null) => void
  getMainWindow: () => BrowserWindow | null
  hideMainWindowToTray: () => void
  bindWindowStateEvents: (window: BrowserWindow) => void
  getCloseBehavior: () => CloseBehavior
  applyWindowTitleBarTheme: (window: BrowserWindow) => void
  syncConfiguredGlobalShortcuts: (window: BrowserWindow | null) => void
  clearConfiguredGlobalShortcuts: () => void
}

export function createMainWindowOptions({
  platform,
  preloadPath,
  mainDirname,
  appIsPackaged,
  resourcesPath = process.resourcesPath,
}: CreateMainWindowOptions): BrowserWindowConstructorOptions {
  const isMac = platform === 'darwin'
  const isWindows = platform === 'win32'

  return {
    width: 1280,
    height: 760,
    minWidth: 1280,
    minHeight: 760,
    frame: !isWindows,
    maximizable: false,
    titleBarStyle: isMac ? 'hiddenInset' : isWindows ? undefined : 'hidden',
    titleBarOverlay: isMac ? false : isWindows ? false : true,
    autoHideMenuBar: true,
    icon: resolveMainWindowIconPath({
      appIsPackaged,
      mainDirname,
      resourcesPath,
    }),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
    },
  }
}

export function resolveMainWindowIconPath({
  appIsPackaged,
  mainDirname,
  resourcesPath = process.resourcesPath,
}: {
  appIsPackaged: boolean
  mainDirname: string
  resourcesPath?: string
}) {
  return appIsPackaged
    ? path.join(resourcesPath, 'build', 'icons', 'icon.ico')
    : path.resolve(mainDirname, '../../build/icons/icon.ico')
}

export function showMainWindow(window: BrowserWindow | null) {
  if (!window) {
    return
  }

  if (window.isMinimized()) {
    window.restore()
  }

  window.show()
  window.focus()
}

function registerWindowCloseBehavior({
  window,
  getIsQuitting,
  getCloseBehavior,
  hideMainWindowToTray,
}: {
  window: BrowserWindow
  getIsQuitting: () => boolean
  getCloseBehavior: () => CloseBehavior
  hideMainWindowToTray: () => void
}) {
  window.on('close', event => {
    const nextBehavior = resolveWindowCloseBehavior({
      isQuitting: getIsQuitting(),
      closeBehavior: getCloseBehavior(),
    })

    if (nextBehavior === 'allow-close') {
      return
    }

    event.preventDefault()

    if (nextBehavior === 'hide-to-tray') {
      hideMainWindowToTray()
      return
    }

    window.webContents.send(WINDOW_IPC_CHANNELS.CLOSE_REQUESTED)
  })
}

function registerDetachedDevToolsShortcut({
  globalShortcut,
  getMainWindow,
  isDevelopment,
}: {
  globalShortcut: CreateMainWindowDependencies['globalShortcut']
  getMainWindow: () => BrowserWindow | null
  isDevelopment: boolean
}) {
  if (!isDevelopment) {
    return
  }

  globalShortcut.register('Control+Shift+I', () => {
    const webContents: WebContents | undefined = getMainWindow()?.webContents
    if (!webContents) {
      return
    }

    toggleDetachedDevTools(webContents)
  })
}

export function createMainWindow({
  BrowserWindow,
  globalShortcut,
  appIsPackaged,
  envRendererUrl,
  isDevelopment,
  mainDirname,
  platform,
  getIsQuitting,
  setMainWindow,
  getMainWindow,
  hideMainWindowToTray,
  bindWindowStateEvents,
  getCloseBehavior,
  applyWindowTitleBarTheme,
  syncConfiguredGlobalShortcuts,
  clearConfiguredGlobalShortcuts,
}: CreateMainWindowDependencies) {
  const window = new BrowserWindow(
    createMainWindowOptions({
      platform,
      preloadPath: resolvePreloadPath(mainDirname),
      mainDirname,
      appIsPackaged,
    })
  )

  setMainWindow(window)
  bindWindowStateEvents(window)
  registerWindowCloseBehavior({
    window,
    getIsQuitting,
    getCloseBehavior,
    hideMainWindowToTray,
  })
  window.setMenu(null)

  const rendererTarget = resolveRendererLoadTarget({
    appIsPackaged,
    mainDirname,
    rendererUrl: envRendererUrl,
  })

  if (rendererTarget.type === 'url') {
    window.loadURL(rendererTarget.value)
  } else {
    window.loadFile(rendererTarget.value)
  }

  registerDetachedDevToolsShortcut({
    globalShortcut,
    getMainWindow,
    isDevelopment,
  })

  applyWindowTitleBarTheme(window)
  syncConfiguredGlobalShortcuts(window)
  window.on('closed', () => {
    clearConfiguredGlobalShortcuts()
    setMainWindow(null)
  })

  return window
}
