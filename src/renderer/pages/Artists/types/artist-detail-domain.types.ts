export interface ArtistDetailProfile {
  id: number
  name: string
  coverUrl: string
  musicSize: number
  albumSize: number
  mvSize: number
  identity: string
}

export interface ArtistSongArtist {
  id?: number
  name: string
}

export interface ArtistTopSongItem {
  id: number
  name: string
  subtitle: string
  duration: number
  albumName: string
  coverUrl: string
  artists: ArtistSongArtist[]
  fee?: number
}

export interface ArtistAlbumItem {
  id: number
  name: string
  picUrl: string
  publishTime?: number
  size?: number
}

export interface ArtistMvItem {
  id: number
  name: string
  coverUrl: string
  publishTime?: string
  playCount?: number
}

export interface ArtistSimilarItem {
  id: number
  name: string
  picUrl: string
}

export interface ArtistDescSection {
  title: string
  content: string
}

export interface ArtistDescPayload {
  summary: string
  sections: ArtistDescSection[]
}

export interface ArtistLatestReleaseData {
  album: ArtistAlbumItem | null
  mv: ArtistMvItem | null
}

export interface ArtistDetailPageState {
  profile: ArtistDetailProfile | null
  topSongs: ArtistTopSongItem[]
  description: ArtistDescPayload
  similarArtists: ArtistSimilarItem[]
}

export interface ArtistDetailResponse<T> {
  data?: T | { data?: T }
}

export interface RawSimilarArtist {
  id?: number
  name?: string
  picUrl?: string
  img1v1Url?: string
}

export interface RawSimilarArtistsBody {
  artists?: RawSimilarArtist[]
  data?: RawSimilarArtistsBody
}
