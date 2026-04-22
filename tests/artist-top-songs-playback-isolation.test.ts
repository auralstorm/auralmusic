import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const artistTopSongsSource = readFileSync(
  new URL(
    '../src/renderer/pages/Artists/Detail/components/ArtistTopSongs.tsx',
    import.meta.url
  ),
  'utf8'
)

test('artist top songs delegates playback subscriptions to per-item playback rows', () => {
  assert.match(
    artistTopSongsSource,
    /import\s+TrackListPlaybackItem\s+from\s+'@\/components\/TrackList\/TrackListPlaybackItem'/
  )
  assert.doesNotMatch(
    artistTopSongsSource,
    /const\s+currentTrackId\s*=\s*usePlaybackStore\(state\s*=>\s*state\.currentTrack\?\.id\)/
  )
  assert.doesNotMatch(
    artistTopSongsSource,
    /const\s+playbackStatus\s*=\s*usePlaybackStore\(state\s*=>\s*state\.status\)/
  )
  assert.match(
    artistTopSongsSource,
    /<TrackListPlaybackItem[\s\S]*type='hot'[\s\S]*playbackQueue=\{playbackQueue\}/
  )
})
