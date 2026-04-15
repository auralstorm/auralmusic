import type { PlaybackTrack } from '../../../shared/playback.ts'

export type SearchType = 'song' | 'album' | 'playlist' | 'mv'

export interface SearchResultRowItem {
  id: number
  type: SearchType
  name: string
  artistName: string
  coverUrl: string
  targetId: number
  disabled: boolean
  playbackTrack: PlaybackTrack | null
}

interface RawArtist {
  name?: string
}

interface RawSongAlbum {
  name?: string
  picUrl?: string
}

interface RawSongItem {
  id?: number
  name?: string
  dt?: number
  ar?: RawArtist[]
  al?: RawSongAlbum
}

interface RawAlbumItem {
  id?: number
  name?: string
  picUrl?: string
  artist?: RawArtist
  artists?: RawArtist[]
}

interface RawPlaylistItem {
  id?: number
  name?: string
  coverImgUrl?: string
  picUrl?: string
  creator?: {
    nickname?: string
  }
}

interface RawMvItem {
  id?: number
  name?: string
  cover?: string
  coverUrl?: string
  imgurl16v9?: string
  artistName?: string
  artists?: RawArtist[]
}

interface RawSearchResultPayload {
  result?: {
    songs?: RawSongItem[]
    albums?: RawAlbumItem[]
    playlists?: RawPlaylistItem[]
    mvs?: RawMvItem[]
  }
}

export const SEARCH_TYPE_CODE_MAP: Record<SearchType, number> = {
  song: 1,
  album: 10,
  playlist: 1000,
  mv: 1004,
}

export const SEARCH_TYPE_LABEL_MAP: Record<SearchType, string> = {
  song: '单曲',
  album: '专辑',
  playlist: '歌单',
  mv: 'MV',
}

function formatArtistNames(artists?: RawArtist[]) {
  return (
    artists
      ?.map(item => item.name?.trim() || '')
      .filter(Boolean)
      .join(' / ') || '未知歌手'
  )
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
          targetId: song.id,
          disabled: false,
          playbackTrack: {
            id: song.id,
            name: song.name || '未知歌曲',
            artistNames: artistName,
            albumName: song.al?.name || '未知专辑',
            coverUrl,
            duration: song.dt || 0,
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
          targetId: album.id,
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
        targetId: mv.id,
        disabled: true,
        playbackTrack: null,
      },
    ]
  })
}
