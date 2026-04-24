export const LOCAL_LIBRARY_ENTITY_TYPES = [
  'songs',
  'albums',
  'artists',
] as const

export type LocalLibraryEntityType = (typeof LOCAL_LIBRARY_ENTITY_TYPES)[number]

export interface LocalLibraryTrackRecord {
  id: number
  rootId: number
  filePath: string
  fileName: string
  title: string
  artistName: string
  albumName: string
  durationMs: number
  lyricText: string
  translatedLyricText: string
  coverPath: string | null
  coverUrl: string
  fileSize: number
  mtimeMs: number
  audioFormat: string
  trackNo: number | null
  discNo: number | null
}

export interface LocalLibraryAlbumRecord {
  id: number
  name: string
  artistName: string
  trackCount: number
  coverUrl: string
}

export interface LocalLibraryArtistRecord {
  id: number
  name: string
  trackCount: number
  coverUrl: string
}

export interface LocalLibraryRootRecord {
  id: number
  path: string
  createdAt: number
}

export interface LocalLibraryOnlineLyricMatchInput {
  filePath: string
  title: string
  artistName: string
  albumName: string
  durationMs: number
  coverUrl: string
}

export interface LocalLibraryOnlineLyricMatchResult {
  lyricText: string
  translatedLyricText: string
  coverUrl: string
}

export type LocalLibraryTrackDeleteMode = 'library-only' | 'permanent'

export interface LocalLibraryTrackDeleteInput {
  filePath: string
  mode: LocalLibraryTrackDeleteMode
}

export interface LocalLibraryTrackDeleteResult {
  removed: boolean
}

export interface LocalLibraryStats {
  rootCount: number
  trackCount: number
  albumCount: number
  artistCount: number
  lastScannedAt: number | null
}

export interface LocalLibraryOverviewSnapshot {
  roots: LocalLibraryRootRecord[]
  stats: LocalLibraryStats
}

export interface LocalLibrarySnapshot {
  roots: LocalLibraryRootRecord[]
  stats: LocalLibraryStats
  tracks: LocalLibraryTrackRecord[]
  albums: LocalLibraryAlbumRecord[]
  artists: LocalLibraryArtistRecord[]
}

export interface LocalLibraryTrackQueryInput {
  keyword: string
  scopeType: 'all' | 'album' | 'artist'
  scopeValue: string | null
  scopeArtistName: string | null
  offset: number
  limit: number
}

export interface LocalLibraryTrackQueryResult {
  items: LocalLibraryTrackRecord[]
  total: number
  offset: number
  limit: number
}

export interface LocalLibraryAlbumQueryInput {
  keyword: string
  offset: number
  limit: number
}

export interface LocalLibraryAlbumQueryResult {
  items: LocalLibraryAlbumRecord[]
  total: number
  offset: number
  limit: number
}

export interface LocalLibraryArtistQueryInput {
  keyword: string
  offset: number
  limit: number
}

export interface LocalLibraryArtistQueryResult {
  items: LocalLibraryArtistRecord[]
  total: number
  offset: number
  limit: number
}

export interface LocalLibraryScanSummary {
  rootCount: number
  importedCount: number
  skippedCount: number
  lastScannedAt: number
}
