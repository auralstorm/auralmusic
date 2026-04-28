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

/**
 * 构造主窗口选项。
 *
 * 安全相关设置集中在这里：contextIsolation 开启、nodeIntegration 关闭，只通过 preload 暴露白名单 API。
 * 不同平台的标题栏和图标路径差异也在这里统一处理。
 */
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
    // Windows 使用自绘标题栏，macOS 保留系统隐藏标题栏，其它平台使用 overlay。
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
      // renderer 只能访问 contextBridge 暴露的受控对象，不能直接拿到 Node/Electron。
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
    },
  }
}

/**
 * 解析窗口图标路径。
 *
 * 生产环境图标在 resources/build 下，开发环境从项目 build 目录读取，避免打包前后路径混用。
 */
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

/** 恢复并聚焦主窗口，托盘点击和 macOS activate 都复用这一套行为。 */
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
    // 关闭按钮的行为受用户配置影响：退出、隐藏到托盘或交给 renderer 二次确认。
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

    // 需要确认时只发事件给 renderer，最终是否退出仍由用户交互再触发 quit。
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

  // 开发环境使用分离 DevTools，避免嵌入式 DevTools 挤压播放器布局。
  globalShortcut.register('Control+Shift+I', () => {
    const webContents: WebContents | undefined = getMainWindow()?.webContents
    if (!webContents) {
      return
    }

    toggleDetachedDevTools(webContents)
  })
}

/**
 * 创建并初始化主窗口。
 *
 * 除了 new BrowserWindow，这里还绑定关闭策略、窗口状态广播、renderer 加载、开发快捷键、
 * 主题和全局快捷键，保证窗口重建时这些能力保持一致。
 */
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
    // 开发环境走 dev server，支持热更新。
    window.loadURL(rendererTarget.value)
  } else {
    // 生产环境走本地文件，避免依赖外部服务。
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
