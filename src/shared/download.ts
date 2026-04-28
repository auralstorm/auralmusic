import type {
  AudioQualityLevel,
  DownloadFileNamePattern,
  DownloadQualityPolicy,
  MusicSourceProvider,
} from './config.ts'
import type { LxMusicInfo, LxSourceKey } from './lx-music-source.ts'

/** 下载 IPC 通道复导出，下载服务和 renderer store 共享同一契约。 */
export { DOWNLOAD_IPC_CHANNELS } from './ipc/download.ts'

/** 下载质量降级链，从高到低排列，fallback 策略按该顺序向后尝试。 */
export const DOWNLOAD_QUALITY_FALLBACK_CHAIN = [
  'jymaster',
  'dolby',
  'sky',
  'jyeffect',
  'hires',
  'lossless',
  'exhigh',
  'higher',
  'standard',
] as const satisfies readonly AudioQualityLevel[]

/** 下载源提供方标识，用于记录最终直链来自官方、解灰、LX 或自定义 API。 */
export type DownloadSourceProvider =
  | 'official-download'
  | 'official-playback'
  | 'builtin-unblock'
  | 'lxMusic'
  | 'custom-api'

export type DownloadTaskStatus =
  | 'queued'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'skipped'

/** 下载文件可写入标签或旁路歌词的补充元数据。 */
export type DownloadTaskMetadata = {
  albumName?: string
  coverUrl?: string
  lyric?: string
  translatedLyric?: string
  durationMs?: number
}

/** 创建下载任务时 renderer 传给主进程的业务载荷。 */
export type SongDownloadPayload = {
  songId: number | string
  songName: string
  artistName: string
  fee?: number
  coverUrl?: string
  albumName?: string
  durationMs?: number
  directory?: string
  fileName?: string
  requestedQuality: AudioQualityLevel
  downloadQualityPolicy?: DownloadQualityPolicy
  sourceUrl?: string
  resolvedQuality?: AudioQualityLevel | null
  sourceProvider?: DownloadSourceProvider
  fileExtension?: string | null
  lockedPlatform?: LxSourceKey
  lxInfo?: Partial<
    Pick<
      LxMusicInfo,
      | 'songmid'
      | 'hash'
      | 'strMediaMid'
      | 'copyrightId'
      | 'albumId'
      | 'source'
      | 'img'
    >
  >
  metadata?: DownloadTaskMetadata
}

/** 下载任务快照，主进程持久化后广播给 renderer。 */
export type DownloadTask = {
  id: string
  songId: number | string
  songName: string
  artistName: string
  coverUrl: string
  albumName: string | null
  requestedQuality: AudioQualityLevel
  resolvedQuality: AudioQualityLevel | null
  status: DownloadTaskStatus
  progress: number
  errorMessage: string | null
  targetPath: string
  fileSizeBytes: number | null
  durationMs: number
  lyricText: string
  translatedLyricText: string
  note: string | null
  warningMessage: string | null
  createdAt: number
  updatedAt: number
  completedAt: number | null
}

/** 解析指定任务/音质直链时传入解析器的上下文。 */
export type ResolveSongUrlInput = {
  taskId: string
  payload: SongDownloadPayload
  quality: AudioQualityLevel
  songId: number | string
}

/** 音源解析器返回的下载直链结果。 */
export type ResolvedSongDownload = {
  url: string
  quality?: AudioQualityLevel
  fileExtension?: string | null
}

/** 下载服务运行时配置，每次任务执行前从配置 store 读取最新值。 */
export type DownloadRuntimeConfig = {
  musicSourceEnabled: boolean
  musicSourceProviders?: MusicSourceProvider[]
  luoxueSourceEnabled?: boolean
  customMusicApiEnabled?: boolean
  customMusicApiUrl?: string
  downloadDir: string
  downloadQuality: AudioQualityLevel
  downloadQualityPolicy: DownloadQualityPolicy
  downloadSkipExisting: boolean
  downloadConcurrency: number
  downloadFileNamePattern: DownloadFileNamePattern
  downloadEmbedCover: boolean
  downloadEmbedLyrics: boolean
  downloadEmbedTranslatedLyrics: boolean
}

/** 根据请求音质生成降级尝试链，非法音质回退 standard。 */
export function createDownloadQualityFallbackChain(
  requestedQuality: AudioQualityLevel
) {
  const startIndex = DOWNLOAD_QUALITY_FALLBACK_CHAIN.indexOf(requestedQuality)

  if (startIndex < 0) {
    return ['standard'] as AudioQualityLevel[]
  }

  return DOWNLOAD_QUALITY_FALLBACK_CHAIN.slice(
    startIndex
  ) as AudioQualityLevel[]
}
