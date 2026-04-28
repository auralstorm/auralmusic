import path from 'node:path'

import { resolveAppStoreDirectory } from '../storage/store-path.ts'
import type { LocalLibraryScanFormat } from '../../shared/config.ts'
import { createLocalLibraryDatabase } from './db.ts'
import {
  queryLocalLibraryPlaylistDetail,
  queryLocalLibraryPlaylists,
  getLocalLibraryOverview,
  getLocalLibrarySnapshot,
  queryLocalLibraryAlbums,
  queryLocalLibraryArtists,
  queryLocalLibraryTracks,
} from './queries.ts'
import { matchLocalLibraryTrackOnlineLyrics } from './local-library-online-lyric.service.ts'
import { removeLocalLibraryTrack } from './local-library-track-removal.service.ts'
import {
  createLocalLibraryScanContext,
  scanLocalLibraryRoots,
  type LocalLibraryScanContext,
} from './scanner.ts'

let localLibraryDatabase: ReturnType<typeof createLocalLibraryDatabase> | null =
  null
let activeScanPromise: Promise<
  Awaited<ReturnType<typeof scanLocalLibraryRoots>>
> | null = null

/** 本地曲库 SQLite 文件固定存放在 userData，避免扫描数据被项目目录清理影响。 */
function resolveLocalLibraryDbPath() {
  return path.join(resolveAppStoreDirectory(), 'aural-music-local-library.db')
}

/** 本地封面缓存独立于通用磁盘缓存，便于曲库数据和封面资源一起迁移/清理。 */
function resolveLocalLibraryCoverCacheDir() {
  return path.join(
    resolveAppStoreDirectory(),
    'aural-music-local-library-covers'
  )
}

/** 获取本地曲库数据库单例，避免重复打开 SQLite 连接。 */
export function getLocalLibraryDatabase() {
  if (!localLibraryDatabase) {
    localLibraryDatabase = createLocalLibraryDatabase({
      dbPath: resolveLocalLibraryDbPath(),
    })
  }

  return localLibraryDatabase
}

/** 创建默认扫描上下文，集中配置封面缓存目录等扫描依赖。 */
export function getDefaultLocalLibraryScanContext(): LocalLibraryScanContext {
  return createLocalLibraryScanContext({
    coverCacheDir: resolveLocalLibraryCoverCacheDir(),
  })
}

/** 同步本地曲库根目录配置到数据库。 */
export function syncLocalLibraryRoots(roots: string[]) {
  return getLocalLibraryDatabase().replaceRoots(roots)
}

/**
 * 执行本地曲库扫描。
 *
 * 扫描过程可能较重，同一时间只允许一个扫描任务运行；并发请求复用同一个 Promise。
 */
export async function runLocalLibraryScan(
  roots: string[],
  formats?: readonly LocalLibraryScanFormat[]
) {
  if (activeScanPromise) {
    // 复用正在执行的扫描，避免多个扫描同时写数据库造成锁竞争。
    return activeScanPromise
  }

  const scanPromise = scanLocalLibraryRoots({
    database: getLocalLibraryDatabase(),
    scanContext: getDefaultLocalLibraryScanContext(),
    roots,
    formats,
  }).finally(() => {
    activeScanPromise = null
  })

  activeScanPromise = scanPromise
  return scanPromise
}

/** 读取曲库完整快照。 */
export function readLocalLibrarySnapshot() {
  return getLocalLibrarySnapshot(getLocalLibraryDatabase())
}

/** 读取曲库概览统计。 */
export function readLocalLibraryOverview() {
  return getLocalLibraryOverview(getLocalLibraryDatabase())
}

/** 按输入条件查询本地歌曲。 */
export function queryLocalLibraryTracksByInput(
  input: Parameters<typeof queryLocalLibraryTracks>[1]
) {
  return queryLocalLibraryTracks(getLocalLibraryDatabase(), input)
}

/** 按输入条件查询本地专辑。 */
export function queryLocalLibraryAlbumsByInput(
  input: Parameters<typeof queryLocalLibraryAlbums>[1]
) {
  return queryLocalLibraryAlbums(getLocalLibraryDatabase(), input)
}

/** 按输入条件查询本地歌手。 */
export function queryLocalLibraryArtistsByInput(
  input: Parameters<typeof queryLocalLibraryArtists>[1]
) {
  return queryLocalLibraryArtists(getLocalLibraryDatabase(), input)
}

/** 按输入条件查询本地歌单。 */
export function queryLocalLibraryPlaylistsByInput(
  input: Parameters<typeof queryLocalLibraryPlaylists>[1]
) {
  return queryLocalLibraryPlaylists(getLocalLibraryDatabase(), input)
}

/** 查询本地歌单详情。 */
export function queryLocalLibraryPlaylistDetailByInput(
  input: Parameters<typeof queryLocalLibraryPlaylistDetail>[1]
) {
  return queryLocalLibraryPlaylistDetail(getLocalLibraryDatabase(), input)
}

/** 创建本地歌单。 */
export function createLocalLibraryPlaylist(
  input: Parameters<
    ReturnType<typeof getLocalLibraryDatabase>['createPlaylist']
  >[0]
) {
  return getLocalLibraryDatabase().createPlaylist(input)
}

/** 更新本地歌单。 */
export function updateLocalLibraryPlaylist(
  input: Parameters<
    ReturnType<typeof getLocalLibraryDatabase>['updatePlaylist']
  >[0]
) {
  return getLocalLibraryDatabase().updatePlaylist(input)
}

/** 删除本地歌单。 */
export function deleteLocalLibraryPlaylist(
  input: Parameters<
    ReturnType<typeof getLocalLibraryDatabase>['deletePlaylist']
  >[0]
) {
  return getLocalLibraryDatabase().deletePlaylist(input)
}

/** 添加歌曲到本地歌单。 */
export function addLocalLibraryTrackToPlaylist(
  input: Parameters<
    ReturnType<typeof getLocalLibraryDatabase>['addTrackToPlaylist']
  >[0]
) {
  return getLocalLibraryDatabase().addTrackToPlaylist(input)
}

/** 从本地歌单移除歌曲。 */
export function removeLocalLibraryTrackFromPlaylist(
  input: Parameters<
    ReturnType<typeof getLocalLibraryDatabase>['removeTrackFromPlaylist']
  >[0]
) {
  return getLocalLibraryDatabase().removeTrackFromPlaylist(input)
}

/** 删除本地曲库歌曲，必要时委托文件删除服务处理落盘文件。 */
export function deleteLocalLibraryTrack(
  input: Parameters<typeof removeLocalLibraryTrack>[0]
) {
  return removeLocalLibraryTrack(input, {
    database: getLocalLibraryDatabase(),
  })
}

/** 为本地歌曲匹配在线歌词/封面并写回曲库。 */
export function resolveLocalLibraryOnlineLyricMatch(
  input: Parameters<typeof matchLocalLibraryTrackOnlineLyrics>[0]
) {
  return matchLocalLibraryTrackOnlineLyrics(input, {
    database: getLocalLibraryDatabase(),
    coverCacheDir: resolveLocalLibraryCoverCacheDir(),
  })
}

export {
  createLocalLibraryDatabase,
  createLocalLibraryScanContext,
  getLocalLibraryOverview,
  getLocalLibrarySnapshot,
  queryLocalLibraryAlbums,
  queryLocalLibraryArtists,
  queryLocalLibraryPlaylistDetail,
  queryLocalLibraryPlaylists,
  queryLocalLibraryTracks,
  scanLocalLibraryRoots,
}
