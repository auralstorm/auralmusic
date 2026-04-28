export interface ArtistSummary {
  id: number
  name: string
  picUrl: string
}

export interface AlbumSummary {
  id: number
  name: string
  picUrl: string
  artist: {
    id?: number
    name: string
  }
}

export interface RawArtist {
  id?: number
  name?: string
}

export interface RawAlbum {
  name?: string
  picUrl?: string
  artist?: RawArtist
}

export interface RawSongLike {
  id?: number
  name?: string
  fee?: number
  duration?: number
  dt?: number
  artists?: RawArtist[]
  ar?: RawArtist[]
  artist?: RawArtist
  album?: RawAlbum
  al?: RawAlbum
  picUrl?: string
}

export type HomeFmSong = RawSongLike

export type HomeDailySong = RawSongLike

export interface HomeNewSong {
  id?: number
  name?: string
  picUrl?: string
  artist?: RawArtist
  song?: RawSongLike
}

export type DailySong = HomeDailySong

export type HomeFmData = HomeFmSong

export type NewSong = HomeNewSong
