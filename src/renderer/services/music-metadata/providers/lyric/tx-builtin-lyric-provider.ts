import type { LxHttpRequestOptions } from '../../../../../shared/lx-music-source.ts'
import type {
  BuiltinLyricProvider,
  BuiltinLyricResult,
} from '../../platform-metadata.types.ts'

type RequestJsonFn = (
  url: string,
  options?: LxHttpRequestOptions
) => Promise<unknown>

type TxBuiltinLyricProviderDeps = {
  requestJson?: RequestJsonFn
}

function readLyricText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function decodeBase64Text(value: string) {
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function normalizeTxLyricText(value: unknown) {
  const lyric = readLyricText(value)
  if (!lyric) {
    return ''
  }

  if (lyric.startsWith('[') || lyric.includes('\n')) {
    return lyric
  }

  try {
    const decoded = decodeBase64Text(lyric).trim()
    return decoded.startsWith('[') || decoded.includes('\n') ? decoded : lyric
  } catch {
    return lyric
  }
}

function normalizeTxLyricPayload(payload: unknown): BuiltinLyricResult | null {
  const root =
    payload && typeof payload === 'object'
      ? (payload as {
          lyric?: unknown
          trans?: unknown
        })
      : undefined

  const lyric = normalizeTxLyricText(root?.lyric)
  if (!lyric) {
    return null
  }

  const translatedLyric = normalizeTxLyricText(root?.trans)

  return {
    lyric,
    ...(translatedLyric ? { translatedLyric } : {}),
  }
}

async function requestTxLyricJson(
  url: string,
  options: LxHttpRequestOptions = {}
) {
  const response = await window.electronMusicSource.lxHttpRequest(url, {
    timeout: 15000,
    headers: {
      Referer: 'https://y.qq.com/',
      'User-Agent': 'Mozilla/5.0',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`HTTP ${response.statusCode}`)
  }

  return response.body
}

/**
 * 创建 QQ 音乐内置歌词 provider，优先使用公开歌词接口返回的明文 LRC。
 */
export function createTxBuiltinLyricProvider(
  deps: TxBuiltinLyricProviderDeps = {}
): BuiltinLyricProvider {
  const requestJson = deps.requestJson ?? requestTxLyricJson

  return {
    async getLyric(track) {
      const songMid =
        typeof track.lxInfo?.songmid === 'string' ||
        typeof track.lxInfo?.songmid === 'number'
          ? String(track.lxInfo.songmid).trim()
          : ''

      if (!songMid) {
        return null
      }

      const payload = await requestJson(
        `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${encodeURIComponent(songMid)}&songtype=0&format=json&nobase64=1`
      )

      return normalizeTxLyricPayload(payload)
    },
  }
}

export const txBuiltinLyricProvider = createTxBuiltinLyricProvider()

export { normalizeTxLyricPayload }
