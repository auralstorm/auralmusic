import type {
  AppConfig,
  AudioQualityLevel,
} from '../../../main/config/types.ts'
import { normalizeSongUrlV1Response } from '../../../shared/playback.ts'
import { resolveTrackWithLxMusicSource } from '../music-source/lx-playback-resolver.ts'

export type DownloadResolutionPolicy = 'strict' | 'fallback'

export type ResolvedDownloadSource = {
  url: string
  quality: AudioQualityLevel
  provider: 'official-download' | 'official-playback' | 'lxMusic'
  fileExtension: string | null
}

export type DownloadSourceResolverDeps = {
  getSongUrlV1?: GetSongUrlV1
  getSongDownloadUrlV1?: (params: {
    id: number | string
    level: AudioQualityLevel
  }) => Promise<{ data: unknown }>
  resolveTrackWithLxMusicSource?: typeof resolveTrackWithLxMusicSource
  getConfig?: () => AppConfig
}

type ResolveDownloadSourceOptions = {
  track: {
    id: number
    name: string
    artistNames: string
    albumName: string
    coverUrl: string
    duration: number
  }
  requestedQuality: AudioQualityLevel
  policy: DownloadResolutionPolicy
}

type GetSongUrlV1 = (params: {
  id: number | string
  level: AudioQualityLevel
  unblock: boolean
}) => Promise<{ data: unknown }>

let getSongUrlV1ModulePromise: Promise<
  typeof import('../../api/list.ts')
> | null = null

let configStoreModulePromise: Promise<
  typeof import('../../stores/config-store.ts')
> | null = null

async function getDefaultSongUrlV1(): Promise<GetSongUrlV1> {
  if (!getSongUrlV1ModulePromise) {
    getSongUrlV1ModulePromise = import('../../api/list.ts')
  }

  const module = await getSongUrlV1ModulePromise
  return module.getSongUrlV1 as GetSongUrlV1
}

async function getDefaultConfig(): Promise<AppConfig> {
  if (!configStoreModulePromise) {
    configStoreModulePromise = import('../../stores/config-store.ts')
  }

  const module = await configStoreModulePromise
  return module.useConfigStore.getState().config
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function readOfficialDownloadUrl(payload: unknown) {
  if (!isRecord(payload)) {
    return null
  }

  const root = isRecord(payload.data) ? payload.data : payload
  const nested = isRecord(root.data) ? root.data : root
  const url = typeof nested.url === 'string' ? nested.url.trim() : ''

  return url || null
}

export function createDownloadSourceResolver(
  deps: DownloadSourceResolverDeps = {}
) {
  const getConfig = deps.getConfig ?? getDefaultConfig
  const resolveTrackWithLxMusicSourceFn =
    deps.resolveTrackWithLxMusicSource ?? resolveTrackWithLxMusicSource

  return async function resolveDownloadSource(
    options: ResolveDownloadSourceOptions
  ): Promise<ResolvedDownloadSource | null> {
    const config = await getConfig()
    const level = options.requestedQuality
    const getSongUrl = deps.getSongUrlV1 ?? (await getDefaultSongUrlV1())

    if (deps.getSongDownloadUrlV1) {
      const downloadResponse = await deps.getSongDownloadUrlV1({
        id: options.track.id,
        level,
      })
      const downloadUrl = readOfficialDownloadUrl(downloadResponse.data)

      if (downloadUrl) {
        return {
          url: downloadUrl,
          quality: level,
          provider: 'official-download',
          fileExtension: null,
        }
      }
    }

    const unblockAttempts = config.musicSourceEnabled ? [false, true] : [false]
    for (const unblock of unblockAttempts) {
      const playbackResponse = await getSongUrl({
        id: options.track.id,
        level,
        unblock,
      })
      const playback = normalizeSongUrlV1Response(playbackResponse.data)

      if (playback?.url) {
        return {
          url: playback.url,
          quality: level,
          provider: 'official-playback',
          fileExtension: null,
        }
      }
    }

    if (options.policy === 'strict') {
      return null
    }

    const lxResult = await resolveTrackWithLxMusicSourceFn({
      track: options.track,
      quality: level,
      config,
    })

    if (lxResult?.url) {
      return {
        url: lxResult.url,
        quality: level,
        provider: 'lxMusic',
        fileExtension: null,
      }
    }

    return null
  }
}
