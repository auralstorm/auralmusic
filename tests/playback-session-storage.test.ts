import test from 'node:test'
import assert from 'node:assert/strict'
import type { PlaybackTrack } from '../src/shared/playback.ts'
import {
  createPlaybackSessionSnapshot,
  normalizePlaybackSessionSnapshot,
  withPlaybackSessionTiming,
} from '../src/renderer/stores/playback-session-storage.ts'

const tracks: PlaybackTrack[] = [
  {
    id: 1,
    name: 'Track 1',
    artistNames: 'Artist 1',
    albumName: 'Album 1',
    coverUrl: 'cover-1',
    duration: 180000,
  },
  {
    id: 2,
    name: 'Track 2',
    artistNames: 'Artist 2',
    albumName: 'Album 2',
    coverUrl: 'cover-2',
    duration: 200000,
  },
]

test('createPlaybackSessionSnapshot keeps the minimum session payload for restore', () => {
  assert.deepEqual(
    createPlaybackSessionSnapshot({
      queue: tracks,
      currentIndex: 1,
      progress: 65432,
      duration: 200000,
      playbackMode: 'shuffle',
    }),
    {
      queue: tracks.map(track => ({
        ...track,
        sourceUrl: undefined,
      })),
      currentIndex: 1,
      progress: 65432,
      duration: 200000,
      playbackMode: 'shuffle',
    }
  )
})

test('normalizePlaybackSessionSnapshot rejects invalid payloads and clamps numeric fields', () => {
  assert.equal(normalizePlaybackSessionSnapshot(null), null)
  assert.equal(
    normalizePlaybackSessionSnapshot({
      queue: [],
      currentIndex: 0,
      progress: 1,
      duration: 1,
      playbackMode: 'repeat-all',
    }),
    null
  )

  assert.deepEqual(
    normalizePlaybackSessionSnapshot({
      queue: tracks,
      currentIndex: 9,
      progress: -100,
      duration: 200000,
      playbackMode: 'invalid',
    }),
    {
      queue: tracks.map(track => ({
        ...track,
        sourceUrl: undefined,
      })),
      currentIndex: 1,
      progress: 0,
      duration: 200000,
      playbackMode: 'repeat-all',
    }
  )
})

test('withPlaybackSessionTiming updates progress and duration without recreating the queue', () => {
  const snapshot = createPlaybackSessionSnapshot({
    queue: tracks,
    currentIndex: 1,
    progress: 65432,
    duration: 200000,
    playbackMode: 'shuffle',
  })

  assert.ok(snapshot)

  const nextSnapshot = withPlaybackSessionTiming(snapshot, {
    progress: 77777.8,
    duration: 210999.3,
  })

  assert.equal(nextSnapshot.queue, snapshot.queue)
  assert.equal(nextSnapshot.currentIndex, snapshot.currentIndex)
  assert.equal(nextSnapshot.playbackMode, snapshot.playbackMode)
  assert.equal(nextSnapshot.progress, 77777)
  assert.equal(nextSnapshot.duration, 210999)
})
