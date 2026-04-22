import type { AlbumListItem } from '@/pages/Albums/types'
import type {
  LibraryLikedPlaylistMeta,
  LibraryMvItem,
  LibraryPageData,
  LibraryPlaylistItem,
  LibrarySongItem,
  LibraryTabOption,
  PlaylistFilterOption,
  PlaylistSourceValue,
  RawAlbumItem,
  RawDailySong,
  RawDailySongArtist,
  RawLikeListResponse,
  RawMvItem,
  RawPlaylistItem,
  RawResponse,
} from './types'

function unwrapData<T>(response?: RawResponse<T> | null): T | undefined {
  if (!response) {
    return undefined
  }

  if (response.data && typeof response.data === 'object') {
    return unwrapData(response.data as RawResponse<T>)
  }

  return response as T
}

function resolveArray<T>(response: unknown, keys: string[]): T[] {
  const body = unwrapData(response as RawResponse<unknown>)

  if (Array.isArray(body)) {
    return body as T[]
  }

  if (!body || typeof body !== 'object') {
    return []
  }

  for (const key of keys) {
    const value = (body as Record<string, unknown>)[key]
    if (Array.isArray(value)) {
      return value as T[]
    }
  }

  return []
}

function formatArtistNames(artists?: RawDailySongArtist[]) {
  const artistNames =
    artists
      ?.map(artist => artist.name?.trim() || '')
      .filter(Boolean)
      .join(' / ') || ''

  return artistNames || '未知歌手'
}

function formatMVArtistNames(
  artistName?: string,
  artists?: Array<{ name?: string }>
) {
  if (artistName?.trim()) {
    return artistName.trim()
  }

  const joined =
    artists
      ?.map(artist => artist.name?.trim() || '')
      .filter(Boolean)
      .join(' / ') || ''

  return joined || '未知歌手'
}

export function formatLibraryDuration(duration: number) {
  const totalSeconds = Math.max(0, Math.floor(duration / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatLibraryPlayCount(playCount?: number) {
  if (!playCount) {
    return '0'
  }

  return new Intl.NumberFormat('zh-CN').format(playCount)
}

export function resolveLibraryLikedSongIds(response: unknown): number[] {
  const body = unwrapData(response as RawResponse<RawLikeListResponse>)

  if (!body || typeof body !== 'object') {
    return []
  }

  const ids = body.ids
  if (Array.isArray(ids)) {
    return ids.filter((id): id is number => Number.isFinite(id))
  }

  const idsData = body.idsData
  if (Array.isArray(idsData)) {
    return idsData.filter((id): id is number => Number.isFinite(id))
  }

  return []
}

export function resolveLibraryLikedPlaylist(
  response: unknown
): LibraryLikedPlaylistMeta | null {
  const body = unwrapData(response as RawResponse<unknown>)

  if (!body || typeof body !== 'object') {
    return null
  }

  const playlist = (body as { playlist?: RawPlaylistItem[] }).playlist?.find(
    item => item?.specialType === 5 || item?.name?.trim() === '我喜欢的音乐'
  )

  if (!playlist?.id) {
    return null
  }

  return {
    id: playlist.id,
    trackCount: playlist.trackCount || 0,
    coverImgUrl: playlist.coverImgUrl || playlist.picUrl || '',
  }
}

export function normalizeLibrarySongs(response: unknown): LibrarySongItem[] {
  return resolveArray<RawDailySong>(response, ['dailySongs', 'songs']).flatMap(
    song => {
      if (!song?.id) {
        return []
      }

      return [
        {
          id: song.id,
          name: song.name || '未知歌曲',
          artistNames: formatArtistNames(song.ar),
          albumName: song.al?.name || '未知专辑',
          coverUrl: song.al?.picUrl || '',
          duration: song.dt || 0,
        },
      ]
    }
  )
}

export const normalizeLibraryDailySongs = normalizeLibrarySongs

export function normalizeLibraryPlaylists(
  response: unknown
): LibraryPlaylistItem[] {
  return resolveArray<RawPlaylistItem>(response, [
    'result',
    'playlists',
  ]).flatMap(playlist => {
    if (!playlist?.id) {
      return []
    }

    return [
      {
        id: playlist.id,
        name: playlist.name || '未知歌单',
        coverUrl: playlist.coverImgUrl || playlist.picUrl || '',
        subtitle:
          playlist.copywriter?.trim() ||
          playlist.creator?.nickname?.trim() ||
          '网易云音乐推荐',
        trackCount: playlist.trackCount || 0,
        playCount: playlist.playCount || 0,
      },
    ]
  })
}

export function normalizeLibraryUserPlaylists(
  response: unknown,
  source: PlaylistSourceValue
): LibraryPlaylistItem[] {
  return resolveArray<RawPlaylistItem>(response, ['playlist'])
    .filter(playlist => {
      if (!playlist?.id) {
        return false
      }

      const isLikedPlaylist =
        playlist.specialType === 5 || playlist.name?.trim() === '我喜欢的音乐'

      if (isLikedPlaylist) {
        return false
      }

      if (source === 'my') {
        return playlist.subscribed !== true
      }

      return playlist.subscribed === true
    })
    .map(playlist => ({
      id: playlist.id!,
      name: playlist.name || '未知歌单',
      coverUrl: playlist.coverImgUrl || playlist.picUrl || '',
      subtitle:
        playlist.copywriter?.trim() ||
        playlist.creator?.nickname?.trim() ||
        '网易云音乐推荐',
      trackCount: playlist.trackCount || 0,
      playCount: playlist.playCount || 0,
    }))
}

export function normalizeLibraryAlbums(response: unknown): AlbumListItem[] {
  return resolveArray<RawAlbumItem>(response, ['albums']).flatMap(album => {
    if (!album?.id) {
      return []
    }

    return [
      {
        id: album.id,
        name: album.name || '未知专辑',
        picUrl: album.picUrl || album.blurPicUrl || '',
        blurPicUrl: album.blurPicUrl || album.picUrl || '',
        artists:
          album.artists?.map(artist => ({ name: artist.name || '未知歌手' })) ||
          undefined,
        artist: album.artist?.name
          ? { name: album.artist.name }
          : album.artists?.[0]?.name
            ? { name: album.artists[0].name || '未知歌手' }
            : undefined,
      },
    ]
  })
}

export function normalizeLibraryMvs(response: unknown): LibraryMvItem[] {
  return resolveArray<RawMvItem>(response, ['mvs', 'data']).flatMap(mv => {
    if (!mv?.id) {
      return []
    }

    return [
      {
        id: mv.id,
        name: mv.name || '未知 MV',
        coverUrl: mv.coverUrl || mv.cover || mv.imgurl16v9 || '',
        artistName: formatMVArtistNames(mv.artistName, mv.artists),
        playCount: mv.playCount || 0,
        publishTime: mv.publishTime,
      },
    ]
  })
}

export const LIBRARY_TAB_OPTIONS: LibraryTabOption[] = [
  { value: 'playlists', label: '全部歌单' },
  { value: 'albums', label: '专辑' },
  { value: 'artists', label: '艺人' },
  { value: 'mvs', label: 'MV' },
  { value: 'cloud', label: '云盘' },
]

export const PLAYLIST_FILTER_OPTIONS: PlaylistFilterOption[] = [
  { value: 'my', label: '我的歌单' },
  { value: 'subscribed', label: '收藏的歌单' },
]

export const EMPTY_LIBRARY_PAGE_DATA: LibraryPageData = {
  likedSongs: [],
  likedSongCount: 0,
  likedPlaylistId: null,
  likedPlaylistCoverUrl: '',
  playlists: [],
}
