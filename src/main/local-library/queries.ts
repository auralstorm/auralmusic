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

/** 查询本地曲库概览统计。 */
export function getLocalLibraryOverview(
  database: LocalLibraryDatabase
): LocalLibraryOverviewSnapshot {
  return database.getOverviewSnapshot()
}

/** 查询本地曲库根目录、最近扫描等快照数据。 */
export function getLocalLibrarySnapshot(
  database: LocalLibraryDatabase
): LocalLibrarySnapshot {
  return database.getSnapshot()
}

/** 查询本地歌曲分页列表。 */
export function queryLocalLibraryTracks(
  database: LocalLibraryDatabase,
  input: LocalLibraryTrackQueryInput
): LocalLibraryTrackQueryResult {
  return database.queryTracks(input)
}

/** 查询本地专辑分页列表。 */
export function queryLocalLibraryAlbums(
  database: LocalLibraryDatabase,
  input: LocalLibraryAlbumQueryInput
): LocalLibraryAlbumQueryResult {
  return database.queryAlbums(input)
}

/** 查询本地歌手分页列表。 */
export function queryLocalLibraryArtists(
  database: LocalLibraryDatabase,
  input: LocalLibraryArtistQueryInput
): LocalLibraryArtistQueryResult {
  return database.queryArtists(input)
}

/** 查询本地歌单分页列表。 */
export function queryLocalLibraryPlaylists(
  database: LocalLibraryDatabase,
  input: LocalLibraryPlaylistQueryInput
): LocalLibraryPlaylistQueryResult {
  return database.queryPlaylists(input)
}

/** 查询本地歌单详情及其歌曲列表。 */
export function queryLocalLibraryPlaylistDetail(
  database: LocalLibraryDatabase,
  input: LocalLibraryPlaylistDetailQueryInput
): LocalLibraryPlaylistDetailQueryResult {
  return database.queryPlaylistDetail(input)
}
