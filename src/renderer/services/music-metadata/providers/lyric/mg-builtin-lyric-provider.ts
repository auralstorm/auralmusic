import { createLxRuntimeMd5 } from '../../../music-source/model/lx-runtime-utils.ts'
import type { LxHttpRequestOptions } from '../../../../../shared/lx-music-source.ts'
import type {
  BuiltinLyricProvider,
  PlatformMetadataRequest,
} from '../../platform-metadata.types.ts'

type RequestJsonFn = (
  url: string,
  options?: LxHttpRequestOptions
) => Promise<unknown>

type RequestTextFn = (
  url: string,
  options?: LxHttpRequestOptions
) => Promise<string>

type MgBuiltinLyricProviderDeps = {
  now?: () => number
  requestJson?: RequestJsonFn
  requestText?: RequestTextFn
}

const MG_DEVICE_ID = '963B7AA0D21511ED807EE5846EC87D20'
const MG_SIGNATURE_MD5 = '6cdc72a439cef99a3418d2a78aa28c73'

function readLyricText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function normalizeMgIdentityText(value: unknown) {
  return readLyricText(value).replace(/\s+/g, ' ')
}

function createMgSignature(time: string, keyword: string) {
  return createLxRuntimeMd5(
    `${keyword}${MG_SIGNATURE_MD5}yyapp2d16148780a1dcc7408e06336b98cfd50${MG_DEVICE_ID}${time}`
  )
}

function readMgArtists(value: unknown) {
  return Array.isArray(value)
    ? value
        .map(item =>
          item && typeof item === 'object' && typeof item.name === 'string'
            ? normalizeMgIdentityText(item.name)
            : ''
        )
        .filter(Boolean)
    : []
}

function flattenMgSongs(payload: unknown) {
  const root =
    payload && typeof payload === 'object'
      ? (payload as {
          songResultData?: {
            resultList?: unknown[]
          }
        })
      : undefined

  return (root?.songResultData?.resultList ?? []).flatMap(group =>
    Array.isArray(group)
      ? (group.filter(
          item => Boolean(item) && typeof item === 'object'
        ) as Array<Record<string, unknown>>)
      : []
  )
}

function pickMgLyricSong(payload: unknown, track: PlatformMetadataRequest) {
  const songs = flattenMgSongs(payload)
  const expectedCopyrightId = readLyricText(track.lxInfo?.copyrightId)
  const expectedSongId = readLyricText(track.lxInfo?.songmid)
  const trackName = normalizeMgIdentityText(track.name)
  const trackArtists = normalizeMgIdentityText(track.artistNames)

  return (
    songs.find(
      song => readLyricText(song.copyrightId) === expectedCopyrightId
    ) ??
    songs.find(song => readLyricText(song.songId) === expectedSongId) ??
    songs.find(song => {
      const songName =
        normalizeMgIdentityText(song.name) ||
        normalizeMgIdentityText(song.songName)
      const artists = normalizeMgIdentityText(
        readMgArtists(song.singerList).join(' / ')
      )
      return songName === trackName && artists === trackArtists
    }) ??
    null
  )
}

async function requestMgJson(url: string, options: LxHttpRequestOptions = {}) {
  const response = await window.electronMusicSource.lxHttpRequest(url, {
    timeout: 15000,
    ...options,
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`HTTP ${response.statusCode}`)
  }

  return response.body
}

async function requestMgText(url: string, options: LxHttpRequestOptions = {}) {
  const response = await window.electronMusicSource.lxHttpRequest(url, {
    timeout: 15000,
    ...options,
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`HTTP ${response.statusCode}`)
  }

  return typeof response.body === 'string'
    ? response.body.trim()
    : readLyricText(response.body)
}

/**
 * 创建咪咕内置歌词 provider，先搜索匹配歌曲，再拉取搜索结果附带的歌词地址。
 */
export function createMgBuiltinLyricProvider(
  deps: MgBuiltinLyricProviderDeps = {}
): BuiltinLyricProvider {
  const now = deps.now ?? Date.now
  const requestJson = deps.requestJson ?? requestMgJson
  const requestText = deps.requestText ?? requestMgText

  return {
    async getLyric(track) {
      const keyword = readLyricText(track.name)
      if (!keyword) {
        return null
      }

      const time = String(now())
      const searchPayload = await requestJson(
        `https://jadeite.migu.cn/music_search/v3/search/searchAll?isCorrect=0&isCopyright=1&searchSwitch=%7B%22song%22%3A1%2C%22album%22%3A0%2C%22singer%22%3A0%2C%22tagSong%22%3A1%2C%22mvSong%22%3A0%2C%22bestShow%22%3A1%2C%22songlist%22%3A0%2C%22lyricSong%22%3A0%7D&pageSize=10&text=${encodeURIComponent(keyword)}&pageNo=1&sort=0&sid=USS`,
        {
          headers: {
            uiVersion: 'A_music_3.6.1',
            deviceId: MG_DEVICE_ID,
            timestamp: time,
            sign: createMgSignature(time, keyword),
            channel: '0146921',
            'User-Agent':
              'Mozilla/5.0 (Linux; Android 11) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
          },
        }
      )

      const song = pickMgLyricSong(searchPayload, track)
      const lyricUrl =
        readLyricText(song?.lrcUrl) || readLyricText(song?.lyricUrl)
      if (!lyricUrl) {
        return null
      }

      const lyric = await requestText(lyricUrl)
      return lyric ? { lyric } : null
    },
  }
}

export const mgBuiltinLyricProvider = createMgBuiltinLyricProvider()
