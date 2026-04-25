import type {
  LocalLibraryAlbumQueryInput,
  LocalLibraryAlbumQueryResult,
  LocalLibraryArtistQueryInput,
  LocalLibraryArtistQueryResult,
  LocalLibraryOverviewSnapshot,
  LocalLibraryPlaylistDetailQueryInput,
  LocalLibraryPlaylistDetailQueryResult,
  LocalLibraryPlaylistQueryInput,
  LocalLibraryPlaylistQueryResult,
  LocalLibrarySnapshot,
  LocalLibraryTrackQueryInput,
  LocalLibraryTrackQueryResult,
} from '../../shared/local-library.ts'
import type { LocalLibraryDatabase } from './db.ts'

export function getLocalLibraryOverview(
  database: LocalLibraryDatabase
): LocalLibraryOverviewSnapshot {
  return database.getOverviewSnapshot()
}

export function getLocalLibrarySnapshot(
  database: LocalLibraryDatabase
): LocalLibrarySnapshot {
  return database.getSnapshot()
}

export function queryLocalLibraryTracks(
  database: LocalLibraryDatabase,
  input: LocalLibraryTrackQueryInput
): LocalLibraryTrackQueryResult {
  return database.queryTracks(input)
}

export function queryLocalLibraryAlbums(
  database: LocalLibraryDatabase,
  input: LocalLibraryAlbumQueryInput
): LocalLibraryAlbumQueryResult {
  return database.queryAlbums(input)
}

export function queryLocalLibraryArtists(
  database: LocalLibraryDatabase,
  input: LocalLibraryArtistQueryInput
): LocalLibraryArtistQueryResult {
  return database.queryArtists(input)
}

export function queryLocalLibraryPlaylists(
  database: LocalLibraryDatabase,
  input: LocalLibraryPlaylistQueryInput
): LocalLibraryPlaylistQueryResult {
  return database.queryPlaylists(input)
}

export function queryLocalLibraryPlaylistDetail(
  database: LocalLibraryDatabase,
  input: LocalLibraryPlaylistDetailQueryInput
): LocalLibraryPlaylistDetailQueryResult {
  return database.queryPlaylistDetail(input)
}
