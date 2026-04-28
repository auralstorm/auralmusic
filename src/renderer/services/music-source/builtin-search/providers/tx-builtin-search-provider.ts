import type {
  BuiltinSongSearchOptions,
  BuiltinSongSearchProvider,
  BuiltinSongSearchResult,
} from '../builtin-search.types.ts'
import { requestBuiltinSearchJson } from '../builtin-search.http.ts'
import {
  ensureCoverUrl,
  formatArtistNames,
  formatDurationSeconds,
  hasPositiveNumber,
  parseIntegerId,
  resolveQualityLabel,
} from '../builtin-search.utils.ts'

function createTxSearchBody(keyword: string, page: number, limit: number) {
  return JSON.stringify({
    comm: {
      ct: '11',
      cv: '14090508',
      v: '14090508',
      tmeAppID: 'qqmusic',
      phonetype: 'EBG-AN10',
      deviceScore: '553.47',
      devicelevel: '50',
      newdevicelevel: '20',
      rom: 'HuaWei/EMOTION/EmotionUI_14.2.0',
      os_ver: '12',
      OpenUDID: '0',
      OpenUDID2: '0',
      QIMEI36: '0',
      udid: '0',
      chid: '0',
      aid: '0',
      oaid: '0',
      taid: '0',
      tid: '0',
      wid: '0',
      uid: '0',
      sid: '0',
      modeSwitch: '6',
      teenMode: '0',
      ui_mode: '2',
      nettype: '1020',
      v4ip: '',
    },
    req: {
      module: 'music.search.SearchCgiService',
      method: 'DoSearchForQQMusicMobile',
      param: {
        search_type: 0,
        query: keyword,
        page_num: page,
        num_per_page: limit,
        highlight: 0,
        nqc_flag: 0,
        multi_zhida: 0,
        cat: 2,
        grp: 1,
        sin: 0,
        sem: 0,
      },
    },
  })
}

function normalizeTxSearchResult(
  payload: unknown,
  page: number,
  limit: number
): BuiltinSongSearchResult {
  const root =
    payload && typeof payload === 'object'
      ? (payload as {
          req?: {
            data?: {
              body?: { item_song?: Array<Record<string, unknown>> }
              meta?: { estimate_sum?: number }
            }
          }
        })
      : undefined
  const body = root?.req?.data?.body
  const songs = Array.isArray(body?.item_song) ? body.item_song : []
  const total =
    typeof root?.req?.data?.meta?.estimate_sum === 'number'
      ? root.req.data.meta.estimate_sum
      : songs.length

  const list = songs.flatMap(song => {
    const id = parseIntegerId(song.id)
    const mid = typeof song.mid === 'string' ? song.mid.trim() : ''
    const file =
      song.file && typeof song.file === 'object'
        ? (song.file as Record<string, unknown>)
        : null
    const singer = Array.isArray(song.singer)
      ? song.singer.map(item =>
          item && typeof item === 'object' && typeof item.name === 'string'
            ? item.name
            : ''
        )
      : []
    const album =
      song.album && typeof song.album === 'object'
        ? (song.album as Record<string, unknown>)
        : null
    const albumMid = typeof album?.mid === 'string' ? album.mid : ''
    const coverUrl = albumMid
      ? `https://y.gtimg.cn/music/photo_new/T002R500x500M000${albumMid}.jpg`
      : ''

    if (!id || !mid) {
      return []
    }

    return [
      {
        id,
        name:
          `${typeof song.name === 'string' ? song.name : '未知歌曲'}${typeof song.title_extra === 'string' ? song.title_extra : ''}`.trim() ||
          '未知歌曲',
        artistNames: formatArtistNames(singer),
        albumName:
          typeof album?.name === 'string' && album.name.trim()
            ? album.name.trim()
            : '未知专辑',
        coverUrl: ensureCoverUrl(coverUrl),
        duration: formatDurationSeconds(song.interval),
        qualityLabel: resolveQualityLabel({
          has24bit:
            hasPositiveNumber(file?.size_hires) ||
            hasPositiveNumber(file?.size_flac24bit),
          hasSq: hasPositiveNumber(file?.size_flac),
          hasHq: hasPositiveNumber(file?.size_320mp3),
        }),
        fee: 0,
        lxInfo: {
          songmid: mid,
          strMediaMid:
            typeof file?.media_mid === 'string' ? file.media_mid : undefined,
          albumId: albumMid || undefined,
          source: 'tx',
          img: ensureCoverUrl(coverUrl),
        },
      },
    ]
  })

  return { source: 'tx', list, total, limit, page }
}

export const txBuiltinSearchProvider: BuiltinSongSearchProvider = {
  source: 'tx',
  async search(options: BuiltinSongSearchOptions) {
    const keyword = options.keyword.trim()
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const payload = await requestBuiltinSearchJson(
      'https://u.y.qq.com/cgi-bin/musicu.fcg',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'QQMusic 14090508(android 12)',
        },
        body: createTxSearchBody(keyword, page, limit),
      }
    )

    return normalizeTxSearchResult(payload, page, limit)
  },
}

export { createTxSearchBody, normalizeTxSearchResult }
