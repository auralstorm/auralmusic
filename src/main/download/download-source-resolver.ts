import { readMusicApiBaseUrlFromEnv } from '../music-api-runtime.ts'
import { resolveAuthRequestHeaders } from '../auth/request-header.ts'
import type { AuthSession } from '../../shared/auth.ts'
import {
  createSongUrlRequestAttempts,
  normalizeSongUrlV1Response,
} from '../../shared/playback.ts'
import type {
  DownloadRuntimeConfig,
  ResolvedSongDownload,
  SongDownloadPayload,
} from './download-types.ts'
import type { AudioQualityLevel } from '../config/types.ts'

type ResolveDownloadSourceInput = {
  payload: SongDownloadPayload
  quality: AudioQualityLevel
  runtimeConfig: DownloadRuntimeConfig
}

type CreateDownloadSourceResolverOptions = {
  fetcher?: typeof fetch
  getAuthSession?: () => AuthSession | null
  readBaseUrl?: () => string | undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function normalizeSongDownloadUrlResponse(
  payload: unknown
): ResolvedSongDownload | null {
  if (!isRecord(payload)) {
    return null
  }

  const root = isRecord(payload.data) ? payload.data : payload
  const url = typeof root.url === 'string' ? root.url.trim() : ''
  if (!url) {
    return null
  }

  const encodeType =
    typeof root.encodeType === 'string' && root.encodeType.trim()
      ? root.encodeType.trim().toLowerCase()
      : typeof root.type === 'string' && root.type.trim()
        ? root.type.trim().toLowerCase()
        : ''

  return {
    url,
    fileExtension: encodeType ? `.${encodeType.replace(/^\./, '')}` : null,
  }
}

function resolveAuthOrigin(baseURL: string) {
  try {
    return new URL(baseURL).origin
  } catch {
    return undefined
  }
}

function createRequestHeaders(
  requestUrl: string,
  authOrigin: string | undefined,
  authSession: AuthSession | null
) {
  return resolveAuthRequestHeaders({
    authOrigin,
    authSession,
    requestHeaders: {},
    requestUrl,
  })
}

export function createDownloadSourceResolver(
  options: CreateDownloadSourceResolverOptions = {}
) {
  const fetcher = options.fetcher ?? fetch
  const readBaseUrl = options.readBaseUrl ?? readMusicApiBaseUrlFromEnv
  const getAuthSession = options.getAuthSession ?? (() => null)

  return async function resolveDownloadSource({
    payload,
    quality,
    runtimeConfig,
  }: ResolveDownloadSourceInput): Promise<ResolvedSongDownload | null> {
    if (payload.sourceUrl) {
      return {
        url: payload.sourceUrl,
        quality,
      }
    }

    const baseURL = readBaseUrl()
    if (!baseURL) {
      return null
    }

    const authOrigin = resolveAuthOrigin(baseURL)
    const authSession = getAuthSession()

    const officialDownloadUrl = new URL('/song/download/url/v1', `${baseURL}/`)
    officialDownloadUrl.searchParams.set('id', String(payload.songId))
    officialDownloadUrl.searchParams.set('level', quality)

    const officialDownloadResponse = await fetcher(
      officialDownloadUrl.toString(),
      {
        headers: createRequestHeaders(
          officialDownloadUrl.toString(),
          authOrigin,
          authSession
        ),
      }
    )

    if (officialDownloadResponse.ok) {
      const officialDownloadResult = normalizeSongDownloadUrlResponse(
        await officialDownloadResponse.json()
      )
      if (officialDownloadResult?.url) {
        return {
          ...officialDownloadResult,
          quality,
        }
      }
    }

    for (const unblock of createSongUrlRequestAttempts(
      runtimeConfig.musicSourceEnabled
    )) {
      const playbackUrl = new URL('/song/url/v1', `${baseURL}/`)
      playbackUrl.searchParams.set('id', String(payload.songId))
      playbackUrl.searchParams.set('level', quality)
      playbackUrl.searchParams.set('unblock', String(unblock))

      const playbackResponse = await fetcher(playbackUrl.toString(), {
        headers: createRequestHeaders(
          playbackUrl.toString(),
          authOrigin,
          authSession
        ),
      })
      if (!playbackResponse.ok) {
        continue
      }

      const playbackResult = normalizeSongUrlV1Response(
        await playbackResponse.json()
      )
      if (!playbackResult?.url) {
        continue
      }

      return {
        url: playbackResult.url,
        quality,
      }
    }

    return null
  }
}
