import type {
  BuiltinSongSearchOptions,
  BuiltinSongSearchProvider,
  BuiltinSongSearchResult,
} from '../builtin-search.types.ts'
import { requestBuiltinSearchJson } from '../builtin-search.http.ts'
import {
  formatArtistNames,
  formatDurationSeconds,
  hasPositiveNumber,
  parseIntegerId,
  resolveQualityLabel,
} from '../builtin-search.utils.ts'

function normalizeKgItem(song: Record<string, unknown>) {
  const id = parseIntegerId(song.Audioid)
  const hash = typeof song.FileHash === 'string' ? song.FileHash.trim() : ''

  if (!id || !hash) {
    return null
  }

  return {
    id,
    name:
      typeof song.SongName === 'string' && song.SongName.trim()
        ? song.SongName.trim()
        : '未知歌曲',
    artistNames: formatArtistNames(
      Array.isArray(song.Singers)
        ? song.Singers.map(item =>
            item && typeof item === 'object' && typeof item.name === 'string'
              ? item.name
              : ''
          )
        : []
    ),
    albumName:
      typeof song.AlbumName === 'string' && song.AlbumName.trim()
        ? song.AlbumName.trim()
        : '未知专辑',
    coverUrl: '',
    duration: formatDurationSeconds(song.Duration),
    qualityLabel: resolveQualityLabel({
      hasSq:
        (typeof song.SQFileHash === 'string' &&
          song.SQFileHash.trim().length > 0) ||
        (typeof song.ResFileHash === 'string' &&
          song.ResFileHash.trim().length > 0),
      hasHq:
        (typeof song.HQFileHash === 'string' &&
          song.HQFileHash.trim().length > 0) ||
        hasPositiveNumber(song.Bitrate),
    }),
    fee: 0,
    lxInfo: {
      songmid: id,
      audioId: String(id),
      hash,
      albumId:
        typeof song.AlbumID === 'string' || typeof song.AlbumID === 'number'
          ? song.AlbumID
          : undefined,
      source: 'kg',
    },
  }
}

function normalizeKgSearchResult(
  payload: unknown,
  page: number,
  limit: number
): BuiltinSongSearchResult {
  const root =
    payload && typeof payload === 'object'
      ? (payload as {
          data?: { total?: number; lists?: Array<Record<string, unknown>> }
        })
      : undefined
  const songs = Array.isArray(root?.data?.lists) ? root.data.lists : []
  const total =
    typeof root?.data?.total === 'number' ? root.data.total : songs.length
  const dedupe = new Set<string>()
  const list = songs.flatMap(song => {
    const normalized = normalizeKgItem(song)
    if (!normalized) {
      return []
    }

    const key = String(normalized.lxInfo?.audioId || normalized.id)
    if (dedupe.has(key)) {
      return []
    }
    dedupe.add(key)

    const group = Array.isArray(song.Grp) ? song.Grp : []
    const children = group.flatMap(child => {
      if (!child || typeof child !== 'object') {
        return []
      }
      const normalizedChild = normalizeKgItem(child as Record<string, unknown>)
      if (!normalizedChild) {
        return []
      }
      const childKey = String(
        normalizedChild.lxInfo?.audioId || normalizedChild.id
      )
      if (dedupe.has(childKey)) {
        return []
      }
      dedupe.add(childKey)
      return [normalizedChild]
    })

    return [normalized, ...children]
  })

  return { source: 'kg', list, total, limit, page }
}

export const kgBuiltinSearchProvider: BuiltinSongSearchProvider = {
  source: 'kg',
  async search(options: BuiltinSongSearchOptions) {
    const keyword = options.keyword.trim()
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const payload = await requestBuiltinSearchJson(
      `https://songsearch.kugou.com/song_search_v2?keyword=${encodeURIComponent(keyword)}&page=${page}&pagesize=${limit}&userid=0&clientver=&platform=WebFilter&filter=2&iscorrection=1&privilege_filter=0&area_code=1`
    )

    return normalizeKgSearchResult(payload, page, limit)
  },
}

export { normalizeKgSearchResult }
