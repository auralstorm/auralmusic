import type { BuiltinSongSearchResult } from '@/services/music-source/builtin-search'
import type {
  RawArtist,
  RawSearchArtistItem,
  SearchSourceTab,
  SearchResultRowItem,
  SearchType,
} from './types'
import type { RawSearchResultPayload } from './types'

export type { SearchResultRowItem, SearchType } from './types'

export const SEARCH_TYPE_CODE_MAP: Record<SearchType, number> = {
  song: 1,
  album: 10,
  artist: 100,
  playlist: 1000,
  mv: 1004,
}

export const SEARCH_TYPE_LABEL_MAP: Record<SearchType, string> = {
  song: '单曲',
  album: '专辑',
  playlist: '歌单',
  artist: '歌手',
  mv: 'MV',
}

export function buildSearchResultTargetPath(
  type: SearchType,
  targetId: number
) {
  if (type === 'album') {
    return `/albums/${targetId}`
  }

  if (type === 'artist') {
    return `/artists/${targetId}`
  }

  if (type === 'playlist') {
    return `/playlist/${targetId}`
  }

  return null
}

function formatArtistNames(artists?: RawArtist[]) {
  return (
    artists
      ?.map(item => item.name?.trim() || '')
      .filter(Boolean)
      .join(' / ') || '未知歌手'
  )
}

function formatSearchArtistMeta(artist: RawSearchArtistItem) {
  const meta = [
    typeof artist.albumSize === 'number' ? `${artist.albumSize} 张专辑` : '',
    typeof artist.mvSize === 'number' ? `${artist.mvSize} 个 MV` : '',
  ].filter(Boolean)

  return meta.join(' · ') || '歌手'
}

function formatDurationLabel(duration: number | undefined) {
  if (!duration || !Number.isFinite(duration) || duration <= 0) {
    return ''
  }

  const totalSeconds = Math.floor(duration / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
}

function stringifyIdentityPart(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return ''
}

export function createSearchResultRowIdentity(item: SearchResultRowItem) {
  const lxInfo = item.playbackTrack?.lxInfo
  const source =
    item.searchSourceId ||
    item.playbackTrack?.lockedPlatform ||
    lxInfo?.source ||
    'system'
  const sourceIdentity =
    stringifyIdentityPart(lxInfo?.audioId) ||
    stringifyIdentityPart(lxInfo?.songId) ||
    stringifyIdentityPart(lxInfo?.songmid) ||
    stringifyIdentityPart(lxInfo?.copyrightId) ||
    stringifyIdentityPart(lxInfo?.hash) ||
    stringifyIdentityPart(item.targetId) ||
    stringifyIdentityPart(item.id)

  return `${item.type}:${source}:${sourceIdentity}`
}

export function normalizeBuiltinSearchResults(
  response: BuiltinSongSearchResult,
  sourceTab: SearchSourceTab
): SearchResultRowItem[] {
  return (response.list || []).flatMap(item => {
    if (!item.id) {
      return []
    }

    return [
      {
        id: item.id,
        type: 'song',
        name: item.name?.trim() || '未知歌曲',
        artistName: item.artistNames?.trim() || '未知歌手',
        coverUrl: item.coverUrl?.trim() || '',
        durationLabel: formatDurationLabel(item.duration),
        qualityLabel: item.qualityLabel?.trim() || '',
        targetId: item.id,
        disabled: false,
        searchSourceId: sourceTab.id,
        searchSourceName: sourceTab.name,
        playbackTrack: {
          id: item.id,
          name: item.name?.trim() || '未知歌曲',
          artistNames: item.artistNames?.trim() || '未知歌手',
          albumName: item.albumName?.trim() || '未知专辑',
          coverUrl: item.coverUrl?.trim() || '',
          duration: item.duration ?? 0,
          fee: typeof item.fee === 'number' ? item.fee : 0,
          lockedPlatform: sourceTab.id,
          lxInfo: item.lxInfo,
        },
      },
    ]
  })
}

export function normalizeSearchResults(
  response: unknown,
  type: SearchType
): SearchResultRowItem[] {
  const result =
    response && typeof response === 'object'
      ? ((response as RawSearchResultPayload).result ?? {})
      : {}

  if (type === 'song') {
    return (result.songs || []).flatMap(song => {
      if (!song.id) {
        return []
      }

      const artistName = formatArtistNames(song.ar)
      const coverUrl = song.al?.picUrl || ''

      return [
        {
          id: song.id,
          type,
          name: song.name || '未知歌曲',
          artistName,
          coverUrl,
          durationLabel: formatDurationLabel(song.dt),
          qualityLabel: '',
          targetId: song.id,
          disabled: false,
          playbackTrack: {
            id: song.id,
            name: song.name || '未知歌曲',
            artistNames: artistName,
            albumName: song.al?.name || '未知专辑',
            coverUrl,
            duration: song.dt || 0,
            fee: typeof song.fee === 'number' ? song.fee : 0,
            lockedPlatform: 'wy',
            lxInfo: {
              songmid: song.id,
              hash: String(song.id),
              strMediaMid: String(song.id),
              copyrightId: String(song.id),
              albumId:
                typeof song.al?.id === 'number' ||
                typeof song.al?.id === 'string'
                  ? song.al.id
                  : undefined,
              source: 'wy',
              img: coverUrl,
            },
          },
        },
      ]
    })
  }

  if (type === 'album') {
    return (result.albums || []).flatMap(album => {
      if (!album.id) {
        return []
      }

      return [
        {
          id: album.id,
          type,
          name: album.name || '未知专辑',
          artistName: album.artist?.name || formatArtistNames(album.artists),
          coverUrl: album.picUrl || '',
          durationLabel: '',
          qualityLabel: '',
          targetId: album.id,
          disabled: false,
          playbackTrack: null,
        },
      ]
    })
  }

  if (type === 'artist') {
    return (result.artists || []).flatMap(artist => {
      if (!artist.id) {
        return []
      }

      return [
        {
          id: artist.id,
          type,
          name: artist.name || '未知歌手',
          artistName: formatSearchArtistMeta(artist),
          coverUrl: artist.picUrl || artist.img1v1Url || '',
          durationLabel: '',
          qualityLabel: '',
          targetId: artist.id,
          disabled: false,
          playbackTrack: null,
        },
      ]
    })
  }

  if (type === 'playlist') {
    return (result.playlists || []).flatMap(playlist => {
      if (!playlist.id) {
        return []
      }

      return [
        {
          id: playlist.id,
          type,
          name: playlist.name || '未知歌单',
          artistName: playlist.creator?.nickname?.trim() || '网易云音乐',
          coverUrl: playlist.coverImgUrl || playlist.picUrl || '',
          durationLabel: '',
          qualityLabel: '',
          targetId: playlist.id,
          disabled: false,
          playbackTrack: null,
        },
      ]
    })
  }

  return (result.mvs || []).flatMap(mv => {
    if (!mv.id) {
      return []
    }

    return [
      {
        id: mv.id,
        type: 'mv',
        name: mv.name || '未知 MV',
        artistName: mv.artistName?.trim() || formatArtistNames(mv.artists),
        coverUrl: mv.cover || mv.coverUrl || mv.imgurl16v9 || '',
        durationLabel: '',
        qualityLabel: '',
        targetId: mv.id,
        disabled: false,
        playbackTrack: null,
      },
    ]
  })
}
