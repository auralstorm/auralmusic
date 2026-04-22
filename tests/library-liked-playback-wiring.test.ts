import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const librarySource = readFileSync(
  new URL('../src/renderer/pages/Library/index.tsx', import.meta.url),
  'utf8'
)
const libraryDomainTypesSource = readFileSync(
  new URL(
    '../src/renderer/pages/Library/types/library-domain.types.ts',
    import.meta.url
  ),
  'utf8'
)

test('library liked songs hero can play the full liked playlist through queue source playback', () => {
  assert.match(
    libraryDomainTypesSource,
    /likedPlaylistId:\s*number\s*\|\s*null/
  )
  assert.match(
    librarySource,
    /usePlaybackStore\(state => state\.playQueueFromIndex\)/
  )
  assert.match(librarySource, /createLikedSongsQueueSourceKey/)
  assert.match(
    librarySource,
    /const\s+handlePlayLikedSongs\s*=\s*useCallback\(/
  )
  assert.match(librarySource, /getPlaylistTrackAll\(/)
  assert.match(librarySource, /ensureQueueSourceHydration/)
  assert.match(librarySource, /const\s+previewLimit\s*=\s*100/)
  assert.match(librarySource, /data\.likedPlaylistId/)
  assert.match(
    librarySource,
    /getPlaylistTrackAll\(\s*data\.likedPlaylistId,\s*previewLimit,\s*0,\s*timestamp\s*\)/
  )
  assert.doesNotMatch(
    librarySource,
    /for\s*\(\s*let offset = 0;[\s\S]*offset \+= limit/
  )
  assert.match(
    librarySource,
    /playQueueFromIndex\(\s*queue,\s*0,\s*createLikedSongsQueueSourceKey\(data\.likedPlaylistId\)\s*\)/
  )
  assert.match(
    librarySource,
    /ensureQueueSourceHydration\(\{\s*sourceKey:\s*createLikedSongsQueueSourceKey\(data\.likedPlaylistId\),\s*seedQueue:\s*queue,\s*startOffset:\s*queue\.length/
  )
  assert.match(
    librarySource,
    /<LibraryHero[\s\S]*onPlayLikedSongs=\{handlePlayLikedSongs\}[\s\S]*\/>/
  )
})
