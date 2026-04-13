import electron from 'electron'
import path from 'node:path'
import { getConfig } from '../config/store'
import { CacheService } from '../cache/cache-service'
import { CACHE_IPC_CHANNELS } from '../cache/cache-types'

const { app, dialog, ipcMain } = electron

const cachePathName = 'cache' as Parameters<typeof app.getPath>[0]
const defaultCacheBaseDir = (() => {
  try {
    return app.getPath(cachePathName)
  } catch {
    return app.getPath('sessionData')
  }
})()
const defaultCacheRoot = path.join(defaultCacheBaseDir, 'AuralMusic')
const cacheService = new CacheService({
  defaultRootDir: defaultCacheRoot,
})

export function registerCacheIpc() {
  ipcMain.handle(CACHE_IPC_CHANNELS.GET_DEFAULT_DIRECTORY, () => {
    return cacheService.getDefaultCacheRoot()
  })

  ipcMain.handle(CACHE_IPC_CHANNELS.SELECT_DIRECTORY, async event => {
    const window = electron.BrowserWindow.fromWebContents(event.sender)
    const currentDir = cacheService.resolveCacheRoot(getConfig('diskCacheDir'))
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
      cacheDir: getConfig('diskCacheDir'),
    })
  })

  ipcMain.handle(CACHE_IPC_CHANNELS.CLEAR, async () => {
    await cacheService.clear({
      cacheDir: getConfig('diskCacheDir'),
    })
  })

  ipcMain.handle(
    CACHE_IPC_CHANNELS.RESOLVE_AUDIO_SOURCE,
    async (_event, cacheKey: string, sourceUrl: string) => {
      return cacheService.resolveAudioSource({
        cacheKey,
        sourceUrl,
        enabled: getConfig('diskCacheEnabled'),
        cacheDir: getConfig('diskCacheDir'),
        maxBytes: getConfig('diskCacheMaxBytes'),
      })
    }
  )

  ipcMain.handle(
    CACHE_IPC_CHANNELS.READ_LYRICS_PAYLOAD,
    async (_event, cacheKey: string) => {
      return cacheService.readLyricsPayload({
        cacheKey,
        enabled: getConfig('diskCacheEnabled'),
        cacheDir: getConfig('diskCacheDir'),
      })
    }
  )

  ipcMain.handle(
    CACHE_IPC_CHANNELS.WRITE_LYRICS_PAYLOAD,
    async (_event, cacheKey: string, payload: unknown) => {
      const serializedPayload =
        typeof payload === 'string' ? payload : JSON.stringify(payload ?? null)
      await cacheService.writeLyricsPayload({
        cacheKey,
        payload: serializedPayload,
        enabled: getConfig('diskCacheEnabled'),
        cacheDir: getConfig('diskCacheDir'),
        maxBytes: getConfig('diskCacheMaxBytes'),
      })
    }
  )
}
