import type { AlbumListItem } from '@/pages/Albums/types'

export type LibraryTabValue =
  | 'playlists'
  | 'albums'
  | 'artists'
  | 'mvs'
  | 'cloud'

export type PlaylistSourceValue = 'my' | 'subscribed'

export interface LibrarySongItem {
  id: number
  name: string
  artistNames: string
  albumName: string
  coverUrl: string
  duration: number
}

export interface LibraryPlaylistItem {
  id: number
  name: string
  coverUrl: string
  subtitle: string
  trackCount: number
  playCount: number
}

export interface LibraryMvItem {
  id: number
  name: string
  coverUrl: string
  artistName: string
  playCount: number
  publishTime?: number
}

export interface LibraryPageData {
  likedSongs: LibrarySongItem[]
  likedSongCount: number
  likedPlaylistId: number | null
  likedPlaylistCoverUrl: string
  playlists: LibraryPlaylistItem[]
}

export interface LibraryLikedPlaylistMeta {
  id: number
  trackCount: number
  coverImgUrl: string
}

export interface LibraryTabOption {
  value: LibraryTabValue
  label: string
}

export interface PlaylistFilterOption {
  value: PlaylistSourceValue
  label: string
}

export interface RawDailySongArtist {
  name?: string
}

export interface RawDailySongAlbum {
  name?: string
  picUrl?: string
}

export interface RawDailySong {
  id?: number
  name?: string
  dt?: number
  al?: RawDailySongAlbum
  ar?: RawDailySongArtist[]
}

export interface RawPlaylistItem {
  id?: number
  name?: string
  coverImgUrl?: string
  picUrl?: string
  trackCount?: number
  playCount?: number
  subscribed?: boolean
  specialType?: number
  creator?: {
    nickname?: string
  }
  copywriter?: string
}

export interface RawAlbumItem {
  id?: number
  name?: string
  picUrl?: string
  blurPicUrl?: string
  artists?: Array<{ name?: string }>
  artist?: { name?: string }
}

export interface RawMvItem {
  id?: number
  name?: string
  cover?: string
  coverUrl?: string
  imgurl16v9?: string
  artistName?: string
  artists?: Array<{ name?: string }>
  playCount?: number
  publishTime?: number
}

export interface RawLikeListResponse {
  ids?: number[]
  idsData?: number[]
  data?: RawLikeListResponse
}

export interface RawResponse<T> {
  data?: T
  [key: string]: unknown
}

export interface RawLibraryAlbumArtist {
  name?: string
}

export interface RawLibraryAlbumItem {
  id?: number
  name?: string
  picUrl?: string
  blurPicUrl?: string
  artists?: RawLibraryAlbumArtist[]
  artist?: RawLibraryAlbumArtist
}

export interface RawSubscribedAlbumsBody {
  data?: RawSubscribedAlbumsBody | RawLibraryAlbumItem[]
  albums?: RawLibraryAlbumItem[]
  more?: boolean
  hasMore?: boolean
  count?: number
}

export interface NormalizeLibraryAlbumPageOptions {
  limit: number
  offset: number
}

export interface LibraryAlbumPage {
  list: AlbumListItem[]
  hasMore: boolean
}

export interface RawArtistItem {
  id?: number
  name?: string
  picUrl?: string
  img1v1Url?: string
  alias?: string[]
  albumSize?: number
  musicSize?: number
}

export interface RawSubscribedArtistsBody {
  artists?: RawArtistItem[]
  more?: boolean
  hasMore?: boolean
  count?: number
  data?: RawSubscribedArtistsBody | RawArtistItem[]
}

export interface NormalizeLibraryArtistPageOptions {
  limit: number
  offset: number
}

export interface LibraryArtistPage {
  list: import('../../Artists/types').ArtistListItem[]
  hasMore: boolean
}

export interface RawMvArtist {
  name?: string
}

export interface RawMvCreator {
  userName?: string
  nickname?: string
}

export interface RawLibraryMvItem {
  id?: number
  vid?: number | string
  name?: string
  title?: string
  cover?: string
  coverUrl?: string
  imgurl16v9?: string
  artistName?: string
  artists?: RawMvArtist[]
  creator?: RawMvCreator[]
  playCount?: number
  publishTime?: number
}

export interface RawSubscribedMvsBody {
  data?: RawSubscribedMvsBody | RawLibraryMvItem[]
  mvs?: RawLibraryMvItem[]
  more?: boolean
  hasMore?: boolean
  count?: number
}

export interface NormalizeLibraryMvPageOptions {
  limit: number
  offset: number
}

export interface LibraryMvPage {
  list: LibraryMvItem[]
  hasMore: boolean
}

export interface RawCloudArtist {
  name?: string
}

export interface RawCloudAlbum {
  name?: string
  picUrl?: string
  coverUrl?: string
}

export interface RawCloudSimpleSong {
  id?: number
  name?: string
  dt?: number
  ar?: RawCloudArtist[]
  al?: RawCloudAlbum
}

export interface RawCloudItem {
  id?: number
  songId?: number
  name?: string
  songName?: string
  fileName?: string
  artist?: string
  artistName?: string
  album?: string
  albumName?: string
  cover?: string
  coverUrl?: string
  duration?: number
  dt?: number
  simpleSong?: RawCloudSimpleSong
}

export interface RawLibraryCloudBody {
  data?: RawLibraryCloudBody | RawCloudItem[]
  more?: boolean
  hasMore?: boolean
  count?: number
}

export interface NormalizeLibraryCloudPageOptions {
  limit: number
  offset: number
}

export interface LibraryCloudPage {
  list: import('../../DailySongs/types').DailySongRowItem[]
  hasMore: boolean
}
