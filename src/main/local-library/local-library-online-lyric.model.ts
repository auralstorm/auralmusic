type SearchSongCandidate = {
  id: number
}

type LocalLibraryLyricPayload = {
  lyricText: string
  translatedLyricText: string
}

type SearchSongRecord = {
  id?: unknown
  name?: unknown
  artists?: Array<{ name?: unknown }>
  ar?: Array<{ name?: unknown }>
  dt?: unknown
  duration?: unknown
}

type ConservativeSearchInput = {
  title: string
  artistName: string
  durationMs: number
}

const MAX_DURATION_DIFF_MS = 5000

function normalizeTrackTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/（.*?）|\(.*?\)|\[.*?\]/g, '')
    .replace(/\b(live|remix|mix|ver|version|feat|ft)\b/gi, '')
    .replace(/[\s\-_/.,，。·'"“”‘’!！?？:&]+/g, '')
    .trim()
}

function normalizeArtistTokens(value: string) {
  return value
    .replace(/[|/、，,&]/g, ',')
    .replace(/\b(feat|ft)\.?\b/gi, ',')
    .split(',')
    .map(token => token.trim().toLowerCase())
    .filter(Boolean)
}

function readSongArtists(song: SearchSongRecord) {
  const artists = song.artists ?? song.ar ?? []
  return artists
    .map(artist => (typeof artist.name === 'string' ? artist.name : ''))
    .filter(Boolean)
}

function readSongDurationMs(song: SearchSongRecord) {
  if (typeof song.dt === 'number' && Number.isFinite(song.dt)) {
    return song.dt
  }

  if (typeof song.duration === 'number' && Number.isFinite(song.duration)) {
    return song.duration
  }

  return 0
}

function readSearchSongRecords(payload: unknown) {
  return readSearchSongs(payload) as SearchSongRecord[]
}

function isSafeTitleMatch(inputTitle: string, candidateTitle: string) {
  const normalizedInputTitle = normalizeTrackTitle(inputTitle)
  const normalizedCandidateTitle = normalizeTrackTitle(candidateTitle)

  return (
    Boolean(normalizedInputTitle) &&
    normalizedInputTitle === normalizedCandidateTitle
  )
}

function hasArtistIntersection(
  inputArtistName: string,
  candidateArtists: string[]
) {
  const inputTokens = new Set(normalizeArtistTokens(inputArtistName))
  const candidateTokens = new Set(
    candidateArtists.flatMap(artist => normalizeArtistTokens(artist))
  )

  if (inputTokens.size === 0 || candidateTokens.size === 0) {
    return false
  }

  for (const token of inputTokens) {
    if (candidateTokens.has(token)) {
      return true
    }
  }

  return false
}

function isSafeDurationMatch(
  inputDurationMs: number,
  candidateDurationMs: number
) {
  if (inputDurationMs <= 0 || candidateDurationMs <= 0) {
    return true
  }

  return Math.abs(inputDurationMs - candidateDurationMs) <= MAX_DURATION_DIFF_MS
}

function sanitizeLyricText(value: string) {
  return value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => {
      if (!line) {
        return false
      }

      // 网易云歌词接口偶尔会把头部 JSON 信息混进文本，写回本地前先剔除脏行。
      if (line.startsWith('{') && line.endsWith('}')) {
        return false
      }

      return true
    })
    .join('\n')
}

function readSearchSongs(payload: unknown) {
  const root = payload as
    | {
        result?: {
          songs?: Array<{
            id?: unknown
          }>
        }
      }
    | undefined

  return root?.result?.songs ?? []
}

export function buildLocalLyricSearchKeyword(
  title: string,
  artistName: string
) {
  return [title, artistName.replaceAll('|', ' ')]
    .map(value => value.trim())
    .filter(Boolean)
    .join(' ')
}

export function readFirstSearchSongCandidate(
  payload: unknown
): SearchSongCandidate | null {
  const candidate = readSearchSongs(payload).find(song => {
    return typeof song.id === 'number' && Number.isFinite(song.id)
  })

  if (!candidate || typeof candidate.id !== 'number') {
    return null
  }

  return {
    id: candidate.id,
  }
}

/**
 * 只在标题、歌手、时长都足够接近时才允许回写歌词，避免把错歌结果持久化进本地文件。
 * @param input 当前本地歌曲的关键识别信息
 * @param payload 搜索接口返回结果
 * @returns 可安全写回的候选歌曲
 */
export function readConservativeSearchSongCandidate(
  input: ConservativeSearchInput,
  payload: unknown
): SearchSongCandidate | null {
  const candidate = readSearchSongRecords(payload).find(song => {
    if (typeof song.id !== 'number' || !Number.isFinite(song.id)) {
      return false
    }

    const songTitle = typeof song.name === 'string' ? song.name : ''
    if (!isSafeTitleMatch(input.title, songTitle)) {
      return false
    }

    const songArtists = readSongArtists(song)
    if (!hasArtistIntersection(input.artistName, songArtists)) {
      return false
    }

    return isSafeDurationMatch(input.durationMs, readSongDurationMs(song))
  })

  if (!candidate || typeof candidate.id !== 'number') {
    return null
  }

  return {
    id: candidate.id,
  }
}

export function readOnlineLyricPayload(
  payload: unknown
): LocalLibraryLyricPayload {
  const root = payload as
    | {
        lrc?: { lyric?: string }
        tlyric?: { lyric?: string }
        data?: {
          lrc?: { lyric?: string }
          tlyric?: { lyric?: string }
        }
      }
    | undefined
  const data = root?.data ?? root

  return {
    lyricText: sanitizeLyricText(data?.lrc?.lyric ?? ''),
    translatedLyricText: sanitizeLyricText(data?.tlyric?.lyric ?? ''),
  }
}

export function readOnlineCoverUrl(payload: unknown) {
  const root = payload as
    | {
        songs?: Array<{
          al?: { picUrl?: string }
          album?: { picUrl?: string }
        }>
        data?: {
          songs?: Array<{
            al?: { picUrl?: string }
            album?: { picUrl?: string }
          }>
        }
      }
    | undefined
  const song = root?.songs?.[0] ?? root?.data?.songs?.[0]
  const album = song?.al ?? song?.album
  return typeof album?.picUrl === 'string' ? album.picUrl : ''
}
