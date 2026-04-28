import { readMusicApiBaseUrlFromEnv } from '../music-api-runtime.ts'
import {
  normalizeRequestHeadersForFetch,
  resolveAuthRequestHeaders,
} from '../auth/request-header.ts'
import type { AuthSession } from '../../shared/auth.ts'
import {
  buildResolverPolicy,
  isAuthenticatedForMusicResolution,
  type ResolveContext,
} from '../../shared/music-source/index.ts'
import { normalizeSongUrlV1Response } from '../../shared/playback.ts'
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

/** 兼容 /song/download/url/v1 可能返回 data 包裹或平铺结构。 */
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

/** 从 Music API baseURL 中解析鉴权同源地址，非法 URL 时不注入 Cookie。 */
function resolveAuthOrigin(baseURL: string) {
  try {
    return new URL(baseURL).origin
  } catch {
    return undefined
  }
}

/** 为下载解析请求补充鉴权 header，VIP/付费资源解析依赖登录态。 */
function createRequestHeaders(
  requestUrl: string,
  authOrigin: string | undefined,
  authSession: AuthSession | null
) {
  return normalizeRequestHeadersForFetch(
    resolveAuthRequestHeaders({
      authOrigin,
      authSession,
      requestHeaders: {},
      requestUrl,
    })
  )
}

/** 构建下载场景的音源解析上下文，供 shared resolver policy 决定解析顺序。 */
function buildResolveContext(
  runtimeConfig: DownloadRuntimeConfig,
  authSession: AuthSession | null,
  trackFee: number,
  lockedPlatform: ResolveContext['lockedPlatform']
): ResolveContext {
  return {
    scene: 'download',
    isAuthenticated: isAuthenticatedForMusicResolution({
      userId: authSession?.userId ?? null,
      cookie: authSession?.cookie ?? null,
    }),
    isVip: authSession?.isVip === true,
    trackFee,
    lockedPlatform,
    config: {
      musicSourceEnabled: runtimeConfig.musicSourceEnabled,
      musicSourceProviders: runtimeConfig.musicSourceProviders ?? [],
      luoxueSourceEnabled: runtimeConfig.luoxueSourceEnabled ?? false,
      customMusicApiEnabled: runtimeConfig.customMusicApiEnabled ?? false,
      customMusicApiUrl: runtimeConfig.customMusicApiUrl ?? '',
    },
  }
}

/**
 * 创建下载源解析器。
 *
 * 下载优先使用 payload.sourceUrl；没有直链时按策略尝试内置解灰和官方下载接口，
 * 并携带当前登录态 Cookie 以支持会员/付费资源。
 */
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
      // 调用方已给出直链时不再请求 Music API，避免多余网络和可能的质量降级。
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
    const context = buildResolveContext(
      runtimeConfig,
      authSession,
      typeof payload.fee === 'number' ? payload.fee : 0,
      payload.lockedPlatform
    )
    const resolverPolicy = buildResolverPolicy(context)

    for (const resolverId of resolverPolicy.resolverOrder) {
      if (resolverId === 'builtinUnblock') {
        // 内置解灰使用 /song/url/v1?unblock=true，适合官方接口无直链时兜底。
        const playbackUrl = new URL('/song/url/v1', `${baseURL}/`)
        playbackUrl.searchParams.set('id', String(payload.songId))
        playbackUrl.searchParams.set('level', quality)
        playbackUrl.searchParams.set('unblock', 'true')

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

      if (resolverId !== 'official') {
        continue
      }

      const officialDownloadUrl = new URL(
        '/song/download/url/v1',
        `${baseURL}/`
      )
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

      const playbackUrl = new URL('/song/url/v1', `${baseURL}/`)
      // 官方下载接口失败后回退普通播放 URL，尽量保证用户仍能下载可播放资源。
      playbackUrl.searchParams.set('id', String(payload.songId))
      playbackUrl.searchParams.set('level', quality)
      playbackUrl.searchParams.set('unblock', 'false')

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
