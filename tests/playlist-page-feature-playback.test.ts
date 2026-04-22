import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const pageSource = readFileSync(
  new URL('../src/renderer/pages/PlayList/index.tsx', import.meta.url),
  'utf8'
)

test('PlayList feature cards wire play actions through playlist track playback', () => {
  assert.match(pageSource, /getPlaylistTracks/)
  assert.match(pageSource, /playQueueFromIndex/)
  assert.match(pageSource, /normalizePlaylistPlaybackQueue/)
  assert.match(pageSource, /buildPlaylistPlaybackTracksRequest/)
  assert.match(pageSource, /onPlay=\{handlePlayFeaturePlaylist\}/)
})
