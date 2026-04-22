import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const trackListSource = readFileSync(
  new URL('../src/renderer/components/TrackList/index.tsx', import.meta.url),
  'utf8'
)
const libraryCloudPanelSource = readFileSync(
  new URL(
    '../src/renderer/pages/Library/components/LibraryCloudPanel.tsx',
    import.meta.url
  ),
  'utf8'
)
const likedSongsPanelSource = readFileSync(
  new URL(
    '../src/renderer/pages/LikedSongs/components/LikedSongsTrackPanel.tsx',
    import.meta.url
  ),
  'utf8'
)
const artistSongsPageSource = readFileSync(
  new URL('../src/renderer/pages/Artists/Songs/index.tsx', import.meta.url),
  'utf8'
)

test('TrackList uses react-virtuoso as the shared virtualization boundary', () => {
  assert.match(trackListSource, /from\s+['"]react-virtuoso['"]/)
  assert.match(trackListSource, /\bVirtuoso\b/)
})

test('TrackList can sync an active playback queue with paginated source growth', () => {
  assert.match(trackListSource, /syncQueueFromSource/)
  assert.match(trackListSource, /playbackQueueKey/)
  assert.match(trackListSource, /useEffect/)
  assert.match(artistSongsPageSource, /playbackQueueKey=/)
})

test('infinite-loading TrackList pages no longer render external sentinel refs', () => {
  assert.doesNotMatch(libraryCloudPanelSource, /\bsentinelRef\b/)
  assert.doesNotMatch(likedSongsPanelSource, /\bsentinelRef\b/)
  assert.doesNotMatch(artistSongsPageSource, /\bsentinelRef\b/)
})
