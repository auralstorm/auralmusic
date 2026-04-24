import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const pageSource = readFileSync(
  new URL('../src/renderer/pages/LocalLibrary/index.tsx', import.meta.url),
  'utf8'
)

test('local library page reads overview and entity queries instead of snapshot filtering', () => {
  assert.match(pageSource, /localLibraryApi\.getOverview\(\)/)
  assert.match(pageSource, /localLibraryApi\.queryTracks\(/)
  assert.match(pageSource, /localLibraryApi\.queryAlbums\(/)
  assert.match(pageSource, /localLibraryApi\.queryArtists\(/)

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
  assert.match(pageSource, /const tracksStateRef = useRef\(tracksState\)/)
  assert.match(pageSource, /tracksStateRef\.current = tracksState/)
  assert.match(pageSource, /const currentTracksState = tracksStateRef\.current/)
  assert.doesNotMatch(
    pageSource,
    /\[keyword,\s*songScope,\s*tracksState\.items\.length,\s*tracksState\.isLoading,\s*tracksState\.limit,\s*tracksState\.total\]/
  )
})
