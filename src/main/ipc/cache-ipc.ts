import electron from 'electron'
import path from 'node:path'

import { CacheService } from '../cache/cache-service.ts'
import { PlaybackTempCacheService } from '../cache/playback-temp-cache-service.ts'
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
  appLifecycle?: {
    on: (event: 'before-quit', handler: () => void) => void
  }
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
  playbackTempCacheService?: Pick<
    PlaybackTempCacheService,
    'getDefaultTempRoot' | 'clear' | 'resolveAudioSource'
  >
}

/** 解析默认磁盘缓存根目录，appData 不可用时回退到 sessionData，适配便携/受限环境。 */
function resolveDefaultCacheRoot(
  appGetPath: (name: 'appData' | 'sessionData') => string
) {
  try {
    return path.join(appGetPath('appData'), 'AuralMusic')
  } catch {
    return path.join(appGetPath('sessionData'), 'AuralMusic')
  }
}

/** 创建生产环境磁盘缓存服务，测试环境可通过 options.cacheService 注入替身。 */
function createDefaultCacheService(
  appGetPath: (name: 'appData' | 'sessionData') => string
) {
  return new CacheService({
    defaultRootDir: resolveDefaultCacheRoot(appGetPath),
  })
}

/** 播放临时缓存放在 sessionData 下，退出清理，不受用户磁盘缓存目录配置影响。 */
function resolveDefaultPlaybackTempCacheRoot(
  appGetPath: (name: 'appData' | 'sessionData') => string
) {
  return path.join(appGetPath('sessionData'), 'AuralMusic', 'playback-temp')
}

/** 创建播放临时缓存服务，用于禁用磁盘缓存但播放器仍需要稳定本地资源 URL 的场景。 */
function createDefaultPlaybackTempCacheService(
  appGetPath: (name: 'appData' | 'sessionData') => string
) {
  return new PlaybackTempCacheService({
    defaultRootDir: resolveDefaultPlaybackTempCacheRoot(appGetPath),
  })
}

/**
 * 创建缓存 IPC 注册器。
 *
 * 磁盘缓存和播放临时缓存都涉及文件系统，renderer 只传 cacheKey/sourceUrl；
 * 主进程负责目录解析、容量限制、清理和本地文件 URL 生成。
 */
export function createCacheIpc(options: CacheIpcRegistrationOptions = {}) {
  const ipcMain = options.ipcMain ?? electron.ipcMain
  const dialog = options.dialog ?? electron.dialog
  const appLifecycle =
    options.appLifecycle ?? (!options.cacheService ? electron.app : undefined)
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
  let playbackTempCacheService = options.playbackTempCacheService

  const getPlaybackTempCacheService = () => {
    // 临时缓存懒创建，避免只查询缓存状态时就触发临时目录初始化。
    playbackTempCacheService ??=
      createDefaultPlaybackTempCacheService(appGetPath)
    return playbackTempCacheService
  }

  return {
    register() {
      if (!options.cacheService || options.playbackTempCacheService) {
        const tempCacheService = getPlaybackTempCacheService()
        // 播放临时缓存只服务当前会话，启动和退出都清理，防止长期堆积音频文件。
        void tempCacheService.clear()
        appLifecycle?.on('before-quit', () => {
          void tempCacheService.clear()
        })
      }

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
        // 目录选择器以当前缓存目录为默认路径，减少用户切换目录时的定位成本。
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
          const diskCacheEnabled = getConfigValue('diskCacheEnabled')
          if (forceCache && !diskCacheEnabled) {
            // 播放器强制需要可复用本地地址时，即使磁盘缓存关闭也走会话级临时缓存。
            return getPlaybackTempCacheService().resolveAudioSource({
              cacheKey,
              sourceUrl,
            })
          }

          // 普通资源解析遵守用户磁盘缓存开关和容量上限。
          return cacheService.resolveAudioSource({
            cacheKey,
            sourceUrl,
            enabled: diskCacheEnabled,
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

          // 歌词缓存统一写成字符串，避免不同来源 payload 结构导致索引文件不可预测。
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

/** 注册缓存 IPC 的生产入口。 */
export function registerCacheIpc(options: CacheIpcRegistrationOptions = {}) {
  createCacheIpc(options).register()
}
