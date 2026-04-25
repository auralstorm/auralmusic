import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { LOCAL_LIBRARY_IPC_CHANNELS } from '../src/shared/ipc/local-library.ts'

const preloadSource = readFileSync(
  new URL('../src/preload/api/local-library-api.ts', import.meta.url),
  'utf8'
)

const mainIndexSource = readFileSync(
  new URL('../src/main/local-library/index.ts', import.meta.url),
  'utf8'
)

const mainIpcSource = readFileSync(
  new URL('../src/main/ipc/local-library-ipc.ts', import.meta.url),
  'utf8'
)

test('local library query ipc is wired across shared, preload, and main layers', () => {
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
  assert.equal(
    LOCAL_LIBRARY_IPC_CHANNELS.REVEAL_TRACK,
    'local-library:reveal-track'
  )

  assert.match(preloadSource, /getOverview:\s*async\s*\(\)\s*=>/)
  assert.match(preloadSource, /queryTracks:\s*async\s+input\s*=>/)
  assert.match(preloadSource, /queryAlbums:\s*async\s+input\s*=>/)
  assert.match(preloadSource, /queryArtists:\s*async\s+input\s*=>/)
  assert.match(preloadSource, /queryPlaylists:\s*async\s+input\s*=>/)
  assert.match(preloadSource, /getPlaylistDetail:\s*async\s+input\s*=>/)
  assert.match(preloadSource, /createPlaylist:\s*async\s+input\s*=>/)
  assert.match(preloadSource, /addTrackToPlaylist:\s*async\s+input\s*=>/)
  assert.match(preloadSource, /revealTrack:\s*async\s+filePath\s*=>/)

  assert.match(mainIndexSource, /readLocalLibraryOverview\(\)/)
  assert.match(mainIndexSource, /queryLocalLibraryTracksByInput\(/)
  assert.match(mainIndexSource, /queryLocalLibraryAlbumsByInput\(/)
  assert.match(mainIndexSource, /queryLocalLibraryArtistsByInput\(/)
  assert.match(mainIndexSource, /queryLocalLibraryPlaylistsByInput\(/)
  assert.match(mainIndexSource, /queryLocalLibraryPlaylistDetailByInput\(/)
  assert.match(mainIndexSource, /createLocalLibraryPlaylist\(/)
  assert.match(mainIndexSource, /addLocalLibraryTrackToPlaylist\(/)

  assert.match(mainIpcSource, /LOCAL_LIBRARY_IPC_CHANNELS\.GET_OVERVIEW/)
  assert.match(mainIpcSource, /LOCAL_LIBRARY_IPC_CHANNELS\.QUERY_TRACKS/)
  assert.match(mainIpcSource, /LOCAL_LIBRARY_IPC_CHANNELS\.QUERY_ALBUMS/)
  assert.match(mainIpcSource, /LOCAL_LIBRARY_IPC_CHANNELS\.QUERY_ARTISTS/)
  assert.match(mainIpcSource, /LOCAL_LIBRARY_IPC_CHANNELS\.QUERY_PLAYLISTS/)
  assert.match(mainIpcSource, /LOCAL_LIBRARY_IPC_CHANNELS\.GET_PLAYLIST_DETAIL/)
  assert.match(mainIpcSource, /LOCAL_LIBRARY_IPC_CHANNELS\.CREATE_PLAYLIST/)
  assert.match(
    mainIpcSource,
    /LOCAL_LIBRARY_IPC_CHANNELS\.ADD_TRACK_TO_PLAYLIST/
  )
  assert.match(mainIpcSource, /LOCAL_LIBRARY_IPC_CHANNELS\.REVEAL_TRACK/)
})
