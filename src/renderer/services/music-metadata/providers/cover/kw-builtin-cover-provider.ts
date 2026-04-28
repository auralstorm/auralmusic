import type { LxHttpRequestOptions } from '../../../../../shared/lx-music-source.ts'
import type { BuiltinCoverProvider } from '../../platform-metadata.types.ts'

type RequestTextFn = (
  url: string,
  options?: LxHttpRequestOptions
) => Promise<string>

type KwBuiltinCoverProviderDeps = {
  requestText?: RequestTextFn
}

function readCoverUrl(value: unknown) {
  return typeof value === 'string' && /^https?:/i.test(value.trim())
    ? value.trim()
    : ''
}

async function requestKwCoverText(
  url: string,
  options: LxHttpRequestOptions = {}
) {
  const response = await window.electronMusicSource.lxHttpRequest(url, {
    timeout: 15000,
    ...options,
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`HTTP ${response.statusCode}`)
  }

  return typeof response.body === 'string' ? response.body.trim() : ''
}

export function createKwBuiltinCoverProvider(
  deps: KwBuiltinCoverProviderDeps = {}
): BuiltinCoverProvider {
  const requestText = deps.requestText ?? requestKwCoverText

  return {
    async getCover(track) {
      const currentCoverUrl = readCoverUrl(track.coverUrl)
      if (currentCoverUrl) {
        return { coverUrl: currentCoverUrl }
      }

      const songmid =
        typeof track.lxInfo?.songmid === 'string' ||
        typeof track.lxInfo?.songmid === 'number'
          ? String(track.lxInfo.songmid).trim()
          : ''

      if (!songmid) {
        return null
      }

      const coverUrl = readCoverUrl(
        await requestText(
          `http://artistpicserver.kuwo.cn/pic.web?corp=kuwo&type=rid_pic&pictype=500&size=500&rid=${encodeURIComponent(songmid)}`
        )
      )

      return coverUrl ? { coverUrl } : null
    },
  }
}

export const kwBuiltinCoverProvider = createKwBuiltinCoverProvider()
