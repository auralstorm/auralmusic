import type {
  BuiltinSongSearchOptions,
  BuiltinSongSearchProvider,
  BuiltinSongSearchResult,
} from '../builtin-search.types.ts'
import { requestBuiltinSearchJson } from '../builtin-search.http.ts'
import {
  formatDurationSeconds,
  parseIntegerId,
  resolveQualityLabel,
} from '../builtin-search.utils.ts'

function parseKwTypes(raw: unknown) {
  if (typeof raw !== 'string') {
    return {
      hasFlac24bit: false,
      hasFlac: false,
      has320k: false,
      has128k: false,
    }
  }

  return {
    hasFlac24bit: /bitrate:4000/.test(raw),
    hasFlac: /bitrate:2000/.test(raw),
    has320k: /bitrate:320/.test(raw),
    has128k: /bitrate:128/.test(raw),
  }
}

function normalizeKwSearchResult(
  payload: unknown,
  page: number,
  limit: number
): BuiltinSongSearchResult {
  const root =
    payload && typeof payload === 'object'
      ? (payload as {
          TOTAL?: string
          abslist?: Array<Record<string, unknown>>
        })
      : undefined
  const songs = Array.isArray(root?.abslist) ? root.abslist : []
  const total =
    typeof root?.TOTAL === 'string'
      ? Number.parseInt(root.TOTAL, 10) || songs.length
      : songs.length

  const list = songs.flatMap(song => {
    const rid =
      typeof song.MUSICRID === 'string'
        ? song.MUSICRID.replace('MUSIC_', '')
        : ''
    const id = parseIntegerId(rid)
    if (!id) {
      return []
    }

    const artist =
      typeof song.ARTIST === 'string' && song.ARTIST.trim()
        ? song.ARTIST.replace(/&/g, ' / ').trim()
        : '未知歌手'
    const albumName =
      typeof song.ALBUM === 'string' && song.ALBUM.trim()
        ? song.ALBUM.trim()
        : '未知专辑'
    const durationSeconds = Number.parseInt(String(song.DURATION ?? ''), 10)
    const mInfo = parseKwTypes(song.N_MINFO)
    const fee =
      mInfo.hasFlac24bit || mInfo.hasFlac || mInfo.has320k || mInfo.has128k
        ? 0
        : 0

    return [
      {
        id,
        name:
          typeof song.SONGNAME === 'string' && song.SONGNAME.trim()
            ? song.SONGNAME.trim()
            : '未知歌曲',
        artistNames: artist,
        albumName,
        coverUrl: '',
        duration: formatDurationSeconds(durationSeconds),
        qualityLabel: resolveQualityLabel({
          has24bit: mInfo.hasFlac24bit,
          hasSq: mInfo.hasFlac,
          hasHq: mInfo.has320k,
        }),
        fee,
        lxInfo: {
          songmid: rid,
          albumId:
            typeof song.ALBUMID === 'string' || typeof song.ALBUMID === 'number'
              ? song.ALBUMID
              : undefined,
          source: 'kw',
        },
      },
    ]
  })

  return { source: 'kw', list, total, limit, page }
}

export const kwBuiltinSearchProvider: BuiltinSongSearchProvider = {
  source: 'kw',
  async search(options: BuiltinSongSearchOptions) {
    const keyword = options.keyword.trim()
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const payload = await requestBuiltinSearchJson(
      `http://search.kuwo.cn/r.s?client=kt&all=${encodeURIComponent(keyword)}&pn=${page - 1}&rn=${limit}&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1&issubtitle=1`
    )

    return normalizeKwSearchResult(payload, page, limit)
  },
}

export { normalizeKwSearchResult }
