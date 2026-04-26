import type { LxSourceKey } from '../../../../shared/lx-music-source.ts'

export type BuiltinSearchSourceId = LxSourceKey

export type BuiltinSongSearchItem = {
  id: number
  name: string
  artistNames: string
  albumName: string
  coverUrl: string
  duration: number
  qualityLabel?: string
  fee: number
  lxInfo?: {
    songmid?: string | number
    hash?: string
    strMediaMid?: string
    copyrightId?: string
    albumId?: string | number
    source?: string
    img?: string
  }
}

export type BuiltinSongSearchResult = {
  source: BuiltinSearchSourceId
  list: BuiltinSongSearchItem[]
  total: number
  limit: number
  page: number
}

export type BuiltinSongSearchOptions = {
  keyword: string
  page?: number
  limit?: number
}

export type BuiltinSongSearchProvider = {
  source: BuiltinSearchSourceId
  search: (
    options: BuiltinSongSearchOptions
  ) => Promise<BuiltinSongSearchResult>
}
