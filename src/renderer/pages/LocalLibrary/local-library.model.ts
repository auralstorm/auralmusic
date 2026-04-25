import type {
  LocalLibraryAlbumQueryInput,
  LocalLibraryArtistQueryInput,
  LocalLibraryEntityType,
  LocalLibraryOverviewSnapshot,
  LocalLibraryPlaylistDetailQueryInput,
  LocalLibraryPlaylistQueryInput,
  LocalLibraryTrackQueryInput,
} from '../../../shared/local-library.ts'

export interface LocalLibrarySongScope {
  type: 'all' | 'album' | 'artist'
  key: number | null
  value: string | null
  artistName: string | null
}

export interface LocalLibraryPagedState<T> {
  items: T[]
  total: number
  offset: number
  limit: number
  isLoading: boolean
  hasLoaded: boolean
}

export const DEFAULT_LOCAL_LIBRARY_TRACK_QUERY_LIMIT = 80
export const DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT = 120
export const DEFAULT_LOCAL_LIBRARY_PLAYLIST_TRACK_QUERY_LIMIT = 120

export const EMPTY_LOCAL_LIBRARY_SONG_SCOPE: LocalLibrarySongScope = {
  type: 'all',
  key: null,
  value: null,
  artistName: null,
}

export const EMPTY_LOCAL_LIBRARY_OVERVIEW: LocalLibraryOverviewSnapshot = {
  roots: [],
  stats: {
    rootCount: 0,
    trackCount: 0,
    albumCount: 0,
    artistCount: 0,
    lastScannedAt: null,
  },
}

export function createEmptyLocalLibraryPagedState<T>(
  limit: number
): LocalLibraryPagedState<T> {
  return {
    items: [],
    total: 0,
    offset: 0,
    limit,
    isLoading: false,
    hasLoaded: false,
  }
}

export function buildLocalLibraryTrackQueryInput(
  keyword: string,
  scope: LocalLibrarySongScope,
  offset: number,
  limit: number
): LocalLibraryTrackQueryInput {
  return {
    keyword,
    scopeType: scope.type,
    scopeValue: scope.value,
    scopeArtistName: scope.artistName,
    offset,
    limit,
  }
}

export function buildLocalLibraryAlbumQueryInput(
  keyword: string,
  offset: number,
  limit: number
): LocalLibraryAlbumQueryInput {
  return {
    keyword,
    offset,
    limit,
  }
}

export function buildLocalLibraryArtistQueryInput(
  keyword: string,
  offset: number,
  limit: number
): LocalLibraryArtistQueryInput {
  return {
    keyword,
    offset,
    limit,
  }
}

export function buildLocalLibraryPlaylistQueryInput(
  keyword: string,
  trackFilePath: string | null,
  offset: number,
  limit: number
): LocalLibraryPlaylistQueryInput {
  return {
    keyword,
    trackFilePath,
    offset,
    limit,
  }
}

export function buildLocalLibraryPlaylistDetailQueryInput(
  playlistId: number,
  keyword: string,
  offset: number,
  limit: number
): LocalLibraryPlaylistDetailQueryInput {
  return {
    playlistId,
    keyword,
    offset,
    limit,
  }
}

export function getLocalLibraryEmptyState(
  overview: LocalLibraryOverviewSnapshot,
  configuredRootCount: number
): 'missing-roots' | 'not-scanned' | 'empty-library' | null {
  if (configuredRootCount === 0) {
    return 'missing-roots'
  }

  if (overview.stats.lastScannedAt === null) {
    return 'not-scanned'
  }

  if (overview.stats.trackCount === 0) {
    return 'empty-library'
  }

  return null
}

export function getLocalLibrarySearchPlaceholder(
  entityType: LocalLibraryEntityType
) {
  if (entityType === 'albums') {
    return '搜索专辑或歌手'
  }

  if (entityType === 'artists') {
    return '搜索歌手'
  }

  if (entityType === 'playlists') {
    return '搜索歌单'
  }

  return '搜索歌曲、歌手或专辑'
}
