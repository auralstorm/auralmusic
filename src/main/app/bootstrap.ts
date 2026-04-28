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
import { registerLoggingIpc } from '../ipc/logging-ipc'
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
import { createMainLogger } from '../logging/logger'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const mainDirname = __dirname
const { app, BrowserWindow, globalShortcut, nativeTheme, session } = electron
const isDevelopment = process.env.NODE_ENV_ELECTRON_VITE === 'development'
const bootstrapLogger = createMainLogger('bootstrap')
const musicApiLogger = createMainLogger('music-api')

/**
 * 启动 Electron 主进程应用。
 *
 * 这里负责串联所有主进程基础设施：应用生命周期、托盘、IPC、协议、权限、内置 Music API、
 * 鉴权恢复、主题同步和窗口创建。初始化顺序很关键，renderer 加载前必须先准备好 preload
 * 会调用到的 IPC handler 和本地协议。
 */
export function bootstrapMainApp() {
  const state = createMainAppState()
  // macOS activate 事件可能在 ready 前触发，启动完成前不允许重复创建窗口。
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

  // 托盘回调只持有函数，不直接依赖窗口实例，窗口重建后仍能拿到最新引用。
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
    // 窗口创建依赖当前配置和运行态，封装成函数便于 lifecycle activate 时复用。
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
    // 更新服务先初始化并订阅，窗口创建后可立即收到最新快照。
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
      registerLoggingIpc,
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
        // 快捷键配置持久化后立即重注册，避免需要重启应用才生效。
        syncConfiguredGlobalShortcuts(state.getMainWindow())
      },
      onAutoStartConfigChange: (enabled: boolean) => {
        // 开机自启属于系统级副作用，跟随配置写入即时同步到 Electron。
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
    // 本地媒体协议必须在 renderer 使用 local-media:// 地址前注册。
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
          // DevTools 扩展只在开发环境加载，生产包不依赖本机 Chrome 扩展路径。
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
            bootstrapLogger.debug('React DevTools extension loaded', {
              targetPath: loadedExtensionPath,
            })
          }
        } catch (error) {
          bootstrapLogger.warn(
            'Failed to load development DevTools extension',
            {
              error,
            }
          )
        }
      }

      const musicApiRuntime = await startMusicApi({
        log: {
          log: (message, meta) => musicApiLogger.info(message, meta),
          error: (message, meta) => musicApiLogger.error(message, meta),
        },
      })
      state.setMusicApiRuntime(musicApiRuntime)
      // 将内置 API 运行时写入 env，供主进程请求封装和 preload runtime API 读取。
      applyMusicApiRuntimeEnv(musicApiRuntime)
      // 鉴权请求头 hook 依赖 Music API 地址，必须在 runtime env 写入之后注册。
      registerAuthRequestHeaderHook()
      await bootstrapAuthSession()
      syncNativeThemeSource(getConfig('theme'))

      const autoStartEnabled = getConfig('autoStartEnabled')
      // 启动时也同步一次开机自启，修正用户在外部修改登录项导致的漂移。
      app.setLoginItemSettings({
        openAtLogin: autoStartEnabled,
        openAsHidden: false,
        path: app.getPath('exe'),
      })

      createWindow()
      updateService.scheduleAutoCheck()
      isStartupReady = true

      nativeTheme.on('updated', () => {
        // Linux titleBarOverlay 颜色不会自动跟随系统主题，需要手动同步。
        const mainWindow = state.getMainWindow()
        if (mainWindow) {
          applyWindowTitleBarTheme(mainWindow)
        }
      })
    } catch (error) {
      bootstrapLogger.error('Failed to bootstrap Music API runtime', { error })
      app.quit()
    }
  })
}
