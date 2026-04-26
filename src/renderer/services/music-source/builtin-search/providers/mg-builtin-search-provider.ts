import { createLxRuntimeMd5 } from '../../model/lx-runtime-utils.ts'
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
  parseIntegerId,
  resolveQualityLabelFromText,
} from '../builtin-search.utils.ts'

function createMgSignature(time: string, keyword: string) {
  const deviceId = '963B7AA0D21511ED807EE5846EC87D20'
  const signatureMd5 = '6cdc72a439cef99a3418d2a78aa28c73'
  const sign = createLxRuntimeMd5(
    `${keyword}${signatureMd5}yyapp2d16148780a1dcc7408e06336b98cfd50${deviceId}${time}`
  )
  return { sign, deviceId }
}

function normalizeMgSearchResult(
  payload: unknown,
  page: number,
  limit: number
): BuiltinSongSearchResult {
  const root =
    payload && typeof payload === 'object'
      ? (payload as {
          songResultData?: {
            resultList?: unknown[]
            totalCount?: number | string
          }
        })
      : undefined
  const rawGroups = Array.isArray(root?.songResultData?.resultList)
    ? root.songResultData.resultList
    : []
  const total =
    typeof root?.songResultData?.totalCount === 'number'
      ? root.songResultData.totalCount
      : typeof root?.songResultData?.totalCount === 'string'
        ? Number.parseInt(root.songResultData.totalCount, 10) || 0
        : 0
  const dedupe = new Set<string>()
  const list = rawGroups.flatMap(group => {
    if (!Array.isArray(group)) {
      return []
    }

    return group.flatMap(item => {
      if (!item || typeof item !== 'object') {
        return []
      }

      const data = item as Record<string, unknown>
      const id = parseIntegerId(data.songId)
      const copyrightId =
        typeof data.copyrightId === 'string' ? data.copyrightId.trim() : ''
      if (!id || !copyrightId || dedupe.has(copyrightId)) {
        return []
      }
      dedupe.add(copyrightId)

      const coverUrl =
        ensureCoverUrl(data.img3) ||
        ensureCoverUrl(data.img2) ||
        ensureCoverUrl(data.img1)
      return [
        {
          id,
          name:
            typeof data.name === 'string' && data.name.trim()
              ? data.name.trim()
              : '未知歌曲',
          artistNames: formatArtistNames(
            Array.isArray(data.singerList)
              ? data.singerList.map(singer =>
                  singer &&
                  typeof singer === 'object' &&
                  typeof singer.name === 'string'
                    ? singer.name
                    : ''
                )
              : []
          ),
          albumName:
            typeof data.album === 'string' && data.album.trim()
              ? data.album.trim()
              : '未知专辑',
          coverUrl,
          duration: formatDurationSeconds(data.duration),
          qualityLabel:
            resolveQualityLabelFromText(data.toneControl) ||
            resolveQualityLabelFromText(data.quality) ||
            resolveQualityLabelFromText(data.qualityType) ||
            resolveQualityLabelFromText(data.resourceType),
          fee: 0,
          lxInfo: {
            songmid: id,
            copyrightId,
            albumId:
              typeof data.albumId === 'string' ||
              typeof data.albumId === 'number'
                ? data.albumId
                : undefined,
            source: 'mg',
            img: coverUrl,
          },
        },
      ]
    })
  })

  return { source: 'mg', list, total: total || list.length, limit, page }
}

export const mgBuiltinSearchProvider: BuiltinSongSearchProvider = {
  source: 'mg',
  async search(options: BuiltinSongSearchOptions) {
    const keyword = options.keyword.trim()
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const time = Date.now().toString()
    const { sign, deviceId } = createMgSignature(time, keyword)
    const payload = await requestBuiltinSearchJson(
      `https://jadeite.migu.cn/music_search/v3/search/searchAll?isCorrect=0&isCopyright=1&searchSwitch=%7B%22song%22%3A1%2C%22album%22%3A0%2C%22singer%22%3A0%2C%22tagSong%22%3A1%2C%22mvSong%22%3A0%2C%22bestShow%22%3A1%2C%22songlist%22%3A0%2C%22lyricSong%22%3A0%7D&pageSize=${limit}&text=${encodeURIComponent(keyword)}&pageNo=${page}&sort=0&sid=USS`,
      {
        headers: {
          uiVersion: 'A_music_3.6.1',
          deviceId,
          timestamp: time,
          sign,
          channel: '0146921',
          'User-Agent':
            'Mozilla/5.0 (Linux; U; Android 11.0.0; zh-cn; MI 11 Build/OPR1.170623.032) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        },
      }
    )

    return normalizeMgSearchResult(payload, page, limit)
  },
}

export { normalizeMgSearchResult, createMgSignature }
