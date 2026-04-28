export interface DailySongRowItem {
  id: number
  name: string
  artistNames: string
  artists?: Array<{ id?: number; name: string }>
  albumName: string
  coverUrl: string
  duration: number
  fee?: number
}

export interface DailySongsPageState {
  songs: DailySongRowItem[]
}

export interface RawDailySongArtist {
  id?: number
  name?: string
}

export interface RawDailySongAlbum {
  name?: string
  picUrl?: string
}

export interface RawDailySong {
  id?: number
  name?: string
  fee?: number
  dt?: number
  al?: RawDailySongAlbum
  ar?: RawDailySongArtist[]
}

export interface RawRecommendSongsResponse {
  dailySongs?: RawDailySong[]
  data?: {
    dailySongs?: RawDailySong[]
  }
}
