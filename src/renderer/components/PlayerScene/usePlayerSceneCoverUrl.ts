import { useEffect, useState } from 'react'
import { isLocalMediaUrl } from '../../../shared/local-media.ts'
import { createRendererLogger } from '../../lib/logger.ts'

const coverLogger = createRendererLogger('player-scene-cover')
const DEFAULT_RESOLVE_RETRY_COUNT = 6
const DEFAULT_RESOLVE_RETRY_DELAY_MS = 120

type ResolveImageSourceFn = (
  cacheKey: string,
  sourceUrl: string
) => Promise<{
  url: string
  fromCache: boolean
}>

type ResolvePlayerSceneVisualCoverUrlOptions = {
  coverUrl: string
  resolveImageSource: ResolveImageSourceFn
  retryCount?: number
  retryDelayMs?: number
}

function createPlayerSceneCoverCacheKey(coverUrl: string) {
  return `player-scene-cover:${coverUrl}`
}

function delay(ms: number) {
  return new Promise<void>(resolve => {
    globalThis.setTimeout(resolve, ms)
  })
}

function isSafeVisualCoverUrl(coverUrl: string) {
  if (!coverUrl.trim()) {
    return false
  }

  if (isLocalMediaUrl(coverUrl)) {
    return true
  }

  try {
    const url = new URL(coverUrl)
    return url.protocol === 'blob:' || url.protocol === 'data:'
  } catch {
    return false
  }
}

export async function resolvePlayerSceneVisualCoverUrl({
  coverUrl,
  resolveImageSource,
  retryCount = DEFAULT_RESOLVE_RETRY_COUNT,
  retryDelayMs = DEFAULT_RESOLVE_RETRY_DELAY_MS,
}: ResolvePlayerSceneVisualCoverUrlOptions) {
  const normalizedCoverUrl = coverUrl.trim()
  if (!normalizedCoverUrl) {
    return ''
  }

  if (isSafeVisualCoverUrl(normalizedCoverUrl)) {
    return normalizedCoverUrl
  }

  const cacheKey = createPlayerSceneCoverCacheKey(normalizedCoverUrl)
  const maxAttempts = Math.max(1, retryCount + 1)

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await resolveImageSource(cacheKey, normalizedCoverUrl)
    const nextUrl = result.url?.trim() || ''
    if (isSafeVisualCoverUrl(nextUrl)) {
      return nextUrl
    }

    if (attempt < maxAttempts - 1) {
      await delay(retryDelayMs)
    }
  }

  return ''
}

/**
 * 将播放器视觉层封面本地化，避免 WebGL/AMLL 背景直接读取跨域图片。
 */
export function usePlayerSceneCoverUrl(coverUrl: string) {
  const normalizedCoverUrl = coverUrl.trim()
  const [resolvedCoverUrl, setResolvedCoverUrl] = useState(
    isSafeVisualCoverUrl(normalizedCoverUrl) ? normalizedCoverUrl : ''
  )

  useEffect(() => {
    let cancelled = false

    if (!normalizedCoverUrl) {
      setResolvedCoverUrl('')
      return
    }

    setResolvedCoverUrl(
      isSafeVisualCoverUrl(normalizedCoverUrl) ? normalizedCoverUrl : ''
    )

    const resolveCoverUrl = async () => {
      try {
        const result = await resolvePlayerSceneVisualCoverUrl({
          coverUrl: normalizedCoverUrl,
          resolveImageSource: window.electronCache.resolveImageSource,
        })
        if (cancelled) {
          return
        }

        setResolvedCoverUrl(result)
      } catch (error) {
        coverLogger.warn('resolve player scene cover cache failed', {
          error,
        })
        if (!cancelled) {
          setResolvedCoverUrl('')
        }
      }
    }

    void resolveCoverUrl()

    return () => {
      cancelled = true
    }
  }, [normalizedCoverUrl])

  return resolvedCoverUrl
}
