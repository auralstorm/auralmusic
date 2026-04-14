import electron, { type BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getConfig } from './config/store'
import {
  bootstrapAuthSession,
  registerAuthRequestHeaderHook,
} from './auth/store'
import { registerAuthIpc } from './ipc/auth-ipc'
import { registerCacheIpc } from './ipc/cache-ipc'
import { registerConfigIpc } from './ipc/config-ipc'
import { registerDownloadIpc } from './ipc/download-ipc'
import { registerMusicSourceIpc } from './ipc/music-source-ipc'
import { registerWindowIpc, bindWindowStateEvents } from './ipc/window-ipc'
import { applyMusicApiRuntimeEnv } from './music-api-runtime'
import {
  registerLocalMediaProtocol,
  registerLocalMediaScheme,
} from './protocol/local-media'
import { startMusicApi } from './server'
import {
  clearConfiguredGlobalShortcuts,
  syncConfiguredGlobalShortcuts,
} from './shortcuts/global-shortcuts'
import {
  applyWindowTitleBarTheme,
  syncNativeThemeSource,
} from './window/titlebar-theme'
import { resolveWindowCloseBehavior } from './window/close-behavior'
import { WINDOW_IPC_CHANNELS } from './window/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const { app, globalShortcut, Menu, nativeImage, nativeTheme, session, Tray } =
  electron

registerLocalMediaScheme()

let mainWindow: BrowserWindow | null = null
let tray: InstanceType<typeof Tray> | null = null
let isQuitting = false

type AudioPermissionDetails = {
  mediaType?: string
  mediaTypes?: string[]
}

function registerPermissionHandlers() {
  const isMainWindowRequest = (webContents: Electron.WebContents) => {
    return webContents === mainWindow?.webContents
  }

  const isAllowedAudioPermission = (
    permission: string,
    details?: AudioPermissionDetails
  ) => {
    if (permission === 'speaker-selection') {
      return true
    }

    if (permission !== 'media') {
      return false
    }

    const mediaTypes = details?.mediaTypes || []
    const mediaType = details?.mediaType
    if (!mediaTypes.length && mediaType) {
      return mediaType === 'audio'
    }

    return mediaTypes.includes('audio') && !mediaTypes.includes('video')
  }

  session.defaultSession.setPermissionCheckHandler(
    (webContents, permission, _requestingOrigin, details) => {
      const permissionName = String(permission)

      return (
        isMainWindowRequest(webContents) &&
        (permissionName === 'local-fonts' ||
          isAllowedAudioPermission(
            permissionName,
            details as AudioPermissionDetails
          ))
      )
    }
  )

  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      const permissionName = String(permission)

      callback(
        isMainWindowRequest(webContents) &&
          (permissionName === 'local-fonts' ||
            isAllowedAudioPermission(
              permissionName,
              details as AudioPermissionDetails
            ))
      )
    }
  )
}

function getRendererUrl() {
  if (app.isPackaged) {
    return path.join(__dirname, '../renderer/index.html')
  }

  return process.env.ELECTRON_RENDERER_URL!
}

function getPreloadPath() {
  return path.join(__dirname, '../preload/index.js')
}

function getTrayIcon() {
  const iconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="16" fill="#111111"/>
      <path d="M18 36c3.5-7 7.5-11 14-11s10.5 4 14 11" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
      <circle cx="24" cy="40" r="4" fill="#ffffff"/>
      <circle cx="32" cy="27" r="4" fill="#ffffff"/>
      <circle cx="40" cy="40" r="4" fill="#ffffff"/>
    </svg>
  `

  const image = nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString('base64')}`
  )

  if (process.platform === 'darwin') {
    image.setTemplateImage(true)
  }

  return image
}

function showMainWindow() {
  if (!mainWindow) {
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.show()
  mainWindow.focus()
}

function hideMainWindowToTray() {
  mainWindow?.hide()
}

function createTray(): InstanceType<typeof Tray> {
  if (tray) {
    return tray
  }

  tray = new Tray(getTrayIcon())
  tray.setToolTip('AuralMusic')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          showMainWindow()
        },
      },
      {
        label: '最小化到托盘',
        click: () => {
          hideMainWindowToTray()
        },
      },
      { type: 'separator' },
      {
        label: '退出应用',
        click: () => {
          isQuitting = true
          app.quit()
        },
      },
    ])
  )

  tray.on('click', () => {
    if (!mainWindow) {
      return
    }

    if (mainWindow.isVisible()) {
      mainWindow.focus()
      return
    }

    showMainWindow()
  })

  tray.on('double-click', () => {
    showMainWindow()
  })

  return tray
}

function registerWindowCloseBehavior(window: BrowserWindow) {
  window.on('close', event => {
    const nextBehavior = resolveWindowCloseBehavior({
      isQuitting,
      closeBehavior: getConfig('closeBehavior'),
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

function createWindow() {
  const isMac = process.platform === 'darwin'
  const isWindows = process.platform === 'win32'

  mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 1280,
    minHeight: 760,
    frame: !isWindows,
    titleBarStyle: isMac ? 'hiddenInset' : isWindows ? undefined : 'hidden',
    titleBarOverlay: isMac ? false : isWindows ? false : true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      enableBlinkFeatures: 'LocalFontAccess',
      nodeIntegration: false,
    },
  })

  bindWindowStateEvents(mainWindow)
  registerWindowCloseBehavior(mainWindow)
  mainWindow.setMenu(null)

  const rendererUrl = getRendererUrl()
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(rendererUrl)
  } else {
    mainWindow.loadFile(rendererUrl)
  }

  if (process.env.NODE_ENV_ELECTRON_VITE === 'development') {
    globalShortcut.register('Control+Shift+I', () => {
      mainWindow?.webContents.toggleDevTools()
    })
  }

  if (mainWindow) {
    applyWindowTitleBarTheme(mainWindow)
    syncConfiguredGlobalShortcuts(mainWindow)
    mainWindow.on('closed', () => {
      clearConfiguredGlobalShortcuts()
      mainWindow = null
    })
  }
}

app.whenReady().then(async () => {
  registerConfigIpc({
    onShortcutConfigChange: () => {
      syncConfiguredGlobalShortcuts(mainWindow)
    },
    onAutoStartConfigChange: (enabled: boolean) => {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: false,
        path: app.getPath('exe'),
      })
    },
  })
  registerAuthIpc()
  registerCacheIpc()
  registerDownloadIpc()
  registerMusicSourceIpc()
  registerWindowIpc({
    onQuitRequested: () => {
      isQuitting = true
    },
  })
  registerLocalMediaProtocol()
  registerPermissionHandlers()
  createTray()

  try {
    const runtimeInfo = await startMusicApi()
    applyMusicApiRuntimeEnv(runtimeInfo)
    registerAuthRequestHeaderHook()
    await bootstrapAuthSession()
    syncNativeThemeSource(getConfig('theme'))

    const autoStartEnabled = getConfig('autoStartEnabled')
    app.setLoginItemSettings({
      openAtLogin: autoStartEnabled,
      openAsHidden: false,
      path: app.getPath('exe'),
    })

    createWindow()

    nativeTheme.on('updated', () => {
      if (mainWindow) {
        applyWindowTitleBarTheme(mainWindow)
      }
    })
  } catch (error) {
    console.error('Failed to bootstrap Music API runtime:', error)
    app.quit()
    return
  }

  app.on('activate', () => {
    if (mainWindow) {
      showMainWindow()
      return
    }

    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  tray?.destroy()
  tray = null
})

app.on('will-quit', () => {
  clearConfiguredGlobalShortcuts()
})
