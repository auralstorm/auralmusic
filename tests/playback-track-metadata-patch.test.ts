import assert from 'node:assert/strict'
import test from 'node:test'

import { usePlaybackStore } from '../src/renderer/stores/playback-store.ts'

test('patchTrackMetadata updates the active track and queue item without resetting playback', () => {
  usePlaybackStore.getState().resetPlayback()
  usePlaybackStore.getState().playQueueFromIndex(
    [
      {
        id: 1,
        name: 'Track 1',
        artistNames: 'Artist 1',
        albumName: 'Album 1',
        coverUrl: '',
        duration: 180000,
        sourceUrl:
          'auralmusic-media://local-file?path=F%3A%5Cdownloads%5Ctrack-1.mp3',
      },
    ],
    0,
    'local-library:all'
  )

  usePlaybackStore.getState().patchTrackMetadata(1, {
    coverUrl:
      'auralmusic-media://local-file?path=F%3A%5Cdownloads%5Ctrack-1-cover.jpg',
    lyricText: '[00:01.00]patched lyric',
  })

  const state = usePlaybackStore.getState()
  assert.equal(
    state.currentTrack?.coverUrl,
    'auralmusic-media://local-file?path=F%3A%5Cdownloads%5Ctrack-1-cover.jpg'
  )
  assert.equal(state.currentTrack?.lyricText, '[00:01.00]patched lyric')
  assert.equal(
    state.queue[0]?.coverUrl,
    'auralmusic-media://local-file?path=F%3A%5Cdownloads%5Ctrack-1-cover.jpg'
  )
  assert.equal(state.queue[0]?.lyricText, '[00:01.00]patched lyric')
  assert.equal(state.status, 'loading')
  assert.equal(state.queueSourceKey, 'local-library:all')
})
