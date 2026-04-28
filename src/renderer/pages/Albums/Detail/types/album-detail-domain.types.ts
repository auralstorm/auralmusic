export interface AlbumDetailHeroData {
  id: number
  name: string
  coverUrl: string
  artistNames: string
  publishTime?: number
  trackCount: number
  description: string
}

export interface AlbumTrackItem {
  id: number
  name: string
  artistNames: string
  artists?: Array<{ id?: number; name: string }>
  albumName: string
  duration: number
  coverUrl: string
  fee?: number
}

export interface AlbumDetailPageState {
  hero: AlbumDetailHeroData | null
  tracks: AlbumTrackItem[]
}

export interface RawAlbumArtist {
  name?: string
}

export interface RawAlbumDetail {
  id?: number
  name?: string
  picUrl?: string
  publishTime?: number
  description?: string
  size?: number
  artists?: RawAlbumArtist[]
  artist?: RawAlbumArtist
}

export interface RawAlbumDetailResponse {
  album?: RawAlbumDetail
}

export interface RawTrackArtist {
  id?: number
  name?: string
}

export interface RawTrackAlbum {
  name?: string
  picUrl?: string
}

export interface RawAlbumTrack {
  id: number
  name?: string
  fee?: number
  dt?: number
  al?: RawTrackAlbum
  ar?: RawTrackArtist[]
}

export interface RawAlbumTracksResponse extends RawAlbumDetailResponse {
  songs?: RawAlbumTrack[]
}

export interface NormalizeAlbumTracksOptions {
  fallbackCoverUrl?: string
}
