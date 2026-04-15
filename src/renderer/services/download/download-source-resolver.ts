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
  loadSongApiListModule?: () => Promise<DownloadSourceApiListModule>
}

type DownloadSourceApiListModule = {
  getSongUrlV1: GetSongUrlV1
  getSongDownloadUrlV1: GetSongDownloadUrlV1
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

let configStoreModulePromise: Promise<
  typeof import('../../stores/config-store.ts')
> | null = null

let apiListModulePromise: Promise<DownloadSourceApiListModule> | null = null

async function loadDefaultSongApiListModule(): Promise<DownloadSourceApiListModule> {
  if (!apiListModulePromise) {
    apiListModulePromise = import('../../api/list.ts')
  }

  return apiListModulePromise
}

async function getDefaultSongUrlV1(
  loadSongApiListModule: () => Promise<DownloadSourceApiListModule> = loadDefaultSongApiListModule
) {
  const module = await loadSongApiListModule()
  return module.getSongUrlV1
}

async function getDefaultSongDownloadUrlV1(
  loadSongApiListModule: () => Promise<DownloadSourceApiListModule> = loadDefaultSongApiListModule
) {
  const module = await loadSongApiListModule()
  return module.getSongDownloadUrlV1
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

  if (normalized.includes('aac')) {
    return '.aac'
  }

  if (normalized.includes('m4a')) {
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
  const loadSongApiListModule =
    deps.loadSongApiListModule ?? loadDefaultSongApiListModule

  return async function resolveDownloadSource(
    options: ResolveDownloadSourceOptions
  ): Promise<ResolvedDownloadSource | null> {
    const config = await getConfig()
    const level = options.requestedQuality
    const getSongUrl =
      deps.getSongUrlV1 ?? (await getDefaultSongUrlV1(loadSongApiListModule))
    const getSongDownloadUrl =
      deps.getSongDownloadUrlV1 ??
      (await getDefaultSongDownloadUrlV1(loadSongApiListModule))

    if (options.policy !== 'strict' && options.policy !== 'fallback') {
      return null
    }

    try {
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
    } catch {
      // Fall through to playback and LX resolution.
    }

    const unblockAttempts = config.musicSourceEnabled ? [false, true] : [false]
    for (const unblock of unblockAttempts) {
      try {
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
      } catch {
        // Fall through to the next unblock attempt or LX resolution.
      }
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
