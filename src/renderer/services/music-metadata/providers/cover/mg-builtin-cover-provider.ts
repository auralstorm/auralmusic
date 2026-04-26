import type { LxHttpRequestOptions } from '../../../../../shared/lx-music-source.ts'
import type { BuiltinCoverProvider } from '../../platform-metadata.types.ts'

type RequestJsonFn = (
  url: string,
  options?: LxHttpRequestOptions
) => Promise<unknown>

type MgBuiltinCoverProviderDeps = {
  requestJson?: RequestJsonFn
}

function readText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function normalizeMgCoverUrl(value: unknown) {
  const coverUrl = readText(value)
  if (!coverUrl) {
    return ''
  }

  return /^https?:/i.test(coverUrl) ? coverUrl : `http:${coverUrl}`
}

async function requestMgCoverJson(
  url: string,
  options: LxHttpRequestOptions = {}
) {
  const response = await window.electronMusicSource.lxHttpRequest(url, {
    timeout: 15000,
    headers: {
      Referer: 'http://music.migu.cn/v3/music/player/audio?from=migu',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`HTTP ${response.statusCode}`)
  }

  return response.body
}

export function createMgBuiltinCoverProvider(
  deps: MgBuiltinCoverProviderDeps = {}
): BuiltinCoverProvider {
  const requestJson = deps.requestJson ?? requestMgCoverJson

  return {
    async getCover(track) {
      const currentCoverUrl = readText(track.coverUrl)
      if (currentCoverUrl) {
        return { coverUrl: currentCoverUrl }
      }

      const songId =
        typeof track.lxInfo?.songmid === 'string' ||
        typeof track.lxInfo?.songmid === 'number'
          ? String(track.lxInfo.songmid).trim()
          : ''

      if (!songId) {
        return null
      }

      const payload = await requestJson(
        `http://music.migu.cn/v3/api/music/audioPlayer/getSongPic?songId=${encodeURIComponent(songId)}`
      )

      const coverUrl =
        payload && typeof payload === 'object'
          ? normalizeMgCoverUrl(
              (payload as { largePic?: unknown }).largePic ||
                (payload as { mediumPic?: unknown }).mediumPic ||
                (payload as { smallPic?: unknown }).smallPic
            )
          : ''

      return coverUrl ? { coverUrl } : null
    },
  }
}

export const mgBuiltinCoverProvider = createMgBuiltinCoverProvider()
