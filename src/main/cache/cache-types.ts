export { CACHE_IPC_CHANNELS } from '../../shared/ipc/cache.ts'

export type CacheEntryType = 'audio' | 'lyrics' | 'image'

export type CacheRuntimeConfig = {
  enabled: boolean
  cacheDir: string
  maxBytes: number
}

export type CacheEntryRecord = {
  id: string
  key: string
  type: CacheEntryType
  relativePath: string
  size: number
  createdAt: number
  lastAccessed: number
}

export type CacheIndex = {
  version: 1
  entries: CacheEntryRecord[]
}

export type CacheStatus = {
  usedBytes: number
  audioCount: number
  lyricsCount: number
}

export type ResolveAudioSourceParams = CacheRuntimeConfig & {
  cacheKey: string
  sourceUrl: string
}

export type ResolveAudioSourceResult = {
  url: string
  fromCache: boolean
}

export type ResolveAudioSourceOptions = {
  force?: boolean
}

export type ResolveImageSourceParams = CacheRuntimeConfig & {
  cacheKey: string
  sourceUrl: string
}

export type ResolveImageSourceResult = {
  url: string
  fromCache: boolean
}

export type ReadLyricsPayloadParams = Pick<
  CacheRuntimeConfig,
  'enabled' | 'cacheDir'
> & {
  cacheKey: string
}

export type WriteLyricsPayloadParams = CacheRuntimeConfig & {
  cacheKey: string
  payload: string
}
