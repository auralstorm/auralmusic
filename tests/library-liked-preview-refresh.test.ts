import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const librarySource = readFileSync(
  new URL('../src/renderer/pages/Library/index.tsx', import.meta.url),
  'utf8'
)
const libraryHeroSource = readFileSync(
  new URL(
    '../src/renderer/pages/Library/components/LibraryHero.tsx',
    import.meta.url
  ),
  'utf8'
)
const libraryQuickSongListSource = readFileSync(
  new URL(
    '../src/renderer/pages/Library/components/LibraryQuickSongList.tsx',
    import.meta.url
  ),
  'utf8'
)
const libraryComponentTypesSource = readFileSync(
  new URL(
    '../src/renderer/pages/Library/types/library-component.types.ts',
    import.meta.url
  ),
  'utf8'
)

test('library liked songs preview refreshes after a like state change succeeds', () => {
  assert.match(
    librarySource,
    /const\s+resolveLikedSongsPreview\s*=\s*useCallback\(/
  )
  assert.match(
    librarySource,
    /const\s+\[likedSongsPreviewRefreshing,\s*setLikedSongsPreviewRefreshing\]\s*=\s*useState\(false\)/
  )
  assert.match(
    librarySource,
    /<LibraryHero[\s\S]*onSongLikeChangeSuccess=\{handleRefreshLikedSongsPreview\}[\s\S]*\/>/
  )
  assert.match(
    librarySource,
    /<LibraryHero[\s\S]*likedSongsPreviewRefreshing=\{likedSongsPreviewRefreshing\}[\s\S]*\/>/
  )
  assert.match(
    librarySource,
    /getPlaylistTrackAll\(\s*likedPlaylist\.id,\s*9,\s*0,\s*bustCache\s*\?\s*Date\.now\(\)\s*:\s*undefined\s*\)/
  )
  assert.match(
    libraryComponentTypesSource,
    /onSongLikeChangeSuccess:\s*\(songId:\s*number,\s*nextLiked:\s*boolean\)\s*=>\s*void/
  )
  assert.match(
    libraryComponentTypesSource,
    /likedSongsPreviewRefreshing\?:\s*boolean/
  )
  assert.match(
    libraryHeroSource,
    /<LibraryQuickSongList[\s\S]*onSongLikeChangeSuccess=\{onSongLikeChangeSuccess\}[\s\S]*\/>/
  )
  assert.match(
    libraryHeroSource,
    /<LibraryQuickSongList[\s\S]*refreshing=\{likedSongsPreviewRefreshing\}[\s\S]*\/>/
  )
  assert.match(
    libraryQuickSongListSource,
    /import\s+\{\s*Spinner\s*\}\s+from\s+'@\/components\/ui\/spinner'/
  )
  assert.match(libraryComponentTypesSource, /refreshing\?:\s*boolean/)
  assert.match(
    libraryQuickSongListSource,
    /onLikeChangeSuccess=\{onSongLikeChangeSuccess\}/
  )
  assert.match(libraryQuickSongListSource, /<Spinner/)
  assert.match(
    libraryQuickSongListSource,
    /refreshing \? 'pointer-events-none opacity-50' : ''/
  )
  assert.doesNotMatch(librarySource, /fetchLikedSongs/)
  assert.doesNotMatch(librarySource, /buildLibraryLikedSongsPreview/)
  assert.doesNotMatch(libraryQuickSongListSource, /hiddenSongIds/)
})
