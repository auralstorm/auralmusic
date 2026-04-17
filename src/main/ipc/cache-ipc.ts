import electron from 'electron'
import path from 'node:path'

import { CacheService } from '../cache/cache-service.ts'
import {
  CACHE_IPC_CHANNELS,
  type ResolveAudioSourceOptions,
} from '../cache/cache-types.ts'
import { getConfig } from '../config/store.ts'
import type { AppConfig } from '../config/types.ts'

type CacheIpcRegistrationOptions = {
  ipcMain?: {
    handle: (
      channel: string,
      handler: (...args: unknown[]) => unknown | Promise<unknown>
    ) => void
  }
  dialog?: {
    showOpenDialog: (
      window: unknown,
      options: {
        title: string
        defaultPath: string
        properties: string[]
      }
    ) => Promise<{
      canceled: boolean
      filePaths: string[]
    }>
  }
  browserWindowFromWebContents?: (webContents: unknown) => unknown
  appGetPath?: (name: 'appData' | 'sessionData') => string
  getConfigValue?: <K extends keyof AppConfig>(key: K) => AppConfig[K]
  cacheService?: Pick<
    CacheService,
    | 'getDefaultCacheRoot'
    | 'resolveCacheRoot'
    | 'getStatus'
    | 'clear'
    | 'resolveAudioSource'
    | 'resolveImageSource'
    | 'readLyricsPayload'
    | 'writeLyricsPayload'
  >
}

function resolveDefaultCacheRoot(
  appGetPath: (name: 'appData' | 'sessionData') => string
) {
  try {
    return path.join(appGetPath('appData'), 'AuralMusic')
  } catch {
    return path.join(appGetPath('sessionData'), 'AuralMusic')
  }
}

function createDefaultCacheService(
  appGetPath: (name: 'appData' | 'sessionData') => string
) {
  return new CacheService({
    defaultRootDir: resolveDefaultCacheRoot(appGetPath),
  })
}

export function createCacheIpc(options: CacheIpcRegistrationOptions = {}) {
  const ipcMain = options.ipcMain ?? electron.ipcMain
  const dialog = options.dialog ?? electron.dialog
  const browserWindowFromWebContents =
    options.browserWindowFromWebContents ??
    ((webContents: unknown) =>
      electron.BrowserWindow.fromWebContents(
        webContents as Electron.WebContents
      ))
  const appGetPath =
    options.appGetPath ??
    ((name: 'appData' | 'sessionData') => electron.app.getPath(name))
  const getConfigValue = options.getConfigValue ?? getConfig
  const cacheService =
    options.cacheService ?? createDefaultCacheService(appGetPath)

  return {
    register() {
      ipcMain.handle(CACHE_IPC_CHANNELS.GET_DEFAULT_DIRECTORY, () => {
        return cacheService.getDefaultCacheRoot()
      })

      ipcMain.handle(CACHE_IPC_CHANNELS.SELECT_DIRECTORY, async event => {
        const window = browserWindowFromWebContents(
          (event as { sender: unknown }).sender
        )
        const currentDir = cacheService.resolveCacheRoot(
          getConfigValue('diskCacheDir')
        )
        const result = await dialog.showOpenDialog(window, {
          title: 'Select Cache Directory',
          defaultPath: currentDir,
          properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
        })

        if (result.canceled || result.filePaths.length === 0) {
          return null
        }

        return result.filePaths[0] ?? null
      })

      ipcMain.handle(CACHE_IPC_CHANNELS.GET_STATUS, async () => {
        return cacheService.getStatus({
          cacheDir: getConfigValue('diskCacheDir'),
        })
      })

      ipcMain.handle(CACHE_IPC_CHANNELS.CLEAR, async () => {
        await cacheService.clear({
          cacheDir: getConfigValue('diskCacheDir'),
        })
      })

      ipcMain.handle(
        CACHE_IPC_CHANNELS.RESOLVE_AUDIO_SOURCE,
        async (
          _event,
          cacheKey: string,
          sourceUrl: string,
          options?: ResolveAudioSourceOptions
        ) => {
          const forceCache = options?.force === true
          return cacheService.resolveAudioSource({
            cacheKey,
            sourceUrl,
            enabled: forceCache || getConfigValue('diskCacheEnabled'),
            cacheDir: getConfigValue('diskCacheDir'),
            maxBytes: getConfigValue('diskCacheMaxBytes'),
          })
        }
      )

      ipcMain.handle(
        CACHE_IPC_CHANNELS.RESOLVE_IMAGE_SOURCE,
        async (_event, cacheKey: string, sourceUrl: string) => {
          return cacheService.resolveImageSource({
            cacheKey,
            sourceUrl,
            enabled: getConfigValue('diskCacheEnabled'),
            cacheDir: getConfigValue('diskCacheDir'),
            maxBytes: getConfigValue('diskCacheMaxBytes'),
          })
        }
      )

      ipcMain.handle(
        CACHE_IPC_CHANNELS.READ_LYRICS_PAYLOAD,
        async (_event, cacheKey: string) => {
          return cacheService.readLyricsPayload({
            cacheKey,
            enabled: getConfigValue('diskCacheEnabled'),
            cacheDir: getConfigValue('diskCacheDir'),
          })
        }
      )

      ipcMain.handle(
        CACHE_IPC_CHANNELS.WRITE_LYRICS_PAYLOAD,
        async (_event, cacheKey: string, payload: unknown) => {
          const serializedPayload =
            typeof payload === 'string'
              ? payload
              : JSON.stringify(payload ?? null)

          await cacheService.writeLyricsPayload({
            cacheKey,
            payload: serializedPayload,
            enabled: getConfigValue('diskCacheEnabled'),
            cacheDir: getConfigValue('diskCacheDir'),
            maxBytes: getConfigValue('diskCacheMaxBytes'),
          })
        }
      )
    },
  }
}

export function registerCacheIpc(options: CacheIpcRegistrationOptions = {}) {
  createCacheIpc(options).register()
}
