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

type GetSongDownloadUrlV1 = (params: {
  id: number | string
  level: AudioQualityLevel
}) => Promise<{ data: unknown }>

let getSongUrlV1ModulePromise: Promise<
  typeof import('../../api/list.ts')
> | null = null

let getSongDownloadUrlV1ModulePromise: Promise<
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

async function getDefaultSongDownloadUrlV1(): Promise<GetSongDownloadUrlV1> {
  if (!getSongDownloadUrlV1ModulePromise) {
    getSongDownloadUrlV1ModulePromise = import('../../api/list.ts')
  }

  const module = await getSongDownloadUrlV1ModulePromise
  return module.getSongDownloadUrlV1 as GetSongDownloadUrlV1
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

function normalizeFileExtension(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase().replace(/^\./, '')
  if (!normalized) {
    return null
  }

  if (normalized.includes('flac')) {
    return '.flac'
  }

  if (normalized.includes('mp3')) {
    return '.mp3'
  }

  if (normalized.includes('m4a') || normalized.includes('aac')) {
    return '.m4a'
  }

  if (normalized.includes('ogg')) {
    return '.ogg'
  }

  if (normalized.includes('wav')) {
    return '.wav'
  }

  return `.${normalized}`
}

function inferFileExtensionFromUrl(sourceUrl: string) {
  try {
    const pathname = new URL(sourceUrl).pathname
    const match = pathname.match(/\.([a-z0-9]+)$/i)
    return match ? `.${match[1].toLowerCase()}` : null
  } catch {
    const match = sourceUrl.match(/\.([a-z0-9]+)(?:$|[?#])/i)
    return match ? `.${match[1].toLowerCase()}` : null
  }
}

function readOfficialDownloadUrl(payload: unknown) {
  if (!isRecord(payload)) {
    return null
  }

  const root = isRecord(payload.data) ? payload.data : payload
  const nested = isRecord(root.data) ? root.data : root
  const url = typeof nested.url === 'string' ? nested.url.trim() : ''

  if (!url) {
    return null
  }

  const extension =
    normalizeFileExtension(
      typeof nested.encodeType === 'string'
        ? nested.encodeType
        : typeof nested.type === 'string'
          ? nested.type
          : null
    ) || inferFileExtensionFromUrl(url)

  return {
    url,
    fileExtension: extension,
  }
}

export function createDownloadSourceResolver(
  deps: DownloadSourceResolverDeps = {}
) {
  const getConfig = deps.getConfig ?? getDefaultConfig
  const resolveTrackWithLxMusicSourceFn =
    deps.resolveTrackWithLxMusicSource ?? resolveTrackWithLxMusicSource
  const getSongDownloadUrl =
    deps.getSongDownloadUrlV1 ?? getDefaultSongDownloadUrlV1

  return async function resolveDownloadSource(
    options: ResolveDownloadSourceOptions
  ): Promise<ResolvedDownloadSource | null> {
    const config = await getConfig()
    const level = options.requestedQuality
    const getSongUrl = deps.getSongUrlV1 ?? (await getDefaultSongUrlV1())

    const downloadResponse = await getSongDownloadUrl({
      id: options.track.id,
      level,
    })
    const officialDownload = readOfficialDownloadUrl(downloadResponse.data)

    if (officialDownload) {
      return {
        url: officialDownload.url,
        quality: level,
        provider: 'official-download',
        fileExtension: officialDownload.fileExtension,
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
          fileExtension: inferFileExtensionFromUrl(playback.url),
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
        fileExtension: inferFileExtensionFromUrl(lxResult.url),
      }
    }

    return null
  }
}
