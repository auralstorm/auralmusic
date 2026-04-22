import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const trackListSource = readFileSync(
  new URL('../src/renderer/components/TrackList/index.tsx', import.meta.url),
  'utf8'
)
const trackListPlaybackItemSourcePath = new URL(
  '../src/renderer/components/TrackList/TrackListPlaybackItem.tsx',
  import.meta.url
)

test('TrackList isolates playback subscriptions to per-row playback items', () => {
  assert.equal(existsSync(trackListPlaybackItemSourcePath), true)

  assert.doesNotMatch(
    trackListSource,
    /const\s+currentTrackId\s*=\s*usePlaybackStore\(state\s*=>\s*state\.currentTrack\?\.id\)/
  )
  assert.doesNotMatch(
    trackListSource,
    /const\s+playbackStatus\s*=\s*usePlaybackStore\(state\s*=>\s*state\.status\)/
  )
  assert.match(
    trackListSource,
    /import\s+TrackListPlaybackItem\s+from\s+'\.\/TrackListPlaybackItem'/
  )
  assert.match(trackListSource, /<TrackListPlaybackItem/)

  const playbackItemSource = readFileSync(
    trackListPlaybackItemSourcePath,
    'utf8'
  )
  assert.match(
    playbackItemSource,
    /const\s+isActive\s*=\s*usePlaybackStore\(state\s*=>\s*state\.currentTrack\?\.id\s*===\s*item\.id\)/
  )
  assert.match(playbackItemSource, /const\s+isPlaying\s*=\s*usePlaybackStore\(/)
  assert.match(
    playbackItemSource,
    /export\s+default\s+memo\(TrackListPlaybackItem\)/
  )
})
