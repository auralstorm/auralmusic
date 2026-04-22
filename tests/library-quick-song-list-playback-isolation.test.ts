import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const libraryQuickSongListSource = readFileSync(
  new URL(
    '../src/renderer/pages/Library/components/LibraryQuickSongList.tsx',
    import.meta.url
  ),
  'utf8'
)

test('library quick song list delegates playback subscriptions to per-item playback rows', () => {
  assert.match(
    libraryQuickSongListSource,
    /import\s+TrackListPlaybackItem\s+from\s+'@\/components\/TrackList\/TrackListPlaybackItem'/
  )
  assert.doesNotMatch(
    libraryQuickSongListSource,
    /const\s+currentTrackId\s*=\s*usePlaybackStore\(state\s*=>\s*state\.currentTrack\?\.id\)/
  )
  assert.doesNotMatch(
    libraryQuickSongListSource,
    /const\s+playbackStatus\s*=\s*usePlaybackStore\(state\s*=>\s*state\.status\)/
  )
  assert.match(
    libraryQuickSongListSource,
    /<TrackListPlaybackItem[\s\S]*type='quick'[\s\S]*playbackQueue=\{playbackQueue\}/
  )
})
