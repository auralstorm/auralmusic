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

function resolveLocalLibraryDbPath() {
  return path.join(resolveAppStoreDirectory(), 'aural-music-local-library.db')
}

function resolveLocalLibraryCoverCacheDir() {
  return path.join(
    resolveAppStoreDirectory(),
    'aural-music-local-library-covers'
  )
}

export function getLocalLibraryDatabase() {
  if (!localLibraryDatabase) {
    localLibraryDatabase = createLocalLibraryDatabase({
      dbPath: resolveLocalLibraryDbPath(),
    })
  }

  return localLibraryDatabase
}

export function getDefaultLocalLibraryScanContext(): LocalLibraryScanContext {
  return createLocalLibraryScanContext({
    coverCacheDir: resolveLocalLibraryCoverCacheDir(),
  })
}

export function syncLocalLibraryRoots(roots: string[]) {
  return getLocalLibraryDatabase().replaceRoots(roots)
}

export async function runLocalLibraryScan(
  roots: string[],
  formats?: readonly LocalLibraryScanFormat[]
) {
  if (activeScanPromise) {
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

export function readLocalLibrarySnapshot() {
  return getLocalLibrarySnapshot(getLocalLibraryDatabase())
}

export function readLocalLibraryOverview() {
  return getLocalLibraryOverview(getLocalLibraryDatabase())
}

export function queryLocalLibraryTracksByInput(
  input: Parameters<typeof queryLocalLibraryTracks>[1]
) {
  return queryLocalLibraryTracks(getLocalLibraryDatabase(), input)
}

export function queryLocalLibraryAlbumsByInput(
  input: Parameters<typeof queryLocalLibraryAlbums>[1]
) {
  return queryLocalLibraryAlbums(getLocalLibraryDatabase(), input)
}

export function queryLocalLibraryArtistsByInput(
  input: Parameters<typeof queryLocalLibraryArtists>[1]
) {
  return queryLocalLibraryArtists(getLocalLibraryDatabase(), input)
}

export function queryLocalLibraryPlaylistsByInput(
  input: Parameters<typeof queryLocalLibraryPlaylists>[1]
) {
  return queryLocalLibraryPlaylists(getLocalLibraryDatabase(), input)
}

export function queryLocalLibraryPlaylistDetailByInput(
  input: Parameters<typeof queryLocalLibraryPlaylistDetail>[1]
) {
  return queryLocalLibraryPlaylistDetail(getLocalLibraryDatabase(), input)
}

export function createLocalLibraryPlaylist(
  input: Parameters<
    ReturnType<typeof getLocalLibraryDatabase>['createPlaylist']
  >[0]
) {
  return getLocalLibraryDatabase().createPlaylist(input)
}

export function updateLocalLibraryPlaylist(
  input: Parameters<
    ReturnType<typeof getLocalLibraryDatabase>['updatePlaylist']
  >[0]
) {
  return getLocalLibraryDatabase().updatePlaylist(input)
}

export function deleteLocalLibraryPlaylist(
  input: Parameters<
    ReturnType<typeof getLocalLibraryDatabase>['deletePlaylist']
  >[0]
) {
  return getLocalLibraryDatabase().deletePlaylist(input)
}

export function addLocalLibraryTrackToPlaylist(
  input: Parameters<
    ReturnType<typeof getLocalLibraryDatabase>['addTrackToPlaylist']
  >[0]
) {
  return getLocalLibraryDatabase().addTrackToPlaylist(input)
}

export function removeLocalLibraryTrackFromPlaylist(
  input: Parameters<
    ReturnType<typeof getLocalLibraryDatabase>['removeTrackFromPlaylist']
  >[0]
) {
  return getLocalLibraryDatabase().removeTrackFromPlaylist(input)
}

export function deleteLocalLibraryTrack(
  input: Parameters<typeof removeLocalLibraryTrack>[0]
) {
  return removeLocalLibraryTrack(input, {
    database: getLocalLibraryDatabase(),
  })
}

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
