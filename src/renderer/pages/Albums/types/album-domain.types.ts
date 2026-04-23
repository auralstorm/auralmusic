export interface AlbumFilterOption<T> {
  label: string
  value: T
}

export type AlbumArea = 'ALL' | 'ZH' | 'EA' | 'KR' | 'JP'

export interface AlbumArtist {
  id?: number
  name: string
}

export interface AlbumListItem {
  id: number
  name: string
  picUrl: string
  blurPicUrl?: string
  artists?: AlbumArtist[]
  artist?: AlbumArtist
}

export interface NewAlbumsResponse {
  albums?: AlbumListItem[]
  total?: number
}
