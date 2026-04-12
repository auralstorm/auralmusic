import {
  app,
  BrowserWindow,
  globalShortcut,
  nativeTheme,
  session,
} from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getConfig } from './config/store'
import {
  bootstrapAuthSession,
  registerAuthRequestHeaderHook,
} from './auth/store'
import { registerAuthIpc } from './ipc/auth-ipc'
import { registerConfigIpc } from './ipc/config-ipc'
import { registerMusicSourceIpc } from './ipc/music-source-ipc'
import { registerWindowIpc, bindWindowStateEvents } from './ipc/window-ipc'
import { applyMusicApiRuntimeEnv } from './music-api-runtime'
import { startMusicApi } from './server'
import {
  clearConfiguredGlobalShortcuts,
  syncConfiguredGlobalShortcuts,
} from './shortcuts/global-shortcuts'
import {
  applyWindowTitleBarTheme,
  syncNativeThemeSource,
} from './window/titlebar-theme'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

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

function createWindow() {
  const isMac = process.platform === 'darwin'
  const isWindows = process.platform === 'win32'

  mainWindow = new BrowserWindow({
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
  })
  registerAuthIpc()
  registerMusicSourceIpc()
  registerWindowIpc()
  registerPermissionHandlers()

  try {
    const runtimeInfo = await startMusicApi()
    applyMusicApiRuntimeEnv(runtimeInfo)
    registerAuthRequestHeaderHook()
    await bootstrapAuthSession()
    syncNativeThemeSource(getConfig('theme'))
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
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  clearConfiguredGlobalShortcuts()
})
