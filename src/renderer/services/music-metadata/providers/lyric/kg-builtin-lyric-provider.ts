import type { LxHttpRequestOptions } from '../../../../../shared/lx-music-source.ts'
import type { BuiltinLyricProvider } from '../../platform-metadata.types.ts'

type RequestJsonFn = (
  url: string,
  options?: LxHttpRequestOptions
) => Promise<unknown>

type KgBuiltinLyricProviderDeps = {
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

function normalizeKgLyricContent(value: unknown) {
  const lyric = readLyricText(value)
  if (!lyric) {
    return ''
  }

  if (lyric.startsWith('[') || lyric.includes('\n')) {
    return lyric
  }

  try {
    return decodeBase64Text(lyric)
      .replace(/^\uFEFF/, '')
      .trim()
  } catch {
    return lyric
  }
}

function pickKgLyricCandidate(payload: unknown) {
  const root =
    payload && typeof payload === 'object'
      ? (payload as {
          candidates?: Array<{
            id?: unknown
            accesskey?: unknown
          }>
        })
      : undefined

  return root?.candidates?.find(candidate => {
    const id = readLyricText(candidate?.id)
    const accesskey = readLyricText(candidate?.accesskey)
    return Boolean(id && accesskey)
  })
}

async function requestKgLyricJson(
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

  return response.body
}

/**
 * 创建酷狗内置歌词 provider，先搜索歌词候选再下载 LRC 文本。
 */
export function createKgBuiltinLyricProvider(
  deps: KgBuiltinLyricProviderDeps = {}
): BuiltinLyricProvider {
  const requestJson = deps.requestJson ?? requestKgLyricJson

  return {
    async getLyric(track) {
      const hash = readLyricText(track.lxInfo?.hash)
      if (!hash) {
        return null
      }

      const durationSeconds = Math.max(1, Math.round(track.duration / 1000))
      const keyword = readLyricText(`${track.artistNames} - ${track.name}`)
      const searchPayload = await requestJson(
        `https://lyrics.kugou.com/search?ver=1&man=yes&client=pc&keyword=${encodeURIComponent(keyword)}&duration=${durationSeconds}&hash=${encodeURIComponent(hash)}`
      )

      const candidate = pickKgLyricCandidate(searchPayload)
      const id = readLyricText(candidate?.id)
      const accesskey = readLyricText(candidate?.accesskey)

      if (!id || !accesskey) {
        return null
      }

      const downloadPayload = await requestJson(
        `https://lyrics.kugou.com/download?ver=1&client=pc&id=${encodeURIComponent(id)}&accesskey=${encodeURIComponent(accesskey)}&fmt=lrc&charset=utf8`
      )

      const lyric = normalizeKgLyricContent(
        downloadPayload &&
          typeof downloadPayload === 'object' &&
          'content' in downloadPayload
          ? (downloadPayload as { content?: unknown }).content
          : ''
      )

      return lyric ? { lyric } : null
    },
  }
}

export const kgBuiltinLyricProvider = createKgBuiltinLyricProvider()
