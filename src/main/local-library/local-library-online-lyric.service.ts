import { getAuthSession } from '../auth/store.ts'
import {
  normalizeRequestHeadersForFetch,
  resolveAuthRequestHeaders,
} from '../auth/request-header.ts'
import { readMusicApiBaseUrlFromEnv } from '../music-api-runtime.ts'
import type {
  LocalLibraryOnlineLyricMatchInput,
  LocalLibraryOnlineLyricMatchResult,
} from '../../shared/local-library.ts'
import { createLocalMediaUrl } from '../../shared/local-media.ts'
import type { LocalLibraryDatabase } from './db.ts'
import {
  buildLocalLyricSearchKeyword,
  readConservativeSearchSongCandidate,
  readOnlineCoverUrl,
  readOnlineLyricPayload,
} from './local-library-online-lyric.model.ts'
import { writeLocalTrackSupplementalMetadata } from './local-library-writeback.ts'

type MatchLocalLibraryLyricsOptions = {
  database: LocalLibraryDatabase
  coverCacheDir: string
  fetcher?: typeof fetch
}

function createMusicApiRequestHeaders(requestUrl: string) {
  const baseURL = readMusicApiBaseUrlFromEnv()
  if (!baseURL) {
    return {}
  }

  let authOrigin: string | undefined
  try {
    authOrigin = new URL(baseURL).origin
  } catch {
    authOrigin = undefined
  }

  return normalizeRequestHeadersForFetch(
    resolveAuthRequestHeaders({
      authOrigin,
      authSession: getAuthSession(),
      requestHeaders: {},
      requestUrl,
    })
  )
}

async function fetchMusicApiJson(fetcher: typeof fetch, requestUrl: string) {
  const response = await fetcher(requestUrl, {
    headers: createMusicApiRequestHeaders(requestUrl),
  })

  if (!response.ok) {
    throw new Error(`music api request failed: ${response.status}`)
  }

  return response.json()
}

/**
 * 本地歌曲补充元数据只在缺词/缺封面时按需联网，避免把扫描阶段变成高频网络任务。
 * @param input 当前本地播放歌曲的基础信息
 * @param options 主进程依赖
 * @returns 写回后的歌词与封面结果
 */
export async function matchLocalLibraryTrackOnlineLyrics(
  input: LocalLibraryOnlineLyricMatchInput,
  options: MatchLocalLibraryLyricsOptions
): Promise<LocalLibraryOnlineLyricMatchResult | null> {
  const baseURL = readMusicApiBaseUrlFromEnv()
  if (!baseURL) {
    return null
  }

  const fetcher = options.fetcher ?? fetch
  const searchUrl = new URL('/search', `${baseURL}/`)
  searchUrl.searchParams.set(
    'keywords',
    buildLocalLyricSearchKeyword(input.title, input.artistName)
  )
  searchUrl.searchParams.set('type', '1')

  const searchPayload = await fetchMusicApiJson(fetcher, searchUrl.toString())
  const matchedSong = readConservativeSearchSongCandidate(
    {
      title: input.title,
      artistName: input.artistName,
      durationMs: input.durationMs,
    },
    searchPayload
  )
  if (!matchedSong) {
    return null
  }

  const lyricUrl = new URL('/lyric/new', `${baseURL}/`)
  lyricUrl.searchParams.set('id', String(matchedSong.id))
  const detailUrl = new URL('/song/detail', `${baseURL}/`)
  detailUrl.searchParams.set('ids', String(matchedSong.id))

  const [lyricPayload, detailPayload] = await Promise.all([
    fetchMusicApiJson(fetcher, lyricUrl.toString()),
    fetchMusicApiJson(fetcher, detailUrl.toString()).catch(() => null),
  ])

  const lyricBundle = readOnlineLyricPayload(lyricPayload)
  const remoteCoverUrl = detailPayload ? readOnlineCoverUrl(detailPayload) : ''
  if (
    !lyricBundle.lyricText &&
    !lyricBundle.translatedLyricText &&
    !remoteCoverUrl.trim()
  ) {
    return null
  }

  const writebackResult = await writeLocalTrackSupplementalMetadata({
    filePath: input.filePath,
    title: input.title,
    artistName: input.artistName,
    albumName: input.albumName,
    coverUrl: remoteCoverUrl,
    lyricText: lyricBundle.lyricText,
    translatedLyricText: lyricBundle.translatedLyricText,
    coverCacheDir: options.coverCacheDir,
    fetcher,
  })

  options.database.updateTrackSupplementalMetadata({
    filePath: input.filePath,
    lyricText: lyricBundle.lyricText,
    translatedLyricText: lyricBundle.translatedLyricText,
    coverPath: writebackResult.coverPath,
  })

  const updatedTrack = options.database.getTrackByFilePath(input.filePath)

  return {
    lyricText: lyricBundle.lyricText,
    translatedLyricText: lyricBundle.translatedLyricText,
    coverUrl:
      updatedTrack?.coverUrl ||
      createLocalMediaUrl(writebackResult.coverPath ?? '') ||
      input.coverUrl,
  }
}
