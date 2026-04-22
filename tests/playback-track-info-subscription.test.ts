import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const playbackControlSource = readFileSync(
  new URL(
    '../src/renderer/components/PlaybackControl/index.tsx',
    import.meta.url
  ),
  'utf8'
)

const playbackTrackInfoSource = readFileSync(
  new URL(
    '../src/renderer/components/PlaybackControl/PlaybackTrackInfo.tsx',
    import.meta.url
  ),
  'utf8'
)

const useCurrentTrackLikeSource = readFileSync(
  new URL(
    '../src/renderer/components/PlaybackControl/useCurrentTrackLike.ts',
    import.meta.url
  ),
  'utf8'
)

test('playback control and track info avoid broad currentTrack subscriptions', () => {
  assert.match(
    playbackControlSource,
    /const\s+hasTrack\s*=\s*usePlaybackStore\(state\s*=>\s*Boolean\(state\.currentTrack\)\)/
  )
  assert.doesNotMatch(
    playbackControlSource,
    /const\s+track\s*=\s*usePlaybackStore\(state\s*=>\s*state\.currentTrack\)/
  )
  assert.match(
    playbackControlSource,
    /<PlaybackTrackInfo hasTrack=\{hasTrack\} \/>/
  )

  assert.match(
    playbackTrackInfoSource,
    /const\s+trackId\s*=\s*usePlaybackStore\(state\s*=>\s*state\.currentTrack\?\.id\s*\?\?\s*null\)/
  )
  assert.match(
    playbackTrackInfoSource,
    /const\s+trackName\s*=\s*usePlaybackStore\([\s\S]*state\.currentTrack\?\.name\s*\?\?\s*DEFAULT_PLAYBACK_CONTROL_TRACK\.name[\s\S]*\)/
  )
  assert.match(
    playbackTrackInfoSource,
    /const\s+trackArtistName\s*=\s*usePlaybackStore\([\s\S]*state\.currentTrack\?\.artistNames\s*\?\?\s*DEFAULT_PLAYBACK_CONTROL_TRACK\.artistName[\s\S]*\)/
  )
  assert.match(
    playbackTrackInfoSource,
    /const\s+trackCoverUrl\s*=\s*usePlaybackStore\([\s\S]*state\.currentTrack\?\.coverUrl\s*\?\?\s*DEFAULT_PLAYBACK_CONTROL_TRACK\.coverUrl[\s\S]*\)/
  )
  assert.match(playbackTrackInfoSource, /useCurrentTrackLike\(trackId\)/)
  assert.doesNotMatch(
    playbackTrackInfoSource,
    /const\s+track\s*=\s*usePlaybackStore\(state\s*=>\s*state\.currentTrack\)/
  )

  assert.match(
    useCurrentTrackLikeSource,
    /export function useCurrentTrackLike\(trackId: number \| null\)/
  )
  assert.doesNotMatch(useCurrentTrackLikeSource, /PlaybackTrack/)
})
