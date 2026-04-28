export interface RawArtistProfile {
  id?: number
  name?: string
  cover?: string
  avatar?: string
  picUrl?: string
  img1v1Url?: string
  musicSize?: number
  albumSize?: number
  mvSize?: number
  identifyTag?: string[]
}

export interface RawIdentify {
  imageDesc?: string
  identityName?: string
}

export interface RawArtistDetailPayload {
  artist?: RawArtistProfile
  identify?: RawIdentify
}

export interface RawSongArtist {
  id?: number
  name?: string
}

export interface RawSongAlbum {
  name?: string
  picUrl?: string
}

export interface RawTopSong {
  id: number
  name?: string
  fee?: number
  alia?: string[]
  tns?: string[]
  dt?: number
  al?: RawSongAlbum
  album?: RawSongAlbum
  ar?: RawSongArtist[]
}

export interface RawArtistSongsPayload {
  songs?: RawTopSong[]
  more?: boolean
  total?: number
}

export interface RawArtistAlbum {
  id: number
  name?: string
  picUrl?: string
  blurPicUrl?: string
  publishTime?: number
  size?: number
}

export interface RawArtistMv {
  id?: number
  vid?: number
  name?: string
  imgurl16v9?: string
  cover?: string
  publishTime?: string
  playCount?: number
}

export interface RawDescSection {
  ti?: string
  txt?: string
}

export interface RawArtistDescResponse {
  briefDesc?: string
  introduction?: RawDescSection[]
}
