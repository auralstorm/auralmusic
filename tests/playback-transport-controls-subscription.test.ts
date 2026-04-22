import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const playbackTransportControlsSource = readFileSync(
  new URL(
    '../src/renderer/components/PlaybackControl/PlaybackTransportControls.tsx',
    import.meta.url
  ),
  'utf8'
)

test('playback transport controls subscribe only to minimal playback booleans', () => {
  assert.match(
    playbackTransportControlsSource,
    /const\s+hasTrack\s*=\s*usePlaybackStore\(state\s*=>\s*Boolean\(state\.currentTrack\)\)/
  )
  assert.match(
    playbackTransportControlsSource,
    /const\s+isPlaying\s*=\s*usePlaybackStore\(\s*state\s*=>\s*state\.status\s*===\s*'playing'\s*\|\|\s*state\.status\s*===\s*'loading'\s*\)/
  )
  assert.doesNotMatch(
    playbackTransportControlsSource,
    /const\s+track\s*=\s*usePlaybackStore\(state\s*=>\s*state\.currentTrack\)/
  )
  assert.doesNotMatch(
    playbackTransportControlsSource,
    /getPlaybackTransportState/
  )
})
