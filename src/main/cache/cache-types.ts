export const CACHE_IPC_CHANNELS = {
  GET_DEFAULT_DIRECTORY: 'cache:get-default-directory',
  SELECT_DIRECTORY: 'cache:select-directory',
  GET_STATUS: 'cache:get-status',
  CLEAR: 'cache:clear',
  RESOLVE_AUDIO_SOURCE: 'cache:resolve-audio-source',
  READ_LYRICS_PAYLOAD: 'cache:read-lyrics-payload',
  WRITE_LYRICS_PAYLOAD: 'cache:write-lyrics-payload',
} as const

export type CacheEntryType = 'audio' | 'lyrics'

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
