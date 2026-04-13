import { contextBridge, ipcRenderer } from 'electron'
import { CACHE_IPC_CHANNELS } from '../../main/cache/cache-types'
import type {
  CacheStatus,
  ResolveAudioSourceResult,
} from '../../main/cache/cache-types'

export type CacheApi = {
  getDefaultDirectory: () => Promise<string>
  selectDirectory: () => Promise<string | null>
  getStatus: () => Promise<CacheStatus>
  clear: () => Promise<void>
  resolveAudioSource: (
    cacheKey: string,
    sourceUrl: string
  ) => Promise<ResolveAudioSourceResult>
  readLyricsPayload: (cacheKey: string) => Promise<string | null>
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
  resolveAudioSource: async (cacheKey, sourceUrl) => {
    return ipcRenderer.invoke(
      CACHE_IPC_CHANNELS.RESOLVE_AUDIO_SOURCE,
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
  contextBridge.exposeInMainWorld('electronCache', cacheApi)
}
