/** 缓存 IPC 通道复导出，主进程缓存类型和通道保持同源。 */
export { CACHE_IPC_CHANNELS } from './ipc/cache.ts'

/** 缓存条目类型，音频/歌词/图片共享同一个索引文件。 */
export type CacheEntryType = 'audio' | 'lyrics' | 'image'

/** 缓存服务运行时配置，来自用户配置或临时调用参数。 */
export type CacheRuntimeConfig = {
  enabled: boolean
  cacheDir: string
  maxBytes: number
}

/** index.json 中记录的单个缓存文件元数据。 */
export type CacheEntryRecord = {
  id: string
  key: string
  type: CacheEntryType
  relativePath: string
  size: number
  createdAt: number
  lastAccessed: number
}

/** 缓存索引文件结构，version 用于后续迁移。 */
export type CacheIndex = {
  version: 1
  entries: CacheEntryRecord[]
}

/** 设置页展示用的缓存状态摘要。 */
export type CacheStatus = {
  usedBytes: number
  audioCount: number
  lyricsCount: number
}

/** 音频资源解析参数，cacheKey 必须稳定，sourceUrl 可变化。 */
export type ResolveAudioSourceParams = CacheRuntimeConfig & {
  cacheKey: string
  sourceUrl: string
}

/** 资源解析结果，fromCache 标记当前 URL 是否来自本地缓存。 */
export type ResolveAudioSourceResult = {
  url: string
  fromCache: boolean
}

/** preload 额外传入的解析选项，force 用于播放临时缓存兜底。 */
export type ResolveAudioSourceOptions = {
  force?: boolean
}

/** 图片资源解析参数，和音频共用缓存容量限制。 */
export type ResolveImageSourceParams = CacheRuntimeConfig & {
  cacheKey: string
  sourceUrl: string
}

/** 图片资源解析结果，图片未命中时可能先返回远端 URL。 */
export type ResolveImageSourceResult = {
  url: string
  fromCache: boolean
}

/** 读取歌词缓存只需要缓存开关、目录和 key。 */
export type ReadLyricsPayloadParams = Pick<
  CacheRuntimeConfig,
  'enabled' | 'cacheDir'
> & {
  cacheKey: string
}

/** 写入歌词缓存时需要容量限制，避免歌词文件长期无限增长。 */
export type WriteLyricsPayloadParams = CacheRuntimeConfig & {
  cacheKey: string
  payload: string
}
