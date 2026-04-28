import type { LxHttpRequestOptions } from '../../../../../shared/lx-music-source.ts'
import type { BuiltinLyricProvider } from '../../platform-metadata.types.ts'

type RequestJsonFn = (
  url: string,
  options?: LxHttpRequestOptions
) => Promise<unknown>
type CreateReqIdFn = () => string

type KwBuiltinLyricProviderDeps = {
  requestJson?: RequestJsonFn
  createReqId?: CreateReqIdFn
}

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

function createFallbackUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, token => {
    const random = Math.floor(Math.random() * 16)
    const value = token === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function createKwLyricReqId() {
  return globalThis.crypto?.randomUUID?.() ?? createFallbackUuid()
}

function buildKwLyricUrl(musicId: string, reqId: string) {
  return `https://kuwo.cn/openapi/v1/www/lyric/getlyric?musicId=${encodeURIComponent(musicId)}&httpsStatus=1&reqId=${encodeURIComponent(reqId)}&plat=web_www&from=`
}

/**
 * 创建酷我内置歌词 provider，将 openapi `lrclist` 响应转换为标准 LRC 文本。
 */
export function createKwBuiltinLyricProvider(
  deps: KwBuiltinLyricProviderDeps = {}
): BuiltinLyricProvider {
  const requestJson = deps.requestJson ?? requestKwLyricJson
  const createReqId = deps.createReqId ?? createKwLyricReqId

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

      const payload = await requestJson(buildKwLyricUrl(musicId, createReqId()))
      return normalizeKwLyricPayload(payload)
    },
  }
}

export const kwBuiltinLyricProvider = createKwBuiltinLyricProvider()

export { buildKwLyricUrl, normalizeKwLyricPayload }
