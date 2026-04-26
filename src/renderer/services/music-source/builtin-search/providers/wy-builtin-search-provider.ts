import request from '../../../../lib/request.ts'
import type {
  BuiltinSongSearchOptions,
  BuiltinSongSearchProvider,
  BuiltinSongSearchResult,
} from '../builtin-search.types.ts'
import {
  ensureCoverUrl,
  formatArtistNames,
  formatDurationMs,
  resolveQualityLabel,
} from '../builtin-search.utils.ts'

function normalizeWySearchResult(
  payload: unknown,
  page: number,
  limit: number
): BuiltinSongSearchResult {
  const result =
    payload && typeof payload === 'object'
      ? (payload as { result?: { songs?: Array<Record<string, unknown>> } })
          .result
      : undefined
  const songs = Array.isArray(result?.songs) ? result.songs : []
  const total =
    result &&
    typeof result === 'object' &&
    typeof (result as { songCount?: number }).songCount === 'number'
      ? (result as { songCount: number }).songCount
      : songs.length

  const list = songs.flatMap(song => {
    const id = typeof song.id === 'number' ? song.id : 0
    if (!id) {
      return []
    }

    const artists = Array.isArray(song.ar)
      ? song.ar.map(artist =>
          artist &&
          typeof artist === 'object' &&
          typeof artist.name === 'string'
            ? artist.name
            : ''
        )
      : []
    const album =
      song.al && typeof song.al === 'object'
        ? (song.al as Record<string, unknown>)
        : null
    const albumName = typeof album?.name === 'string' ? album.name : '未知专辑'
    const coverUrl = ensureCoverUrl(album?.picUrl)
    const fee = typeof song.fee === 'number' ? song.fee : 0

    return [
      {
        id,
        name:
          typeof song.name === 'string' && song.name.trim()
            ? song.name.trim()
            : '未知歌曲',
        artistNames: formatArtistNames(artists),
        albumName,
        coverUrl,
        duration: formatDurationMs(song.dt),
        qualityLabel: resolveQualityLabel({
          has24bit: Boolean(song.hr),
          hasSq: Boolean(song.sq),
          hasHq: Boolean(song.h),
        }),
        fee,
        lxInfo: {
          songmid: id,
          hash: String(id),
          strMediaMid: String(id),
          copyrightId: String(id),
          albumId:
            typeof album?.id === 'number' || typeof album?.id === 'string'
              ? album.id
              : undefined,
          source: 'wy',
          img: coverUrl,
        },
      },
    ]
  })

  return {
    source: 'wy',
    list,
    total,
    limit,
    page,
  }
}

export const wyBuiltinSearchProvider: BuiltinSongSearchProvider = {
  source: 'wy',
  async search(options: BuiltinSongSearchOptions) {
    const keyword = options.keyword.trim()
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const offset = limit * (page - 1)
    const response = await request.get('/cloudsearch', {
      params: {
        keywords: keyword,
        type: 1,
        limit,
        offset,
      },
    })

    return normalizeWySearchResult(response.data, page, limit)
  },
}

export { normalizeWySearchResult }
