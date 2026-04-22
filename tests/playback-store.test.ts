import test from 'node:test'
import assert from 'node:assert/strict'

import { usePlaybackStore } from '../src/renderer/stores/playback-store.ts'
import type { PlaybackTrack } from '../src/shared/playback.ts'

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
  {
    id: 3,
    name: 'Track 3',
    artistNames: 'Artist 3',
    albumName: 'Album 3',
    coverUrl: 'cover-3',
    duration: 210000,
  },
]

test('playQueueFromIndex sets queue and starts loading selected track', () => {
  usePlaybackStore.getState().resetPlayback()

  usePlaybackStore.getState().playQueueFromIndex(tracks, 1)

  const state = usePlaybackStore.getState()
  assert.equal(state.queue.length, 3)
  assert.equal(state.currentIndex, 1)
  assert.equal(state.currentTrack?.id, 2)
  assert.equal(state.status, 'loading')
  assert.equal(state.error, '')
  assert.equal(state.requestId, 1)
})

test('appendToQueue appends tracks without interrupting current playback', () => {
  usePlaybackStore.getState().resetPlayback()
  usePlaybackStore.getState().playQueueFromIndex(tracks, 1)

  usePlaybackStore.getState().appendToQueue([
    {
      id: 4,
      name: 'Track 4',
      artistNames: 'Artist 4',
      albumName: 'Album 4',
      coverUrl: 'cover-4',
      duration: 220000,
    },
  ])

  const state = usePlaybackStore.getState()
  assert.equal(state.queue.length, 4)
  assert.equal(state.currentIndex, 1)
  assert.equal(state.currentTrack?.id, 2)
  assert.equal(state.status, 'loading')
  assert.equal(state.requestId, 1)
  assert.equal(state.queue[3]?.id, 4)
})

test('appendToQueue skips tracks that already exist in the playback queue', () => {
  usePlaybackStore.getState().resetPlayback()
  usePlaybackStore.getState().playQueueFromIndex(tracks, 1)

  usePlaybackStore.getState().appendToQueue([
    tracks[1],
    {
      id: 4,
      name: 'Track 4',
      artistNames: 'Artist 4',
      albumName: 'Album 4',
      coverUrl: 'cover-4',
      duration: 220000,
    },
    tracks[1],
  ])

  const state = usePlaybackStore.getState()
  assert.deepEqual(
    state.queue.map(track => track.id),
    [1, 2, 3, 4]
  )
  assert.equal(state.currentIndex, 1)
  assert.equal(state.currentTrack?.id, 2)
})

test('syncQueueFromSource extends the active playback queue for the same list source', () => {
  usePlaybackStore.getState().resetPlayback()
  usePlaybackStore
    .getState()
    .playQueueFromIndex(tracks, 1, 'artist-songs:6452:hot')
  const currentTrackBeforeSync = usePlaybackStore.getState().currentTrack

  usePlaybackStore.getState().syncQueueFromSource('artist-songs:6452:hot', [
    ...tracks,
    {
      id: 4,
      name: 'Track 4',
      artistNames: 'Artist 4',
      albumName: 'Album 4',
      coverUrl: 'cover-4',
      duration: 220000,
    },
  ])

  const state = usePlaybackStore.getState()
  assert.equal(state.currentTrack, currentTrackBeforeSync)
  assert.deepEqual(
    state.queue.map(track => track.id),
    [1, 2, 3, 4]
  )
  assert.equal(state.currentIndex, 1)
  assert.equal(state.currentTrack?.id, 2)
  assert.equal(state.status, 'loading')
  assert.equal(state.requestId, 1)
})

test('playQueueFromIndex preserves local source urls on playback tracks', () => {
  usePlaybackStore.getState().resetPlayback()

  usePlaybackStore.getState().playQueueFromIndex(
    [
      {
        id: 10,
        name: 'Local Track',
        artistNames: 'Local Artist',
        albumName: 'Downloads',
        coverUrl: 'cover-local',
        duration: 0,
        sourceUrl: 'file:///F:/downloads/local-track.mp3',
      },
    ],
    0
  )

  const state = usePlaybackStore.getState()
  assert.equal(
    state.currentTrack?.sourceUrl,
    'file:///F:/downloads/local-track.mp3'
  )
})

test('playQueueFromIndex re-enables autoplay after restoring a paused session', () => {
  usePlaybackStore.getState().resetPlayback()
  usePlaybackStore.getState().restoreSession({
    queue: tracks,
    currentIndex: 1,
    progress: 42000,
    duration: 200000,
    playbackMode: 'repeat-all',
  })

  usePlaybackStore.getState().playQueueFromIndex(tracks, 0)

  const state = usePlaybackStore.getState()
  assert.equal(state.currentTrack?.id, 1)
  assert.equal(state.status, 'loading')
  assert.equal(state.shouldAutoPlayOnLoad, true)
})

test('appendToQueue seeds the queue without auto-playing when idle', () => {
  usePlaybackStore.getState().resetPlayback()

  usePlaybackStore.getState().appendToQueue([
    tracks[0],
    {
      id: 4,
      name: 'Track 4',
      artistNames: 'Artist 4',
      albumName: 'Album 4',
      coverUrl: 'cover-4',
      duration: 220000,
    },
  ])

  const state = usePlaybackStore.getState()
  assert.equal(state.queue.length, 2)
  assert.equal(state.currentIndex, -1)
  assert.equal(state.currentTrack, null)
  assert.equal(state.status, 'idle')
  assert.equal(state.requestId, 0)
})

test('playNext and playPrevious loop queue boundaries in repeat-all mode', () => {
  usePlaybackStore.getState().resetPlayback()
  usePlaybackStore.getState().playQueueFromIndex(tracks, 0)

  assert.equal(usePlaybackStore.getState().playNext(), true)
  assert.equal(usePlaybackStore.getState().currentTrack?.id, 2)

  assert.equal(usePlaybackStore.getState().playNext(), true)
  assert.equal(usePlaybackStore.getState().currentTrack?.id, 3)

  assert.equal(usePlaybackStore.getState().playNext(), true)
  assert.equal(usePlaybackStore.getState().currentTrack?.id, 1)

  assert.equal(usePlaybackStore.getState().playPrevious(), true)
  assert.equal(usePlaybackStore.getState().currentTrack?.id, 3)

  assert.equal(usePlaybackStore.getState().playPrevious(), true)
  assert.equal(usePlaybackStore.getState().currentTrack?.id, 2)
})

test('markPlaybackError keeps queue and current track', () => {
  usePlaybackStore.getState().resetPlayback()
  usePlaybackStore.getState().playQueueFromIndex(tracks, 0)

  usePlaybackStore.getState().markPlaybackError('temporarily unavailable')

  const state = usePlaybackStore.getState()
  assert.equal(state.status, 'error')
  assert.equal(state.error, 'temporarily unavailable')
  assert.equal(state.queue.length, 3)
  assert.equal(state.currentTrack?.id, 1)
})

test('toggleMute restores the last audible volume', () => {
  usePlaybackStore.getState().resetPlayback()

  usePlaybackStore.getState().setVolume(35)
  usePlaybackStore.getState().toggleMute()

  assert.equal(usePlaybackStore.getState().volume, 0)

  usePlaybackStore.getState().toggleMute()

  assert.equal(usePlaybackStore.getState().volume, 35)
})

test('player scene open state can be toggled without resetting playback', () => {
  usePlaybackStore.getState().resetPlayback()
  usePlaybackStore.getState().playQueueFromIndex(tracks, 0)

  usePlaybackStore.getState().openPlayerScene()

  assert.equal(usePlaybackStore.getState().isPlayerSceneOpen, true)
  assert.equal(usePlaybackStore.getState().currentTrack?.id, 1)

  usePlaybackStore.getState().closePlayerScene()

  assert.equal(usePlaybackStore.getState().isPlayerSceneOpen, false)
  assert.equal(usePlaybackStore.getState().currentTrack?.id, 1)
})

test('setPlayerSceneOpen syncs controlled drawer open state', () => {
  usePlaybackStore.getState().resetPlayback()

  usePlaybackStore.getState().setPlayerSceneOpen(true)

  assert.equal(usePlaybackStore.getState().isPlayerSceneOpen, true)

  usePlaybackStore.getState().setPlayerSceneOpen(false)

  assert.equal(usePlaybackStore.getState().isPlayerSceneOpen, false)
})

test('setPlayerSceneFullscreen syncs fullscreen button state', () => {
  usePlaybackStore.getState().resetPlayback()

  usePlaybackStore.getState().setPlayerSceneFullscreen(true)

  assert.equal(usePlaybackStore.getState().isPlayerSceneFullscreen, true)

  usePlaybackStore.getState().setPlayerSceneFullscreen(false)

  assert.equal(usePlaybackStore.getState().isPlayerSceneFullscreen, false)
})

test('seekTo stores a clamped seek request in milliseconds', () => {
  usePlaybackStore.getState().resetPlayback()

  usePlaybackStore.getState().seekTo(60000)

  assert.equal(usePlaybackStore.getState().seekPosition, 60000)
  assert.equal(usePlaybackStore.getState().seekRequestId, 1)

  usePlaybackStore.getState().seekTo(-1)

  assert.equal(usePlaybackStore.getState().seekPosition, 0)
  assert.equal(usePlaybackStore.getState().seekRequestId, 2)
})

test('setPlaybackMode builds shuffle state without changing the visible queue', () => {
  usePlaybackStore.getState().resetPlayback()
  usePlaybackStore.getState().playQueueFromIndex(tracks, 1)

  const queueBeforeShuffle = usePlaybackStore.getState().queue

  usePlaybackStore.getState().setPlaybackMode('shuffle')

  const state = usePlaybackStore.getState()
  assert.equal(state.playbackMode, 'shuffle')
  assert.equal(state.queue, queueBeforeShuffle)
  assert.equal(state.shuffleOrder[0], 1)
  assert.deepEqual(
    [...state.shuffleOrder].sort((a, b) => a - b),
    [0, 1, 2]
  )
  assert.equal(state.shuffleCursor, 0)
})

test('shuffle mode advances through the internal shuffle order', () => {
  usePlaybackStore.getState().resetPlayback()
  usePlaybackStore.getState().playQueueFromIndex(tracks, 0)
  usePlaybackStore.setState({
    playbackMode: 'shuffle',
    shuffleOrder: [0, 2, 1],
    shuffleCursor: 0,
  })

  assert.equal(usePlaybackStore.getState().playNext(), true)

  const state = usePlaybackStore.getState()
  assert.equal(state.currentTrack?.id, 3)
  assert.equal(state.shuffleCursor, 1)
  assert.deepEqual(state.shuffleOrder, [0, 2, 1])
})

test('repeat-one repeats on automatic advance and skips on manual advance', () => {
  usePlaybackStore.getState().resetPlayback()
  usePlaybackStore.getState().playQueueFromIndex(tracks, 0)
  usePlaybackStore.getState().setPlaybackMode('repeat-one')

  assert.equal(usePlaybackStore.getState().playNext('auto'), true)
  assert.equal(usePlaybackStore.getState().currentTrack?.id, 1)

  assert.equal(usePlaybackStore.getState().playNext('manual'), true)
  assert.equal(usePlaybackStore.getState().currentTrack?.id, 2)
})

test('resetPlayback restores default playback mode and shuffle state', () => {
  usePlaybackStore.getState().resetPlayback()
  usePlaybackStore.getState().playQueueFromIndex(tracks, 0)
  usePlaybackStore.setState({
    playbackMode: 'shuffle',
    shuffleOrder: [0, 2, 1],
    shuffleCursor: 2,
  })

  usePlaybackStore.getState().resetPlayback()

  const state = usePlaybackStore.getState()
  assert.equal(state.playbackMode, 'repeat-all')
  assert.deepEqual(state.shuffleOrder, [])
  assert.equal(state.shuffleCursor, 0)
})

test('restoreSession rehydrates the queue and resumes at the previous progress in paused state', () => {
  usePlaybackStore.getState().resetPlayback()

  usePlaybackStore.getState().restoreSession({
    queue: tracks,
    currentIndex: 1,
    progress: 42000,
    duration: 200000,
    playbackMode: 'shuffle',
  })

  const state = usePlaybackStore.getState()
  assert.equal(state.currentTrack?.id, 2)
  assert.equal(state.currentIndex, 1)
  assert.equal(state.status, 'paused')
  assert.equal(state.progress, 42000)
  assert.equal(state.duration, 200000)
  assert.equal(state.playbackMode, 'shuffle')
  assert.equal(state.pendingRestoreProgress, 42000)
  assert.equal(state.shouldAutoPlayOnLoad, false)
  assert.equal(state.requestId, 1)
})
