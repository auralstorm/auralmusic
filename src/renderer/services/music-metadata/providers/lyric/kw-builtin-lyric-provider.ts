import type { LxHttpRequestOptions } from '../../../../../shared/lx-music-source.ts'
import type {
  KwLyricDecodePayload,
  LxHttpRequestResponse,
} from '../../../../../shared/lx-music-source.ts'
import type { BuiltinLyricProvider } from '../../platform-metadata.types.ts'

type RequestJsonFn = (
  url: string,
  options?: LxHttpRequestOptions
) => Promise<unknown>
type RequestRawFn = (
  url: string,
  options?: LxHttpRequestOptions
) => Promise<LxHttpRequestResponse>
type DecodeKwLyricResponseFn = (
  payload: KwLyricDecodePayload
) => Promise<string>

type KwBuiltinLyricProviderDeps = {
  requestJson?: RequestJsonFn
  requestRaw?: RequestRawFn
  decodeKwLyricResponse?: DecodeKwLyricResponseFn
}

const KUWO_WORD_TIME_PATTERN = /<(-?\d+),(-?\d+)(?:,-?\d+)?>/g
const KUWO_EXIST_TIME_PATTERN = /\[\d{1,2}:.*\d{1,4}\]/
const KUWO_LYRIC_KEY = 'yeelion'

function readLyricText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function formatKwTimestamp(value: unknown) {
  const seconds = Number.parseFloat(String(value ?? ''))
  if (!Number.isFinite(seconds) || seconds < 0) {
    return null
  }

  const totalHundredths = Math.round(seconds * 100)
  const minutes = Math.floor(totalHundredths / 6000)
  const remaining = totalHundredths % 6000
  const secs = Math.floor(remaining / 100)
  const hundredths = remaining % 100

  return `[${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}]`
}

function normalizeKwLyricPayload(payload: unknown) {
  const root =
    payload && typeof payload === 'object'
      ? (payload as {
          data?: {
            lrclist?: Array<{
              time?: unknown
              lineLyric?: unknown
            }>
          }
          lrclist?: Array<{
            time?: unknown
            lineLyric?: unknown
          }>
        })
      : undefined

  const lyricLines = (root?.data?.lrclist ?? root?.lrclist ?? [])
    .flatMap(line => {
      const timestamp = formatKwTimestamp(line?.time)
      const lyric = readLyricText(line?.lineLyric)

      if (!timestamp || !lyric) {
        return []
      }

      return [`${timestamp}${lyric}`]
    })
    .join('\n')

  return lyricLines ? { lyric: lyricLines } : null
}

function buildKwNewLyricParams(id: string, isGetLyricx = true) {
  let params = `user=12345,web,web,web&requester=localhost&req=1&rid=MUSIC_${id}`
  if (isGetLyricx) {
    params += '&lrcx=1'
  }

  const input = new TextEncoder().encode(params)
  const key = new TextEncoder().encode(KUWO_LYRIC_KEY)
  const output = new Uint16Array(input.length)
  let index = 0

  while (index < input.length) {
    let keyIndex = 0
    while (keyIndex < key.length && index < input.length) {
      output[index] = key[keyIndex] ^ input[index]
      index += 1
      keyIndex += 1
    }
  }

  const bytes = new Uint8Array(output.buffer)
  let binary = ''
  for (let start = 0; start < bytes.length; start += 8192) {
    const chunk = bytes.subarray(start, start + 8192)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function uint8ArrayToBase64(bytes: Uint8Array) {
  let binary = ''
  for (let start = 0; start < bytes.length; start += 8192) {
    const chunk = bytes.subarray(start, start + 8192)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function normalizeDecodedKwLyric(decodedLyric: string) {
  const lyric = readLyricText(
    decodedLyric.replace(KUWO_WORD_TIME_PATTERN, '').trim()
  )

  if (!lyric || !KUWO_EXIST_TIME_PATTERN.test(lyric)) {
    return null
  }

  return { lyric }
}

async function requestKwLyricJson(
  url: string,
  options: LxHttpRequestOptions = {}
) {
  const response = await window.electronMusicSource.lxHttpRequest(url, {
    timeout: 15000,
    headers: {
      Referer: 'https://m.kuwo.cn/',
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

async function requestKwLyricRaw(
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

  return response
}

function decodeKwLyricResponse(payload: KwLyricDecodePayload) {
  return window.electronMusicSource.decodeKwLyricResponse(payload)
}

/**
 * 创建酷我内置歌词 provider，将 `lrclist` 响应转换为标准 LRC 文本。
 */
export function createKwBuiltinLyricProvider(
  deps: KwBuiltinLyricProviderDeps = {}
): BuiltinLyricProvider {
  const requestJson = deps.requestJson ?? requestKwLyricJson
  const requestRaw = deps.requestRaw ?? requestKwLyricRaw
  const decodeRawLyric = deps.decodeKwLyricResponse ?? decodeKwLyricResponse
  const shouldUseEncryptedNewlyric =
    Boolean(deps.requestRaw || deps.decodeKwLyricResponse) ||
    typeof window !== 'undefined'

  return {
    async getLyric(track) {
      const musicId =
        typeof track.lxInfo?.songmid === 'string' ||
        typeof track.lxInfo?.songmid === 'number'
          ? String(track.lxInfo.songmid).trim()
          : ''

      if (!musicId) {
        return null
      }

      if (shouldUseEncryptedNewlyric) {
        try {
          const rawResponse = await requestRaw(
            `http://newlyric.kuwo.cn/newlyric.lrc?${buildKwNewLyricParams(musicId)}`
          )
          const decodedLyric = await decodeRawLyric({
            lrcBase64: uint8ArrayToBase64(rawResponse.raw),
            isGetLyricx: true,
          })
          const lyricResult = normalizeDecodedKwLyric(decodedLyric)
          if (lyricResult) {
            return lyricResult
          }
        } catch (error) {
          console.warn(
            'kw newlyric provider failed, fallback to h5 lyric',
            error
          )
        }
      }

      const payload = await requestJson(
        `https://m.kuwo.cn/newh5/singles/songinfoandlrc?musicId=${encodeURIComponent(musicId)}`
      )
      return normalizeKwLyricPayload(payload)
    },
  }
}

export const kwBuiltinLyricProvider = createKwBuiltinLyricProvider()

export { normalizeKwLyricPayload }
