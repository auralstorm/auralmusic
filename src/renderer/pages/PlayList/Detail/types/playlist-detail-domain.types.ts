export interface PlaylistDetailHeroData {
  id: number
  name: string
  coverUrl: string
  creatorName: string
  creatorUserId: number | null
  description: string
  updateTime?: number
  trackCount: number
  isSubscribed: boolean
}

export interface PlaylistTrackItem {
  id: number
  name: string
  artistNames: string
  artists?: Array<{ id?: number; name: string }>
  albumName: string
  duration: number
  coverUrl: string
  fee?: number
}

export interface PlaylistDetailPageState {
  hero: PlaylistDetailHeroData | null
  tracks: PlaylistTrackItem[]
}

export interface RawPlaylistCreator {
  nickname?: string
  userId?: number
}

export interface RawPlaylistDetail {
  id?: number
  name?: string
  coverImgUrl?: string
  description?: string
  updateTime?: number
  trackCount?: number
  subscribed?: boolean
  creator?: RawPlaylistCreator
}

export interface RawPlaylistDetailResponse {
  playlist?: RawPlaylistDetail
}

export interface RawTrackArtist {
  id?: number
  name?: string
}

export interface RawTrackAlbum {
  name?: string
  picUrl?: string
}

export interface RawPlaylistTrack {
  id: number
  name?: string
  fee?: number
  dt?: number
  al?: RawTrackAlbum
  ar?: RawTrackArtist[]
}

export interface RawPlaylistTracksResponse {
  songs?: RawPlaylistTrack[]
}
