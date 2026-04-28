export interface PlaylistPlaybackTracksRequest {
  id: number
  limit: number
  offset: number
  timestamp: number
}

export interface RawPlaylistPlaybackArtist {
  name?: string
}

export interface RawPlaylistPlaybackAlbum {
  name?: string
  picUrl?: string
}

export interface RawPlaylistPlaybackSong {
  id?: number
  name?: string
  fee?: number
  dt?: number
  al?: RawPlaylistPlaybackAlbum
  ar?: RawPlaylistPlaybackArtist[]
}

export interface RawPlaylistPlaybackTracksResponse {
  songs?: RawPlaylistPlaybackSong[]
}
