import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const pageSource = readFileSync(
  new URL('../src/renderer/pages/LocalLibrary/index.tsx', import.meta.url),
  'utf8'
)

const querySource = readFileSync(
  new URL(
    '../src/renderer/pages/LocalLibrary/local-library-queries.ts',
    import.meta.url
  ),
  'utf8'
)

test('local library page reads overview and entity queries instead of snapshot filtering', () => {
  assert.match(pageSource, /localLibraryApi\.getOverview\(\)/)
  assert.match(querySource, /localLibraryApi\.queryTracks\(/)
  assert.match(querySource, /localLibraryApi\.queryAlbums\(/)
  assert.match(querySource, /localLibraryApi\.queryArtists\(/)
  assert.match(querySource, /localLibraryApi\.queryPlaylists\(/)
  assert.match(querySource, /localLibraryApi\.getPlaylistDetail\(/)

  assert.doesNotMatch(pageSource, /filterLocalLibraryTracks/)
  assert.doesNotMatch(pageSource, /filterLocalLibraryAlbums/)
  assert.doesNotMatch(pageSource, /filterLocalLibraryArtists/)
  assert.doesNotMatch(pageSource, /localLibraryApi\.getSnapshot\(\)/)
})

test('local library page refreshes overview and the active query after scan or deletion', () => {
  assert.match(
    pageSource,
    /await loadOverview\(\)\s*await refreshActiveQuery\(\)/
  )
})

test('local library songs query uses a ref-backed state snapshot to avoid self-trigger loops', () => {
  assert.match(pageSource, /useDebouncedValue/)
  assert.match(
    pageSource,
    /const debouncedKeyword = useDebouncedValue\(keyword/
  )
  assert.match(
    pageSource,
    /buildLocalLibraryTrackQueryInput\(\s*debouncedKeyword,/s
  )
  assert.match(pageSource, /queryAllAlbumPages\(\s*debouncedKeyword,/s)
  assert.match(pageSource, /queryAllArtistPages\(\s*debouncedKeyword,/s)
  assert.match(pageSource, /queryAllPlaylistPages\(\s*debouncedKeyword,/s)
  assert.match(
    pageSource,
    /tabContentMinHeightClass = 'min-h-\[520px\] md:min-h-\[560px\]'/
  )
  assert.match(pageSource, /const tracksStateRef = useRef\(tracksState\)/)
  assert.match(pageSource, /tracksStateRef\.current = tracksState/)
  assert.match(pageSource, /const currentTracksState = tracksStateRef\.current/)
  assert.doesNotMatch(
    pageSource,
    /setTracksState\(previousState => \(\{\s*\.\.\.previousState,\s*isLoading:\s*true,\s*\.\.\.\(append[\s\S]*items:\s*\[\],\s*total:\s*0,\s*offset:\s*0,/s
  )
  assert.doesNotMatch(
    pageSource,
    /setAlbumsState\(previousState => \(\{\s*\.\.\.previousState,\s*items:\s*\[\],\s*total:\s*0,\s*offset:\s*0,\s*isLoading:\s*true/s
  )
  assert.doesNotMatch(
    pageSource,
    /setArtistsState\(previousState => \(\{\s*\.\.\.previousState,\s*items:\s*\[\],\s*total:\s*0,\s*offset:\s*0,\s*isLoading:\s*true/s
  )
  assert.doesNotMatch(
    pageSource,
    /setPlaylistsState\(previousState => \(\{\s*\.\.\.previousState,\s*items:\s*\[\],\s*total:\s*0,\s*offset:\s*0,\s*isLoading:\s*true/s
  )
  assert.doesNotMatch(
    pageSource,
    /\[keyword,\s*songScope,\s*tracksState\.items\.length,\s*tracksState\.isLoading,\s*tracksState\.limit,\s*tracksState\.total\]/
  )
})

test('local library page keeps playlist cards but no longer owns playlist detail route state', () => {
  assert.match(pageSource, /LocalLibraryPlaylistCard/)
  assert.match(pageSource, /onCreatePlaylist=\{openCreatePlaylistDialog\}/)
  assert.match(
    pageSource,
    /navigate\(`\/local-library\/playlists\/\$\{playlist\.id\}`\)/
  )
  assert.doesNotMatch(pageSource, /useParams<\{ playlistId\?: string \}>/)
  assert.doesNotMatch(pageSource, /playlistDetail/)
  assert.doesNotMatch(pageSource, /handleBackToPlaylistList/)
  assert.doesNotMatch(pageSource, /localLibraryApi\.getPlaylistDetail\(/)
  assert.doesNotMatch(pageSource, />\s*新建歌单\s*</)
})
