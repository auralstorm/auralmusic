export interface RawPlaylistItem {
  id?: number
  name?: string
  coverImgUrl?: string
  picUrl?: string
  trackCount?: number
  subscribed?: boolean
  specialType?: number
  creator?: {
    userId?: number
  }
}

export interface RawResponse<T> {
  data?: T
  [key: string]: unknown
}

export interface CollectPlaylistTarget {
  id: number
  name: string
  coverImgUrl: string
  trackCount: number
  specialType: number
  editable: boolean
  isLikedPlaylist: boolean
}

export interface CollectPlaylistSongContext {
  songId: number
  songName: string
  artistName: string
  coverUrl: string
}
