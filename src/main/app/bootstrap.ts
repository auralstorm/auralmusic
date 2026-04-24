import electron from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  bootstrapAuthSession,
  registerAuthRequestHeaderHook,
} from '../auth/store'
import { getConfig } from '../config/store'
import { registerAuthIpc } from '../ipc/auth-ipc'
import { registerCacheIpc } from '../ipc/cache-ipc'
import { registerConfigIpc } from '../ipc/config-ipc'
import { registerDownloadIpc } from '../ipc/download-ipc'
import { registerLocalLibraryIpc } from '../ipc/local-library-ipc'
import { createRegisterMainIpc } from '../ipc/register-main-ipc'
import { registerMusicSourceIpc } from '../ipc/music-source-ipc'
import { registerShortcutIpc } from '../ipc/shortcut-ipc'
import { registerSystemFontsIpc } from '../ipc/system-fonts-ipc'
import { registerTrayIpc } from '../ipc/tray-ipc'
import { registerUpdateIpc } from '../ipc/update-ipc'
import { bindWindowStateEvents, registerWindowIpc } from '../ipc/window-ipc'
import { applyMusicApiRuntimeEnv } from '../music-api-runtime'
import { registerLocalMediaProtocol } from '../protocol/local-media'
import { startMusicApi } from '../server'
import {
  clearConfiguredGlobalShortcuts,
  syncConfiguredGlobalShortcuts,
} from '../shortcuts/global-shortcuts'
import { createTrayController } from '../tray/tray-controller'
import { createMainWindow, showMainWindow } from '../window/main-window'
import { registerWindowPermissionHandlers } from '../window/permission'
import {
  applyWindowTitleBarTheme,
  syncNativeThemeSource,
} from '../window/titlebar-theme'
import {
  TRAY_IPC_CHANNELS,
  UPDATE_IPC_CHANNELS,
} from '../../shared/ipc/index.ts'
import { createMainAppState } from './app-state'
import { loadDevelopmentDevToolsExtension } from './devtools-extension'
import { registerMainAppLifecycle } from './lifecycle'
import { createUpdateService } from '../updater/update-service'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const mainDirname = __dirname
const { app, BrowserWindow, globalShortcut, nativeTheme, session } = electron
const isDevelopment = process.env.NODE_ENV_ELECTRON_VITE === 'development'

export function bootstrapMainApp() {
  const state = createMainAppState()
  let isStartupReady = false
  const updateService = createUpdateService({
    platform: process.platform,
    currentVersion: app.getVersion(),
    owner: 'auralstorm',
    repo: 'auralmusic',
    enabled: app.isPackaged,
  })

  const hideMainWindowToTray = () => {
    state.getMainWindow()?.hide()
  }

  const trayController = createTrayController({
    showMainWindow: () => {
      showMainWindow(state.getMainWindow())
    },
    quitApp: () => {
      state.setIsQuitting(true)
      app.quit()
    },
    sendCommand: command => {
      state
        .getMainWindow()
        ?.webContents.send(TRAY_IPC_CHANNELS.COMMAND, command)
    },
  })

  const createWindow = () => {
    return createMainWindow({
      BrowserWindow,
      globalShortcut,
      appIsPackaged: app.isPackaged,
      envRendererUrl: process.env.ELECTRON_RENDERER_URL,
      isDevelopment,
      mainDirname,
      platform: process.platform,
      getIsQuitting: state.getIsQuitting,
      setMainWindow: state.setMainWindow,
      getMainWindow: state.getMainWindow,
      hideMainWindowToTray,
      bindWindowStateEvents,
      getCloseBehavior: () => getConfig('closeBehavior'),
      applyWindowTitleBarTheme,
      syncConfiguredGlobalShortcuts,
      clearConfiguredGlobalShortcuts,
    })
  }

  registerMainAppLifecycle({
    app,
    platform: process.platform,
    getMainWindow: state.getMainWindow,
    getWindowCount: () => BrowserWindow.getAllWindows().length,
    showMainWindow: () => showMainWindow(state.getMainWindow()),
    createWindow,
    canCreateWindowOnActivate: () => isStartupReady,
    shouldQuitOnWindowAllClosed: () => {
      return state.getIsQuitting() || getConfig('closeBehavior') === 'quit'
    },
    setIsQuitting: state.setIsQuitting,
    disposeMusicApiRuntime: () => {
      state.getMusicApiRuntime()?.dispose()
      state.clearMusicApiRuntime()
    },
    destroyTray: () => {
      trayController.destroy()
    },
    clearConfiguredGlobalShortcuts,
  })

  app.whenReady().then(async () => {
    updateService.initialize()
    updateService.subscribe(snapshot => {
      state
        .getMainWindow()
        ?.webContents.send(UPDATE_IPC_CHANNELS.STATE_CHANGED, snapshot)
    })

    const registerRuntimeMainIpc = createRegisterMainIpc({
      registerAuthIpc,
      registerCacheIpc,
      registerConfigIpc,
      registerDownloadIpc,
      registerLocalLibraryIpc,
      registerMusicSourceIpc,
      registerShortcutIpc,
      registerSystemFontsIpc,
      registerTrayIpc,
      registerUpdateIpc: () => {
        registerUpdateIpc(updateService)
      },
      registerWindowIpc,
    })

    registerRuntimeMainIpc({
      onShortcutConfigChange: () => {
        syncConfiguredGlobalShortcuts(state.getMainWindow())
      },
      onAutoStartConfigChange: (enabled: boolean) => {
        app.setLoginItemSettings({
          openAtLogin: enabled,
          openAsHidden: false,
          path: app.getPath('exe'),
        })
      },
      trayController,
      onQuitRequested: () => {
        state.setIsQuitting(true)
      },
    })
    registerLocalMediaProtocol()
    registerWindowPermissionHandlers({
      session,
      isAllowedWebContents: webContents =>
        webContents === state.getMainWindow()?.webContents,
    })
    trayController.initialize()

    try {
      if (isDevelopment) {
        try {
          const loadExtension =
            session.defaultSession.extensions?.loadExtension?.bind(
              session.defaultSession.extensions
            ) ??
            session.defaultSession.loadExtension.bind(session.defaultSession)

          const loadedExtensionPath = await loadDevelopmentDevToolsExtension({
            appIsPackaged: app.isPackaged,
            loadExtension,
          })

          if (loadedExtensionPath) {
            console.log(
              `[devtools] loaded React DevTools extension from ${loadedExtensionPath}`
            )
          }
        } catch (error) {
          console.warn('Failed to load development DevTools extension:', error)
        }
      }

      const musicApiRuntime = await startMusicApi()
      state.setMusicApiRuntime(musicApiRuntime)
      applyMusicApiRuntimeEnv(musicApiRuntime)
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
      updateService.scheduleAutoCheck()
      isStartupReady = true

      nativeTheme.on('updated', () => {
        const mainWindow = state.getMainWindow()
        if (mainWindow) {
          applyWindowTitleBarTheme(mainWindow)
        }
      })
    } catch (error) {
      console.error('Failed to bootstrap Music API runtime:', error)
      app.quit()
    }
  })
}
