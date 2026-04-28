import { contextBridge, ipcRenderer } from 'electron'
import { CACHE_IPC_CHANNELS } from '../../shared/ipc/index.ts'
import type {
  CacheStatus,
  ResolveAudioSourceOptions,
  ResolveAudioSourceResult,
  ResolveImageSourceResult,
} from '../../shared/cache.ts'

export type CacheApi = {
  /** 获取默认缓存目录，供设置页展示。 */
  getDefaultDirectory: () => Promise<string>
  /** 打开系统目录选择器选择缓存目录；取消选择时返回 null。 */
  selectDirectory: () => Promise<string | null>
  /** 获取缓存目录、占用空间等状态快照。 */
  getStatus: () => Promise<CacheStatus>
  /** 清空缓存文件，由主进程保证只删除受控缓存目录内的数据。 */
  clear: () => Promise<void>
  /** 解析音频资源，优先复用缓存，必要时由主进程下载并返回可播放地址。 */
  resolveAudioSource: (
    cacheKey: string,
    sourceUrl: string,
    options?: ResolveAudioSourceOptions
  ) => Promise<ResolveAudioSourceResult>
  /** 解析图片资源，返回缓存后的安全可用地址。 */
  resolveImageSource: (
    cacheKey: string,
    sourceUrl: string
  ) => Promise<ResolveImageSourceResult>
  /** 读取已缓存的歌词原始载荷。 */
  readLyricsPayload: (cacheKey: string) => Promise<string | null>
  /** 写入歌词原始载荷，payload 由主进程负责序列化和落盘。 */
  writeLyricsPayload: (cacheKey: string, payload: unknown) => Promise<void>
}

const cacheApi: CacheApi = {
  getDefaultDirectory: async () => {
    return ipcRenderer.invoke(CACHE_IPC_CHANNELS.GET_DEFAULT_DIRECTORY)
  },
  selectDirectory: async () => {
    return ipcRenderer.invoke(CACHE_IPC_CHANNELS.SELECT_DIRECTORY)
  },
  getStatus: async () => {
    return ipcRenderer.invoke(CACHE_IPC_CHANNELS.GET_STATUS)
  },
  clear: async () => {
    return ipcRenderer.invoke(CACHE_IPC_CHANNELS.CLEAR)
  },
  resolveAudioSource: async (cacheKey, sourceUrl, options) => {
    // 音频缓存走主进程是为了统一处理跨域、断点缓存、文件协议和清理策略。
    return ipcRenderer.invoke(
      CACHE_IPC_CHANNELS.RESOLVE_AUDIO_SOURCE,
      cacheKey,
      sourceUrl,
      options
    )
  },
  resolveImageSource: async (cacheKey, sourceUrl) => {
    // 图片同样通过主进程解析，renderer 只消费最终 URL，不关心缓存文件位置。
    return ipcRenderer.invoke(
      CACHE_IPC_CHANNELS.RESOLVE_IMAGE_SOURCE,
      cacheKey,
      sourceUrl
    )
  },
  readLyricsPayload: async cacheKey => {
    return ipcRenderer.invoke(CACHE_IPC_CHANNELS.READ_LYRICS_PAYLOAD, cacheKey)
  },
  writeLyricsPayload: async (cacheKey, payload) => {
    return ipcRenderer.invoke(
      CACHE_IPC_CHANNELS.WRITE_LYRICS_PAYLOAD,
      cacheKey,
      payload
    )
  },
}

export function exposeCacheApi() {
  // 缓存 API 暴露的是资源解析能力，而不是任意文件读写能力。
  contextBridge.exposeInMainWorld('electronCache', cacheApi)
}
