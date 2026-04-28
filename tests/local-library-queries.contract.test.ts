import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LOCAL_LIBRARY_ENTITY_TYPES,
  type LocalLibraryOverviewSnapshot,
  type LocalLibraryPlaylistDetailQueryInput,
  type LocalLibraryPlaylistDetailQueryResult,
  type LocalLibraryPlaylistQueryInput,
  type LocalLibraryPlaylistQueryResult,
  type LocalLibraryTrackQueryInput,
  type LocalLibraryTrackQueryResult,
} from '../src/shared/local-library.ts'
import { LOCAL_LIBRARY_IPC_CHANNELS } from '../src/shared/ipc/local-library.ts'

test('local library shared contracts expose overview-only snapshot and paged query channels', () => {
  const overview: LocalLibraryOverviewSnapshot = {
    roots: [],
    stats: {
      rootCount: 0,
      trackCount: 0,
      albumCount: 0,
      artistCount: 0,
      lastScannedAt: null,
    },
  }

  const trackQuery: LocalLibraryTrackQueryInput = {
    keyword: '',
    scopeType: 'all',
    scopeValue: null,
    scopeArtistName: null,
    offset: 0,
    limit: 50,
  }

  const trackResult: LocalLibraryTrackQueryResult = {
    items: [],
    total: 0,
    offset: 0,
    limit: 50,
  }
  const playlistQuery: LocalLibraryPlaylistQueryInput = {
    keyword: '',
    trackFilePath: null,
    offset: 0,
    limit: 24,
  }
  const playlistResult: LocalLibraryPlaylistQueryResult = {
    items: [],
    total: 0,
    offset: 0,
    limit: 24,
  }
  const playlistDetailQuery: LocalLibraryPlaylistDetailQueryInput = {
    playlistId: 1,
    keyword: '',
    offset: 0,
    limit: 80,
  }
  const playlistDetailResult: LocalLibraryPlaylistDetailQueryResult = {
    playlist: null,
    items: [],
    total: 0,
    offset: 0,
    limit: 80,
  }

  assert.deepEqual(LOCAL_LIBRARY_ENTITY_TYPES, [
    'songs',
    'albums',
    'artists',
    'playlists',
  ])
  assert.equal(overview.stats.trackCount, 0)
  assert.equal(trackQuery.limit, 50)
  assert.equal(trackResult.total, 0)
  assert.equal(playlistQuery.limit, 24)
  assert.equal(playlistResult.total, 0)
  assert.equal(playlistDetailQuery.playlistId, 1)
  assert.equal(playlistDetailResult.total, 0)
  assert.equal(
    LOCAL_LIBRARY_IPC_CHANNELS.GET_OVERVIEW,
    'local-library:get-overview'
  )
  assert.equal(
    LOCAL_LIBRARY_IPC_CHANNELS.QUERY_TRACKS,
    'local-library:query-tracks'
  )
  assert.equal(
    LOCAL_LIBRARY_IPC_CHANNELS.QUERY_ALBUMS,
    'local-library:query-albums'
  )
  assert.equal(
    LOCAL_LIBRARY_IPC_CHANNELS.QUERY_ARTISTS,
    'local-library:query-artists'
  )
  assert.equal(
    LOCAL_LIBRARY_IPC_CHANNELS.QUERY_PLAYLISTS,
    'local-library:query-playlists'
  )
  assert.equal(
    LOCAL_LIBRARY_IPC_CHANNELS.GET_PLAYLIST_DETAIL,
    'local-library:get-playlist-detail'
  )
})
