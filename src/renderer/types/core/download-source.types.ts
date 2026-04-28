import type {
  AppConfig,
  AudioQualityLevel,
  EnhancedSourceModule,
} from '../../../shared/config.ts'
import type {
  LxMusicInfo,
  LxSourceKey,
} from '../../../shared/lx-music-source.ts'
import type { DownloadSourceProvider } from '../../../shared/download.ts'
import type {
  ResolveContext,
  ResolverPolicy,
} from '../../../shared/music-source/index.ts'
import type { resolveTrackWithLxMusicSource } from '../../services/music-source/lx-playback-resolver.ts'

export type DownloadSourceMaybePromise<T> = T | Promise<T>

export type DownloadResolverConfig = Pick<
  AppConfig,
  | 'musicSourceEnabled'
  | 'musicSourceProviders'
  | 'luoxueSourceEnabled'
  | 'customMusicApiEnabled'
  | 'customMusicApiUrl'
> &
  Partial<
    Pick<
      AppConfig,
      | 'activeLuoxueMusicSourceScriptId'
      | 'luoxueMusicSourceScripts'
      | 'quality'
      | 'enhancedSourceModules'
    >
  >

export interface DownloadTrack {
  id: number
  name: string
  artistNames: string
  albumName: string
  coverUrl: string
  duration: number
  fee?: number
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
}

export type DownloadResolutionPolicy = 'strict' | 'fallback'

export interface ResolvedDownloadSource {
  url: string
  quality: AudioQualityLevel
  provider: DownloadSourceProvider
  fileExtension: string | null
}

export type GetSongUrlV1 = (params: {
  id: number | string
  level: AudioQualityLevel
  unblock: boolean
}) => Promise<{ data: unknown }>

export type GetSongDownloadUrlV1 = (params: {
  id: number | string
  level: AudioQualityLevel
}) => Promise<{ data: unknown }>

export type GetSongUrlMatch = (params: {
  id: number | string
  source: EnhancedSourceModule
}) => Promise<{ data: unknown }>

export interface DownloadSourceApiListModule {
  getSongUrlV1: GetSongUrlV1
  getSongDownloadUrlV1: GetSongDownloadUrlV1
  getSongUrlMatch: GetSongUrlMatch
}

export interface DownloadSourceResolverDeps {
  getSongUrlV1?: GetSongUrlV1
  getSongDownloadUrlV1?: GetSongDownloadUrlV1
  getSongUrlMatch?: GetSongUrlMatch
  resolveTrackWithLxMusicSource?: typeof resolveTrackWithLxMusicSource
  getConfig?: () => DownloadSourceMaybePromise<DownloadResolverConfig>
  getAuthState?: () => DownloadSourceMaybePromise<{
    isAuthenticated: boolean
    isVip: boolean
  }>
  loadSongApiListModule?: () => Promise<DownloadSourceApiListModule>
}

export interface DownloadSourceProviderOptions {
  track: DownloadTrack
  quality: AudioQualityLevel
  context: ResolveContext
  policy: ResolverPolicy
  config: DownloadResolverConfig
  deps: DownloadSourceResolverDeps
}

export interface DownloadResolverProvider {
  resolve: (
    options: DownloadSourceProviderOptions
  ) => Promise<ResolvedDownloadSource | null>
}

export interface ResolveDownloadSourceOptions {
  track: DownloadTrack
  requestedQuality: AudioQualityLevel
  policy: DownloadResolutionPolicy
}
