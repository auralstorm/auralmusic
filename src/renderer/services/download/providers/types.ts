import type {
  AppConfig,
  AudioQualityLevel,
} from '../../../../main/config/types.ts'
import type { DownloadSourceProvider } from '../../../../main/download/download-types.ts'
import type {
  ResolveContext,
  ResolverPolicy,
} from '../../../../shared/music-source/types.ts'
import type { resolveTrackWithLxMusicSource } from '../../music-source/lx-playback-resolver.ts'

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
      'activeLuoxueMusicSourceScriptId' | 'luoxueMusicSourceScripts' | 'quality'
    >
  >

export type DownloadTrack = {
  id: number
  name: string
  artistNames: string
  albumName: string
  coverUrl: string
  duration: number
}

export type DownloadResolutionPolicy = 'strict' | 'fallback'

export type ResolvedDownloadSource = {
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

export type DownloadSourceApiListModule = {
  getSongUrlV1: GetSongUrlV1
  getSongDownloadUrlV1: GetSongDownloadUrlV1
}

export type DownloadSourceResolverDeps = {
  getSongUrlV1?: GetSongUrlV1
  getSongDownloadUrlV1?: GetSongDownloadUrlV1
  resolveTrackWithLxMusicSource?: typeof resolveTrackWithLxMusicSource
  getConfig?: () => Promise<DownloadResolverConfig> | DownloadResolverConfig
  getIsAuthenticated?: () => Promise<boolean> | boolean
  loadSongApiListModule?: () => Promise<DownloadSourceApiListModule>
}

export type DownloadSourceProviderOptions = {
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
